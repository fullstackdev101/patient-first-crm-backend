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

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting lead statuses migration...\n');

        // Read SQL file
        const sqlPath = join(__dirname, 'update-lead-statuses.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        // Execute the migration
        const result = await client.query(sql);

        console.log('✅ Migration completed successfully!\n');

        // Display current statuses
        const statusesResult = await client.query(
            'SELECT id, status_name, description, sort_order, status FROM leads_statuses ORDER BY sort_order ASC'
        );

        console.log('📊 Current Lead Statuses:');
        console.table(statusesResult.rows);

        // Check for any leads with invalid status
        const invalidLeadsResult = await client.query(
            'SELECT COUNT(*) as count FROM leads WHERE status NOT IN (SELECT id FROM leads_statuses)'
        );

        if (parseInt(invalidLeadsResult.rows[0].count) > 0) {
            console.warn(`⚠️  Warning: ${invalidLeadsResult.rows[0].count} leads have invalid status references`);
        } else {
            console.log('✅ All leads have valid status references');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
