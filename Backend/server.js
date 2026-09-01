import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { query } from './src/db/db.js';
import authRoutes from './src/routes/authRoutes.js';
import documentRoutes from './src/routes/documentRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import miscRoutes from './src/routes/miscRoutes.js';

let helmet;
try {
  helmet = (await import('helmet')).default;
} catch (e) {}

const app = express();

if (helmet) {
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://mpji-secureshare.vercel.app',
  'https://secureshare-i6ff.onrender.com'
];

if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, ''));
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, health checks)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Allow exact match in allowedOrigins
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Allow any Vercel deployment (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // Allow localhost / 127.0.0.1 with any port
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // If FRONTEND_URL is explicitly set to '*'
    if (process.env.FRONTEND_URL === '*') {
      return callback(null, true);
    }

    console.warn(`[CORS] Request from disallowed origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// For manually checking the health endpoint in a browser
app.get("/api/health", async (req, res) => {
  try {
    // Ping the database
    await query('SELECT 1');

    res.status(200).json({
      status: "ok",
      backend: "up",
      database: "connected"
    });
  } catch (error) {
    console.error("Health check error:", error.message);
    res.status(503).json({
      status: "error",
      backend: "up",
      database: "disconnected"
    });
  }
});

// For UptimeRobot's free HEAD monitoring
app.head("/api/health", async (req, res) => {
  try {
    await query('SELECT 1');
    return res.sendStatus(200);
  } catch (error) {
    console.error("Health check failed:", error.message);
    return res.sendStatus(503);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', miscRoutes);


app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)');
    await query("UPDATE documents SET user_email = 'admin@secureshare.com' WHERE user_email IS NULL");
    
    await query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS shared_with_usernames TEXT[] DEFAULT '{}'");
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS allow_print BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS delete_on_expiry BOOLEAN DEFAULT FALSE');
    
    try {
      await query('ALTER TABLE documents ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE');
    } catch (e) {
      console.log('Could not alter expires_at type (might already be correct or contain incompatible data)');
    }

    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE'); 
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)');
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'anonymous'");
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE');
    console.log('Database schema verified.');

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
