/**
 * migrate_sensitive_data.js
 *
 * Reads all leads with non-null ssn / account_number / routing_number,
 * encrypts them, and writes the result into the *_enc columns.
 *
 * SAFE: existing plain-text columns are NOT modified or deleted.
 *
 * Run AFTER the SQL migration has been applied:
 *   node backend/scripts/migrate_sensitive_data.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Load .env from the backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Inline encrypt so this script has zero dependencies beyond pg + dotenv
import crypto from 'crypto';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  const buf = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error(`Key must be 32 bytes; got ${buf.length}`);
  return buf;
}

function encrypt(plainText) {
  if (!plainText) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔗 Connecting to database...');
    const client = await pool.connect();

    // Fetch all rows that have at least one field to encrypt
    const { rows } = await client.query(`
      SELECT id, ssn, account_number, routing_number
      FROM leads
      WHERE ssn IS NOT NULL
         OR account_number IS NOT NULL
         OR routing_number IS NOT NULL
    `);

    console.log(`📋 Found ${rows.length} lead(s) to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const ssn_enc = row.ssn ? encrypt(row.ssn) : null;
      const account_number_enc = row.account_number ? encrypt(row.account_number) : null;
      const routing_number_enc = row.routing_number ? encrypt(row.routing_number) : null;

      // Only update rows where at least one enc value was produced
      if (!ssn_enc && !account_number_enc && !routing_number_enc) {
        skipped++;
        continue;
      }

      await client.query(
        `UPDATE leads
         SET ssn_enc = COALESCE($1, ssn_enc),
             account_number_enc = COALESCE($2, account_number_enc),
             routing_number_enc = COALESCE($3, routing_number_enc)
         WHERE id = $4`,
        [ssn_enc, account_number_enc, routing_number_enc, row.id]
      );

      updated++;
      if (updated % 50 === 0) console.log(`  ✅ Migrated ${updated} rows...`);
    }

    client.release();
    console.log(`\n🎉 Migration complete: ${updated} rows updated, ${skipped} skipped`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
