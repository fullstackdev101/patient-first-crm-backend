import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkHealthColumns() {
    try {
        console.log('Checking health question column types...\n');

        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads' 
            AND column_name LIKE 'health_%' OR column_name = 'covid_question'
            ORDER BY column_name
        `);

        console.log('Health Question Columns:');
        console.log('========================');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkHealthColumns();
