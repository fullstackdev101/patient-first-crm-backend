import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

// Database connection using DATABASE_URL from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migration: Renaming health questionnaire columns...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'migrations', 'rename_health_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

        // Begin transaction
        await client.query('BEGIN');

        let successCount = 0;
        for (const statement of statements) {
            try {
                await client.query(statement);
                const columnName = statement.match(/TO (\w+)/)?.[1] || 'unknown';
                console.log(`✅ Renamed column to: ${columnName}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error executing statement:`, error.message);
                throw error;
            }
        }

        // Commit transaction
        await client.query('COMMIT');

        console.log(`\n✨ Migration completed successfully!`);
        console.log(`   ${successCount}/${statements.length} columns renamed\n`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error.message);
        console.error('   Transaction rolled back\n');
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
