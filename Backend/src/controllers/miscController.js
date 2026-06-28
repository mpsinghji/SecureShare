import { query } from '../db/db.js';

export const getDashboardStats = async (req, res) => {
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getDashboardActivities = async (req, res) => {
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const exportAuditLog = async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
};
