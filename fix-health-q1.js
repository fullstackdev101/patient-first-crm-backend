import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixMissingColumn() {
    const client = await pool.connect();

    try {
        console.log('🔄 Renaming health_q1 column...\n');

        await client.query(`
            ALTER TABLE leads 
            RENAME COLUMN health_q1 TO hospitalized_nursing_oxygen_cancer_assistance;
        `);

        console.log('✅ Successfully renamed health_q1 to hospitalized_nursing_oxygen_cancer_assistance\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('ℹ️  Column health_q1 may already be renamed or does not exist\n');
        }
    } finally {
        client.release();
        await pool.end();
    }
}

fixMissingColumn();
