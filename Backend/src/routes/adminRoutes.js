import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  requireAdmin, 
  getAllDocuments, 
  updateDocumentSharing, 
  extendDocumentExpiry, 
  getAllUsers, 
  toggleUserBlock 
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/documents', getAllDocuments);
router.put('/documents/:id/sharing', updateDocumentSharing);
router.put('/documents/:id/expiry', extendDocumentExpiry);

router.get('/users', getAllUsers);
router.put('/users/:id/block', toggleUserBlock);

export default router;
