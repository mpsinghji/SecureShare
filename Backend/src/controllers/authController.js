import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';

let OAuth2Client;
try {
  const { OAuth2Client: Client } = await import('google-auth-library');
  OAuth2Client = Client;
} catch (e) {}

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const register = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      if (!userExists.rows[0].is_verified) {
        const otpCode = generateOTP();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await query('UPDATE users SET password_hash = $1, otp_code = $2 WHERE email = $3', [hash, otpCode, email]);
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
    res.status(201).json({ message: 'OTP sent to email', email: user.email });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
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
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!user.is_verified) {
      const otpCode = generateOTP();
      await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, user.id]);
      return res.status(403).json({ error: 'Please verify your email via OTP', requiresVerification: true, email: user.email });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
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

    let result = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (result.rows.length === 0) {
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
    res.status(401).json({ error: 'Invalid Google Token' });
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const otpCode = generateOTP();
    await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, result.rows[0].id]);
    
    res.json({ message: 'Reset code sent', email });
  } catch (error) { next(error); }
};

export const resetPassword = async (req, res, next) => {
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
};

export const getProfile = async (req, res) => {
  try {
    const result = await query('SELECT email, role, is_verified, username, avatar_style FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateProfile = async (req, res) => {
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
