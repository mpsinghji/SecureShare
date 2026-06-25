import bcrypt from 'bcrypt';
import { query } from './src/db/db.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function test() {
  try {
    const email = 'test4@example.com';
    const password = 'password';
    
    console.log('Checking existing user');
    const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('Existing:', existing.rows);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('Inserting new user');
    const newUser = await query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ($1, $2, 'user') 
      RETURNING id, email, role
    `, [email, hash]);

    console.log('New user inserted', newUser.rows[0]);
    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('Token generated');
  } catch(e) {
    console.error('Error occurred:', e);
  } finally {
    process.exit(0);
  }
}
test();
