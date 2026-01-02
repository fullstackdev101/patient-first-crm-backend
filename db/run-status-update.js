import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection using DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runUpdate() {
    const client = await pool.connect();

    try {
        console.log('🔄 Updating lead statuses...\n');

        // Read SQL file
        const sqlPath = join(__dirname, 'add-reject-status.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        // Execute the update
        await client.query(sql);

        console.log('✅ Status updates completed successfully!\n');

        // Display current statuses
        const statusesResult = await client.query(
            'SELECT id, status_name, description, sort_order, status FROM leads_statuses ORDER BY sort_order ASC'
        );

        console.log('📊 Updated Lead Statuses:');
        console.table(statusesResult.rows);

    } catch (error) {
        console.error('❌ Update failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run update
runUpdate()
    .then(() => {
        console.log('\n✅ Update script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Update script failed:', error);
        process.exit(1);
    });
