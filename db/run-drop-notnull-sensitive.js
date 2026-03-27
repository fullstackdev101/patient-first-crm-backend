// run-drop-notnull-sensitive.js
// Drops NOT NULL constraints on ssn, account_number, routing_number
// so they can be NULL when encrypted values are stored in the *_enc columns.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔗 Connected. Dropping NOT NULL constraints...');

    await client.query(`
      ALTER TABLE leads
        ALTER COLUMN ssn             DROP NOT NULL,
        ALTER COLUMN account_number  DROP NOT NULL,
        ALTER COLUMN routing_number  DROP NOT NULL;
    `);

    console.log('✅ NOT NULL constraints removed from ssn, account_number, routing_number');

    // Verify
    const { rows } = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leads'
        AND column_name IN ('ssn', 'account_number', 'routing_number')
      ORDER BY column_name;
    `);
    console.log('📋 Column nullability:', rows);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
