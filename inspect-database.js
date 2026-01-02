import { query } from './config/db.js';

/**
 * Script to inspect database schema
 */

const inspectDatabase = async () => {
    try {
        console.log('🔍 Inspecting database schema...\n');

        // Get table columns
        const columns = await query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Users table schema:');
        console.table(columns.rows);

        // Get sample data
        const users = await query('SELECT * FROM users LIMIT 5');
        console.log('\n👥 Sample users:');
        console.table(users.rows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

inspectDatabase();
