// verify-encryption.js — quick sanity check, run once
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import { decrypt } from '../utils/encrypt.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, ssn, account_number, routing_number,
             ssn_enc, account_number_enc, routing_number_enc
      FROM leads
      WHERE ssn_enc IS NOT NULL
      LIMIT 3
    `);

    for (const r of rows) {
      console.log(`\n--- Lead ID ${r.id} ---`);
      console.log('Plain ssn (original):', r.ssn);
      console.log('Decrypted ssn_enc   :', decrypt(r.ssn_enc));
      console.log('Match:', r.ssn === decrypt(r.ssn_enc) ? '✅ YES' : '❌ NO — MISMATCH');

      console.log('Plain acct# (original):', r.account_number);
      console.log('Decrypted enc         :', decrypt(r.account_number_enc));
      console.log('Match:', r.account_number === decrypt(r.account_number_enc) ? '✅ YES' : '❌ NO');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
