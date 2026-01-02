import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkColumns() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking leads table columns...\n');

        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads' 
            AND column_name LIKE '%health%' OR column_name LIKE '%covid%'
            OR column_name LIKE '%hospitalized%'
            OR column_name LIKE '%organ%'
            OR column_name LIKE '%aids%'
            OR column_name LIKE '%diabetes%'
            OR column_name LIKE '%kidney%'
            OR column_name LIKE '%pending%'
            OR column_name LIKE '%angina%'
            OR column_name LIKE '%heart_attack%'
            OR column_name LIKE '%cancer%'
            OR column_name LIKE '%substance%'
            OR column_name LIKE '%cardiovascular%'
            OR column_name LIKE '%neurological%'
            ORDER BY column_name;
        `);

        console.log('Health-related columns in leads table:');
        console.log('=====================================\n');

        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
        });

        console.log(`\n📊 Total: ${result.rows.length} columns found\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkColumns();
