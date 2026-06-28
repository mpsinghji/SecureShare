import { query } from '../db/db.js';

export const requireAdmin = (req, res, next) => {
  if (req.user.email !== 'admin@secureshare.com') {
    return res.status(403).json({ error: 'Super Admin access required.' });
  }
  next();
};

export const getAllDocuments = async (req, res) => {
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
};

export const updateDocumentSharing = async (req, res) => {
  try {
    const { shared_with_usernames } = req.body;
    let sharedArray = [];
    if (shared_with_usernames && shared_with_usernames !== 'null' && shared_with_usernames !== 'undefined') {
      sharedArray = shared_with_usernames.split(',').map(s => s.trim()).filter(s => s);
    }
    await query('UPDATE documents SET shared_with_usernames = $1 WHERE id = $2', [sharedArray, req.params.id]);
    res.json({ message: 'Sharing updated' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const extendDocumentExpiry = async (req, res) => {
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
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await query('SELECT id, email, username, avatar_style, role, is_verified, is_blocked, created_at FROM users ORDER BY created_at DESC');
    res.json(users.rows);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

export const toggleUserBlock = async (req, res) => {
  try {
    const result = await query('UPDATE users SET is_blocked = NOT is_blocked WHERE id = $1 RETURNING is_blocked', [req.params.id]);
    res.json({ message: 'User block status updated', is_blocked: result.rows[0].is_blocked });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
};
