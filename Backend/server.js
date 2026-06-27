import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { query } from './src/db/db.js';
import { authenticateToken } from './src/middleware/auth.js';
import { uploadFile, deleteFile } from './src/services/storage.js';

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
// File upload config: 50MB limit, restricted file types
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/jpg',
  'video/mp4', 'video/quicktime'
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed. Accepted: PDF, XLSX, DOCX, PNG, JPG, MP4.`), false);
    }
  }
});

// Middleware
if (helmet) {
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));
}
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

// Sanitize filename to prevent XSS
const sanitizeFilename = (name) => name.replace(/[<>"'&]/g, '_');

// Gamertag Generators
const ADJECTIVES = ['Shadow', 'Cyber', 'Neon', 'Phantom', 'Ghost', 'Crimson', 'Azure', 'Iron', 'Quantum', 'Void', 'Silent', 'Dark', 'Frost', 'Blaze', 'Storm'];
const NOUNS = ['Ninja', 'Wolf', 'Sniper', 'Dragon', 'Viper', 'Rider', 'Specter', 'Titan', 'Hunter', 'Fox', 'Hawk', 'Panther', 'Knight', 'Raven', 'Tiger'];
const AVATAR_STYLES_LIST = ['adventurer', 'bottts', 'lorelei', 'notionists', 'thumbs', 'fun-emoji', 'initials'];

const generateGamertag = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

const getRandomAvatar = () => {
  return AVATAR_STYLES_LIST[Math.floor(Math.random() * AVATAR_STYLES_LIST.length)];
};

// Password strength validation
const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      if (!userExists.rows[0].is_verified) {
        // Resend OTP for unverified user
        const otpCode = generateOTP();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await query('UPDATE users SET password_hash = $1, otp_code = $2 WHERE email = $3', [hash, otpCode, email]);
        
        console.log(`\n=========================================`);
        console.log(`[MOCK EMAIL] To: ${email}`);
        console.log(`[MOCK EMAIL] Subject: Your SecureShare OTP (Resent)`);
        console.log(`[MOCK EMAIL] Body: Your verification code is: ${otpCode}`);
        console.log(`=========================================\n`);
        return res.status(201).json({ message: 'OTP sent to email', email });
      } else {
        return res.status(400).json({ error: 'User already exists and is verified' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const otpCode = generateOTP();
    const gamertag = generateGamertag();
    const avatar = getRandomAvatar();

    const newUser = await query(`
      INSERT INTO users (email, password_hash, role, is_verified, otp_code, username, avatar_style) 
      VALUES ($1, $2, 'user', false, $3, $4, $5) 
      RETURNING id, email, role, is_verified
    `, [email, hash, otpCode, gamertag, avatar]);

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
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

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
      const gamertag = generateGamertag();
      const avatar = getRandomAvatar();
      
      const newUser = await query(`
        INSERT INTO users (email, password_hash, role, is_verified, username, avatar_style) 
        VALUES ($1, $2, 'user', true, $3, $4) 
        RETURNING id, email, role, is_verified
      `, [email, dummyHash, gamertag, avatar]);
      user = newUser.rows[0];
    } else {
      user = result.rows[0];
      if (!user.is_verified) {
        await query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
        user.is_verified = true;
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, is_verified: true } });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: 'Invalid Google Token' });
  }
});

// --- Forgot Password Routes ---
app.post('/api/auth/forgot-password', authLimiter, async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const otpCode = generateOTP();
    await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, result.rows[0].id]);
    
    console.log(`\n=========================================`);
    console.log(`[MOCK EMAIL] To: ${email}`);
    console.log(`[MOCK EMAIL] Subject: Reset Your Password`);
    console.log(`[MOCK EMAIL] Body: Your reset code is: ${otpCode}`);
    console.log(`=========================================\n`);
    
    res.json({ message: 'Reset code sent', email });
  } catch (error) { next(error); }
});

app.post('/api/auth/reset-password', authLimiter, async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = result.rows[0];
    if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid reset code' });
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    await query('UPDATE users SET password_hash = $1, otp_code = NULL, is_verified = true WHERE id = $2', [hash, user.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) { next(error); }
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
      WHERE user_email = $1
    `, [req.user.email]);

    const activeLinksCount = await query(`SELECT COUNT(*) FROM documents WHERE status = 'active' AND user_email = $1`, [req.user.email]);
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
    const isAdmin = req.user.email === 'admin@secureshare.com';
    let activities;

    if (isAdmin) {
      activities = await query(`
        SELECT 
          a.id, a.action_type, a.user_email, a.location, a.ip_address, a.status, a.timestamp,
          d.name as document_name
        FROM activities a
        LEFT JOIN documents d ON a.document_id = d.id
        ORDER BY a.timestamp DESC
        LIMIT 50
      `);
    } else {
      activities = await query(`
        SELECT 
          a.id, a.action_type, 
          COALESCE(u.username, 'Anonymous User') as user_email, 
          a.location, a.ip_address, a.status, a.timestamp,
          d.name as document_name
        FROM activities a
        LEFT JOIN documents d ON a.document_id = d.id
        LEFT JOIN users u ON a.user_email = u.email
        WHERE d.user_email = $1 OR a.user_email = $1
        ORDER BY a.timestamp DESC
        LIMIT 20
      `, [req.user.email]);
    }

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
  const { username, avatar_style, newPassword } = req.body;
  try {
    await query('UPDATE users SET username = $1, avatar_style = $2 WHERE id = $3', [username, avatar_style, req.user.id]);
    
    if (newPassword) {
      const pwError = validatePassword(newPassword);
      if (pwError) return res.status(400).json({ error: pwError });
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Documents List
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const userResult = await query('SELECT username FROM users WHERE email = $1', [req.user.email]);
    const username = userResult.rows[0]?.username || '';

    // Only show: 1) docs you own, 2) docs where your username is explicitly in shared_with_usernames
    let documents;
    if (username) {
      documents = await query(`
        SELECT id, name, 
          CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 'revoked' ELSE status END as status, 
          views, prints, uploaded_at, file_url, expires_at, allow_print, shared_with_usernames, user_email
        FROM documents
        WHERE user_email = $1 OR $2 = ANY(shared_with_usernames)
        ORDER BY uploaded_at DESC
      `, [req.user.email, username]);
    } else {
      // No username set — only show own documents
      documents = await query(`
        SELECT id, name, 
          CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 'revoked' ELSE status END as status, 
          views, prints, uploaded_at, file_url, expires_at, allow_print, shared_with_usernames, user_email
        FROM documents
        WHERE user_email = $1
        ORDER BY uploaded_at DESC
      `, [req.user.email]);
    }

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

    const { expires_at, allow_print, delete_on_expiry, shared_with_usernames } = req.body;
    
    // Parse the comma-separated usernames string into an array
    let sharedArray = [];
    if (shared_with_usernames && shared_with_usernames !== 'null' && shared_with_usernames !== 'undefined') {
      sharedArray = shared_with_usernames.split(',').map(s => s.trim()).filter(s => s);
    }

    const safeName = sanitizeFilename(req.file.originalname);

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(req.file.buffer, safeName, req.file.mimetype);

    // Save metadata to DB
    const newDoc = await query(`
      INSERT INTO documents (name, status, views, prints, file_url, expires_at, user_email, allow_print, delete_on_expiry, shared_with_usernames) 
      VALUES ($1, 'active', 0, 0, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [safeName, uploadResult.url, expires_at || null, req.user.email, allow_print === 'true', delete_on_expiry === 'true', sharedArray]);

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
    const ip = req.ip || req.connection?.remoteAddress || 'Unknown';

    // Fetch document URL
    const docResult = await query(`SELECT * FROM documents WHERE id = $1`, [docId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const doc = docResult.rows[0];

    // Check Isolation (Owner OR Shared User)
    const userResult = await query('SELECT username FROM users WHERE email = $1', [userEmail]);
    const username = userResult.rows[0]?.username || '';
    
    const isOwner = doc.user_email === userEmail;
    const isShared = doc.shared_with_usernames && doc.shared_with_usernames.includes(username);
    const isPublic = !doc.shared_with_usernames || doc.shared_with_usernames.length === 0;
    
    if (!isOwner && !isShared && !isPublic) {
      return res.status(403).json({ error: 'You do not have permission to view this document.' });
    }

    // Check Expiration
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      if (doc.delete_on_expiry) {
        // Actually delete from Supabase storage too
        try {
          const fileKey = doc.file_url?.split('/').pop();
          if (fileKey) await deleteFile(fileKey);
        } catch (storageErr) {
          console.error('Failed to delete file from storage:', storageErr);
        }
        await query(`DELETE FROM documents WHERE id = $1`, [docId]);
        return res.status(403).json({ error: 'This document has expired and was permanently deleted from the server.' });
      } else {
        await query(`UPDATE documents SET status = 'revoked' WHERE id = $1`, [docId]);
        doc.status = 'revoked';
      }
    }

    // Enterprise Security: Block if revoked
    if (doc.status === 'revoked') {
      await query(`
        INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
        VALUES ($1, 'view', $2, 'Unknown', $3, 'unauthorized')
      `, [docId, userEmail, ip]);
      return res.status(403).json({ error: 'Access to this document has been revoked or expired.' });
    }

    // Log activity
    await query(`
      INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
      VALUES ($1, 'view', $2, 'Unknown', $3, 'verified')
    `, [docId, userEmail, ip]);

    // Update view count
    await query(`UPDATE documents SET views = views + 1 WHERE id = $1`, [docId]);

    res.json({
      url: doc.file_url,
      document: doc
    });
  } catch (error) {
    console.error('Error viewing document:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/documents/:id/expiry', authenticateToken, async (req, res) => {
  const { expires_at } = req.body;
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    const isExpiredNow = expires_at && new Date(expires_at) < new Date();
    await query('UPDATE documents SET expires_at = $1, status = $2 WHERE id = $3', 
      [expires_at || null, isExpiredNow ? 'revoked' : 'active', req.params.id]);
    res.json({ message: 'Expiry updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    // Delete from Supabase storage too
    try {
      const fileKey = docQuery.rows[0].file_url?.split('/').pop();
      if (fileKey) await deleteFile(fileKey);
    } catch (storageErr) {
      console.error('Failed to delete file from storage:', storageErr);
    }
    
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Emergency Revoke All Documents
app.post('/api/documents/emergency-revoke', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `UPDATE documents SET status = 'revoked' WHERE user_email = $1 AND status = 'active' RETURNING id`,
      [req.user.email]
    );
    res.json({ message: `Emergency revoke complete. ${result.rowCount} document(s) revoked.`, count: result.rowCount });
  } catch (error) {
    console.error('Emergency revoke error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export Audit Log as CSV
app.get('/api/audit/export', authenticateToken, async (req, res) => {
  try {
    const activities = await query(`
      SELECT 
        a.id, a.action_type, a.user_email, a.location, a.ip_address, a.status, a.timestamp,
        d.name as document_name
      FROM activities a
      JOIN documents d ON a.document_id = d.id
      WHERE d.user_email = $1 OR a.user_email = $1
      ORDER BY a.timestamp DESC
      LIMIT 500
    `, [req.user.email]);

    const header = 'ID,Action,User Email,Document,Location,IP Address,Status,Timestamp\n';
    const rows = activities.rows.map(a =>
      `${a.id},${a.action_type},${a.user_email},"${(a.document_name || '').replace(/"/g, '""')}",${a.location || ''},${a.ip_address || ''},${a.status},${a.timestamp}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="secureshare-audit-log.csv"');
    res.send(header + rows);
  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Super Admin Routes ---
const requireAdmin = (req, res, next) => {
  if (req.user.email !== 'admin@secureshare.com') {
    return res.status(403).json({ error: 'Super Admin access required.' });
  }
  next();
};

app.get('/api/admin/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const documents = await query(`
      SELECT id, name, 
        CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 'revoked' ELSE status END as status, 
        views, prints, uploaded_at, file_url, expires_at, allow_print, shared_with_usernames, user_email
      FROM documents
      ORDER BY uploaded_at DESC
    `);
    res.json(documents.rows);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/documents/:id/sharing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { shared_with_usernames } = req.body;
    let sharedArray = [];
    if (shared_with_usernames && shared_with_usernames !== 'null' && shared_with_usernames !== 'undefined') {
      sharedArray = shared_with_usernames.split(',').map(s => s.trim()).filter(s => s);
    }
    await query('UPDATE documents SET shared_with_usernames = $1 WHERE id = $2', [sharedArray, req.params.id]);
    res.json({ message: 'Sharing updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/documents/:id/expiry', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { addHours } = req.body;
    if (!addHours) return res.status(400).json({ error: 'addHours required' });
    await query(`
      UPDATE documents 
      SET expires_at = GREATEST(COALESCE(expires_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + interval '1 hour' * $1,
          status = 'active'
      WHERE id = $2
    `, [addHours, req.params.id]);
    res.json({ message: 'Expiry extended' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query('SELECT id, email, username, avatar_style, role, is_verified, is_blocked, created_at FROM users ORDER BY created_at DESC');
    res.json(users.rows);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('UPDATE users SET is_blocked = NOT is_blocked WHERE id = $1 RETURNING is_blocked', [req.params.id]);
    res.json({ message: 'User block status updated', is_blocked: result.rows[0].is_blocked });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
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
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)');
    // Fix orphaned documents
    await query("UPDATE documents SET user_email = 'admin@secureshare.com' WHERE user_email IS NULL");
    
    await query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS shared_with_usernames TEXT[] DEFAULT '{}'");
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS allow_print BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS delete_on_expiry BOOLEAN DEFAULT FALSE');
    
    // Fix timezone issues causing instant expiration
    try {
      await query('ALTER TABLE documents ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE');
    } catch (e) {
      console.log('Could not alter expires_at type (might already be correct or contain incompatible data)');
    }

    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE'); // default true for old users
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)');
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'anonymous'");
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE');
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
