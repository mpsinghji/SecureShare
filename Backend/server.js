import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { query } from './src/db/db.js';
import { authenticateToken } from './src/middleware/auth.js';
import { uploadFile } from './src/services/storage.js';

let helmet, rateLimit, OAuth2Client;
try {
  helmet = (await import('helmet')).default;
  rateLimit = (await import('express-rate-limit')).default;
  const { OAuth2Client: Client } = await import('google-auth-library');
  OAuth2Client = Client;
} catch (e) {
  console.log("Optional dependencies not found. Run npm install.");
}

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Keep file in memory for Supabase upload

// Middleware
if (helmet) app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Rate Limiting for Auth
const authLimiter = rateLimit ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 auth requests per windowMs
  message: { error: 'Too many attempts, please try again later.' }
}) : (req, res, next) => next();

// --- Authentication Routes ---

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const otpCode = generateOTP();

    const newUser = await query(`
      INSERT INTO users (email, password_hash, role, is_verified, otp_code) 
      VALUES ($1, $2, 'user', false, $3) 
      RETURNING id, email, role, is_verified
    `, [email, hash, otpCode]);

    const user = newUser.rows[0];
    
    // Simulate sending an email
    console.log(`\n=========================================`);
    console.log(`[MOCK EMAIL] To: ${email}`);
    console.log(`[MOCK EMAIL] Subject: Your SecureShare OTP`);
    console.log(`[MOCK EMAIL] Body: Your verification code is: ${otpCode}`);
    console.log(`=========================================\n`);

    res.status(201).json({ message: 'OTP sent to email', email: user.email });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-otp', authLimiter, async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = result.rows[0];
    if (user.is_verified) return res.status(400).json({ error: 'User already verified' });
    
    if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    
    await query('UPDATE users SET is_verified = true, otp_code = NULL WHERE id = $1', [user.id]);
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, is_verified: true } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Check if user is verified
    if (!user.is_verified) {
      // Regenerate OTP
      const otpCode = generateOTP();
      await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, user.id]);
      
      console.log(`\n=========================================`);
      console.log(`[MOCK EMAIL] To: ${user.email}`);
      console.log(`[MOCK EMAIL] Subject: Your SecureShare OTP (Resent)`);
      console.log(`[MOCK EMAIL] Body: Your verification code is: ${otpCode}`);
      console.log(`=========================================\n`);
      
      return res.status(403).json({ error: 'Please verify your email via OTP', requiresVerification: true, email: user.email });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/google', authLimiter, async (req, res, next) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    if (!OAuth2Client) return res.status(500).json({ error: 'Google Auth not installed on server' });
    
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    if (!email) return res.status(400).json({ error: 'Google account missing email' });

    // Check if user exists
    let result = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (result.rows.length === 0) {
      // Auto-register verified user
      const dummyHash = await bcrypt.hash(Math.random().toString(), 10);
      const newUser = await query(`
        INSERT INTO users (email, password_hash, role, is_verified) 
        VALUES ($1, $2, 'user', true) 
        RETURNING id, email, role, is_verified
      `, [email, dummyHash]);
      user = newUser.rows[0];
    } else {
      user = result.rows[0];
      if (!user.is_verified) {
        await query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
        user.is_verified = true;
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, is_verified: true } });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: 'Invalid Google Token' });
  }
});

// --- Protected Routes ---

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const docStats = await query(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(views) as total_views,
        SUM(prints) as total_prints
      FROM documents
    `);

    const activeLinksCount = await query(`SELECT COUNT(*) FROM documents WHERE status = 'active'`);
    const unauthorizedPrintsCount = await query(`SELECT COUNT(*) FROM activities WHERE action_type = 'print' AND status = 'unauthorized'`);

    res.json({
      activeLinks: parseInt(activeLinksCount.rows[0].count) || 0,
      totalViews: parseInt(docStats.rows[0].total_views) || 0,
      totalPrints: parseInt(docStats.rows[0].total_prints) || 0,
      unauthorizedPrints: parseInt(unauthorizedPrintsCount.rows[0].count) || 0
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard Activities
app.get('/api/dashboard/activities', authenticateToken, async (req, res) => {
  try {
    const activities = await query(`
      SELECT 
        a.id, a.action_type, a.user_email, a.location, a.ip_address, a.status, a.timestamp,
        d.name as document_name
      FROM activities a
      JOIN documents d ON a.document_id = d.id
      ORDER BY a.timestamp DESC
      LIMIT 10
    `);

    res.json(activities.rows);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Profile Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT email, role, is_verified, username, avatar_style FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { username, avatar_style } = req.body;
  try {
    await query('UPDATE users SET username = $1, avatar_style = $2 WHERE id = $3', [username, avatar_style, req.user.id]);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Documents List
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await query(`
      SELECT id, name, status, views, prints, uploaded_at, file_url
      FROM documents
      ORDER BY uploaded_at DESC
    `);

    res.json(documents.rows);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Upload Document
app.post('/api/documents', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Save metadata to DB
    const newDoc = await query(`
      INSERT INTO documents (name, status, views, prints, file_url) 
      VALUES ($1, 'active', 0, 0, $2)
      RETURNING *
    `, [req.file.originalname, uploadResult.url]);

    res.status(201).json({
      document: newDoc.rows[0],
      url: uploadResult.url
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// View Document (Log activity and return URL)
app.get('/api/documents/:id/view', authenticateToken, async (req, res) => {
  try {
    const docId = req.params.id;
    const userEmail = req.user.email;
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    // Fetch document URL
    const docQuery = await query(`SELECT * FROM documents WHERE id = $1`, [docId]);
    if (docQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const document = docQuery.rows[0];

    // Enterprise Security: Block if revoked
    if (document.status === 'revoked') {
      // Log unauthorized attempt
      await query(`
        INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
        VALUES ($1, 'view', $2, 'Unknown', $3, 'unauthorized')
      `, [docId, userEmail, ip]);
      return res.status(403).json({ error: 'Access to this document has been revoked.' });
    }

    // Log activity
    await query(`
      INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
      VALUES ($1, 'view', $2, 'Unknown', $3, 'verified')
    `, [docId, userEmail, ip]);

    // Update view count
    await query(`UPDATE documents SET views = views + 1 WHERE id = $1`, [docId]);

    res.json({
      url: document.file_url,
      document: document
    });
  } catch (error) {
    next(error);
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    // 1. Alter Schema if needed
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE'); // default true for old users
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)');
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'anonymous'");
    console.log('Database schema verified.');

    // 2. Dummy Data Cleanup for Production Setup
    const cleanupResult = await query(`
      DELETE FROM documents 
      WHERE name IN (
        'Q3 Financial Audit.pdf', 
        'Project_Ares_Manifesto.docx', 
        'Merger_Agreement_Draft_v2.pdf'
      )
    `);
    if (cleanupResult.rowCount > 0) {
      console.log(`Enterprise Cleanup: Removed ${cleanupResult.rowCount} mocked dummy records.`);
    }
  } catch (err) {
    console.error('Error during startup verification:', err);
  }
  console.log(`Server running on port ${PORT}`);
});
