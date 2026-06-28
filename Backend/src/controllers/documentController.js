import { query } from '../db/db.js';
import { uploadFile, deleteFile } from '../services/storage.js';

const sanitizeFilename = (name) => name.replace(/[<>"'&]/g, '_');

export const getDocuments = async (req, res) => {
  try {
    const userResult = await query('SELECT username FROM users WHERE email = $1', [req.user.email]);
    const username = userResult.rows[0]?.username || '';

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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { expires_at, allow_print, delete_on_expiry, shared_with_usernames } = req.body;
    
    let sharedArray = [];
    if (shared_with_usernames && shared_with_usernames !== 'null' && shared_with_usernames !== 'undefined') {
      sharedArray = shared_with_usernames.split(',').map(s => s.trim()).filter(s => s);
    }

    const safeName = sanitizeFilename(req.file.originalname);
    const uploadResult = await uploadFile(req.file.buffer, safeName, req.file.mimetype);

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
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const viewDocument = async (req, res) => {
  try {
    const docId = req.params.id;
    const userEmail = req.user ? req.user.email : 'Anonymous';
    const ip = req.ip || req.connection?.remoteAddress || 'Unknown';

    const docResult = await query(`SELECT * FROM documents WHERE id = $1`, [docId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const doc = docResult.rows[0];

    const isPublic = !doc.shared_with_usernames || doc.shared_with_usernames.length === 0;

    if (!req.user && !isPublic) {
      return res.status(401).json({ error: 'Please log in to view this secure document.' });
    }

    let isOwner = false;
    let isShared = false;

    if (req.user) {
      const userResult = await query('SELECT username FROM users WHERE email = $1', [userEmail]);
      const username = userResult.rows[0]?.username || '';
      isOwner = doc.user_email === userEmail;
      isShared = doc.shared_with_usernames && (doc.shared_with_usernames.includes(username) || doc.shared_with_usernames.includes(userEmail));
    }
    
    if (req.user && !isOwner && !isShared && !isPublic) {
      return res.status(403).json({ error: 'You do not have permission to view this document.' });
    }

    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      if (doc.delete_on_expiry) {
        try {
          const fileKey = doc.file_url?.split('/').pop();
          if (fileKey) await deleteFile(fileKey);
        } catch (storageErr) {}
        await query(`DELETE FROM documents WHERE id = $1`, [docId]);
        return res.status(403).json({ error: 'This document has expired and was permanently deleted from the server.' });
      } else {
        await query(`UPDATE documents SET status = 'revoked' WHERE id = $1`, [docId]);
        doc.status = 'revoked';
      }
    }

    if (doc.status === 'revoked') {
      await query(`
        INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
        VALUES ($1, 'view', $2, 'Unknown', $3, 'unauthorized')
      `, [docId, userEmail, ip]);
      return res.status(403).json({ error: 'Access to this document has been revoked or expired.' });
    }

    await query(`
      INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status) 
      VALUES ($1, 'view', $2, 'Unknown', $3, 'verified')
    `, [docId, userEmail, ip]);

    await query(`UPDATE documents SET views = views + 1 WHERE id = $1`, [docId]);

    res.json({
      url: doc.file_url,
      document: doc
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const togglePrintPermission = async (req, res) => {
  const { allow_print } = req.body;
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    await query('UPDATE documents SET allow_print = $1 WHERE id = $2', [allow_print === true || allow_print === 'true', req.params.id]);
    res.json({ message: 'Print access updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const updateExpiry = async (req, res) => {
  const { expires_at } = req.body;
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    const isExpiredNow = expires_at && new Date(expires_at) < new Date();
    await query('UPDATE documents SET expires_at = $1, status = $2 WHERE id = $3', 
      [expires_at || null, isExpiredNow ? 'revoked' : 'active', req.params.id]);
    res.json({ message: 'Expiry updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const updateSharing = async (req, res) => {
  const { shared_with_usernames } = req.body;
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    await query('UPDATE documents SET shared_with_usernames = $1 WHERE id = $2', [shared_with_usernames, req.params.id]);
    res.json({ message: 'Access updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const deleteDocument = async (req, res) => {
  try {
    const docQuery = await query('SELECT * FROM documents WHERE id = $1 AND user_email = $2', [req.params.id, req.user.email]);
    if (docQuery.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    
    try {
      const fileKey = docQuery.rows[0].file_url?.split('/').pop();
      if (fileKey) await deleteFile(fileKey);
    } catch (storageErr) {}
    
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const emergencyRevoke = async (req, res) => {
  try {
    const result = await query(
      `UPDATE documents SET status = 'revoked' WHERE user_email = $1 AND status = 'active' RETURNING id`,
      [req.user.email]
    );
    res.json({ message: `Emergency revoke complete. ${result.rowCount} document(s) revoked.`, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
