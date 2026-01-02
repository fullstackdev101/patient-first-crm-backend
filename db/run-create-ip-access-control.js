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

async function createIPAccessControlTable() {
    const client = await pool.connect();

    try {
        console.log('🔄 Creating IP Access Control table...\n');

        const sqlPath = join(__dirname, 'create-ip-access-control.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ IP Access Control table created successfully!\n');

        // Verify table creation
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'ip_access_control'
            ORDER BY ordinal_position;
        `);

        console.log('📊 Table Structure:');
        console.table(result.rows);

    } catch (error) {
        console.error('❌ Table creation failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createIPAccessControlTable()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
