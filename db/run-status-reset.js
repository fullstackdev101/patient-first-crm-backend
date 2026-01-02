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

async function resetStatuses() {
    const client = await pool.connect();

    try {
        console.log('🔄 Resetting lead statuses table...\n');

        // Read SQL file
        const sqlPath = join(__dirname, 'reset-statuses.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        // Execute the reset
        await client.query(sql);

        console.log('✅ Statuses reset completed successfully!\n');

        // Display current statuses
        const statusesResult = await client.query(
            'SELECT id, status_name, description, sort_order, status FROM leads_statuses ORDER BY id ASC'
        );

        console.log('📊 Reset Lead Statuses:');
        console.table(statusesResult.rows);

        // Check leads
        const leadsCheck = await client.query(
            'SELECT COUNT(*) as count FROM leads WHERE status NOT IN (SELECT id FROM leads_statuses)'
        );

        if (parseInt(leadsCheck.rows[0].count) > 0) {
            console.warn(`⚠️  Warning: ${leadsCheck.rows[0].count} leads have invalid status references`);
        } else {
            console.log('✅ All leads have valid status references');
        }

    } catch (error) {
        console.error('❌ Reset failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run reset
resetStatuses()
    .then(() => {
        console.log('\n✅ Reset script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Reset script failed:', error);
        process.exit(1);
    });
