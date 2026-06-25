import { query } from './db.js';

const initDb = async () => {
  try {
    console.log("Creating tables...");
    
    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        views INTEGER DEFAULT 0,
        prints INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        location VARCHAR(100),
        ip_address VARCHAR(50),
        status VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tables created. Checking for existing data...");

    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("Inserting admin user...");
      const { default: bcrypt } = await import('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      await query(`INSERT INTO users (email, password_hash) VALUES ('admin@secureshare.com', $1)`, [hash]);
    }

    const docCount = await query('SELECT COUNT(*) FROM documents');
    if (parseInt(docCount.rows[0].count) === 0) {
      console.log("Inserting dummy data...");
      
      const docInsert = await query(`
        INSERT INTO documents (name, status, views, prints, uploaded_at) VALUES 
        ('Q3 Financial Audit.pdf', 'active', 14, 0, NOW() - INTERVAL '2 days'),
        ('Project_Ares_Manifesto.docx', 'revoked', 5, 1, NOW() - INTERVAL '5 days'),
        ('Merger_Agreement_Draft_v2.pdf', 'active', 32, 2, NOW() - INTERVAL '1 day')
        RETURNING id;
      `);

      const doc1 = docInsert.rows[0].id;
      const doc2 = docInsert.rows[1].id;
      const doc3 = docInsert.rows[2].id;

      await query(`
        INSERT INTO activities (document_id, action_type, user_email, location, ip_address, status, timestamp) VALUES 
        ($1, 'view', 'm.sterling@lawcorp.com', 'London, UK', '185.34.XX.XX', 'verified', NOW() - INTERVAL '2 minutes'),
        ($2, 'print', 'anonymous_guest_49', 'New York, USA', '192.168.1.1', 'unauthorized', NOW() - INTERVAL '14 minutes'),
        ($3, 'view', 'j.doe@partner.co', 'Tokyo, JP', '203.0.XX.XX', 'verified', NOW() - INTERVAL '1 hour')
      `, [doc1, doc2, doc3]);

      console.log("Dummy data inserted.");
    } else {
      console.log("Data already exists. Skipping insertion.");
    }

    console.log("Database initialization complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
};

initDb();
