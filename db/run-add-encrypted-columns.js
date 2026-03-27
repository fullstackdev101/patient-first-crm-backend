// run-add-encrypted-columns.js
// Adds ssn_enc, account_number_enc, routing_number_enc columns to leads table
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
    console.log('🔗 Connected. Adding encrypted columns...');

    await client.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS ssn_enc TEXT,
        ADD COLUMN IF NOT EXISTS account_number_enc TEXT,
        ADD COLUMN IF NOT EXISTS routing_number_enc TEXT;
    `);

    console.log('✅ Columns added successfully (or already existed)');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leads'
        AND column_name IN ('ssn_enc', 'account_number_enc', 'routing_number_enc')
      ORDER BY column_name;
    `);
    console.log('📋 Verified columns:', result.rows);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
