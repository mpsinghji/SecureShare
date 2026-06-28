import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { 
  register, 
  verifyOtp, 
  login, 
  googleAuth, 
  forgotPassword, 
  resetPassword, 
  getProfile, 
  updateProfile 
} from '../controllers/authController.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many attempts, please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

export default router;
