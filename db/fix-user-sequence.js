import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixUserSequence() {
    try {
        console.log('Fixing users table ID sequence...');

        // Get the maximum ID from users table
        const result = await pool.query('SELECT MAX(id) as max_id FROM users');
        const maxId = result.rows[0].max_id || 0;

        console.log(`Current max ID: ${maxId}`);

        // Reset the sequence to the next value after max ID
        await pool.query(`SELECT setval('users_id_seq', ${maxId}, true)`);

        console.log(`✅ Users sequence reset to start from ${maxId + 1}`);

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error fixing sequence:', error);
        await pool.end();
        process.exit(1);
    }
}

fixUserSequence();
