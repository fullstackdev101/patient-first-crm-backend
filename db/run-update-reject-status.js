import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Pool } = pg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateRejectStatus() {
    const client = await pool.connect();

    try {
        console.log('🔄 Updating "Reject" to "Rejected"...\n');

        const sqlPath = join(__dirname, 'update-reject-status.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        const result = await client.query(sql);

        console.log('✅ Status updated successfully!');
        console.log(`Rows affected: ${result.rowCount}\n`);

    } catch (error) {
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

updateRejectStatus()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
