import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ospf_tempo_x',
  user: process.env.DB_USER || 'macbook',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    console.log('✓ Database schema initialized');

    // Check if admin user exists
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE username = 'netviz_admin'"
    );

    if (adminCheck.rows.length === 0) {
      // Create default admin user with hashed password
      const passwordHash = await bcrypt.hash('V3ry$trongAdm1n!2025', 10);
      
      await client.query(
        `INSERT INTO users (username, password_hash, role) 
         VALUES ($1, $2, $3)`,
        ['netviz_admin', passwordHash, 'admin']
      );
      console.log('✓ Default admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }

  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Query helper
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed:', { text: text.substring(0, 50), duration, rows: result.rowCount });
  }
  
  return result;
}

// Get client for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

export default {
  query,
  getClient,
  testConnection,
  initializeDatabase,
  closePool,
  pool
};

