import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getDashboardStats, 
  getDashboardActivities, 
  exportAuditLog 
} from '../controllers/miscController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/activities', getDashboardActivities);
router.get('/audit/export', exportAuditLog);

export default router;
