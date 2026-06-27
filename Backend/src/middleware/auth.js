import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { query } from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    
    try {
      const dbUser = await query('SELECT is_blocked FROM users WHERE id = $1', [user.id]);
      if (dbUser.rows.length === 0 || dbUser.rows[0].is_blocked) {
        return res.status(403).json({ error: 'Your account has been blocked by the administrator.' });
      }
      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Auth DB Error:', dbErr);
      return res.status(500).json({ error: 'Server error during authentication.' });
    }
  });
};
