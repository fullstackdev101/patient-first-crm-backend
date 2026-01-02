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

async function addAssignedIPColumn() {
    const client = await pool.connect();

    try {
        console.log('🔄 Adding assigned_ip column to users table...\n');

        const sqlPath = join(__dirname, 'add-assigned-ip-to-users.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Column added successfully!\n');

        // Verify column creation
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'assigned_ip';
        `);

        console.log('📊 Column Details:');
        console.table(result.rows);

    } catch (error) {
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addAssignedIPColumn()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
