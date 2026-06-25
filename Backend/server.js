import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { query } from './src/db/db.js';
import { authenticateToken } from './src/middleware/auth.js';
import { uploadFile } from './src/services/storage.js';

// Import security modules conditionally to avoid crashing if npm install isn't run yet
let helmet, rateLimit;
try {
  helmet = (await import('helmet')).default;
  rateLimit = (await import('express-rate-limit')).default;
} catch (e) {
  console.log("Helmet or express-rate-limit not found. Please run `npm install` in Backend directory.");
}

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Keep file in memory for Supabase upload

// Middleware
if (helmet) app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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

app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const existing = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const newUser = await query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ($1, $2, 'user') 
      RETURNING id, email, role
    `, [email, hash]);

    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user });
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
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
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
    res.status(500).json({ error: 'Internal Server Error' });
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
