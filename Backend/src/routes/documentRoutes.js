import express from 'express';
import multer from 'multer';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';
import { 
  getDocuments, 
  uploadDocument, 
  viewDocument, 
  togglePrintPermission, 
  updateExpiry, 
  updateSharing, 
  deleteDocument, 
  emergencyRevoke 
} from '../controllers/documentController.js';

const router = express.Router();

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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed.`), false);
    }
  }
});

router.get('/', authenticateToken, getDocuments);
router.post('/', authenticateToken, upload.single('file'), uploadDocument);
router.get('/:id/view', optionalAuthenticateToken, viewDocument);
router.put('/:id/allow_print', authenticateToken, togglePrintPermission);
router.put('/:id/expiry', authenticateToken, updateExpiry);
router.put('/:id/sharing', authenticateToken, updateSharing);
router.delete('/:id', authenticateToken, deleteDocument);
router.post('/emergency-revoke', authenticateToken, emergencyRevoke);

export default router;
