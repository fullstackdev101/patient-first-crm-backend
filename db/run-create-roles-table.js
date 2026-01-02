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

async function createRolesTable() {
    const client = await pool.connect();

    try {
        console.log('🔄 Creating roles table and seeding data...\n');

        const sqlPath = join(__dirname, 'create-roles-table.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Roles table created and seeded successfully!\n');

        // Verify roles
        const result = await client.query('SELECT * FROM roles ORDER BY id;');
        console.log('📊 Roles in database:');
        console.table(result.rows);

    } catch (error) {
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createRolesTable()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
