import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrateHealthQuestionsToBoolean() {
    const client = await pool.connect();

    try {
        console.log('Starting migration: Converting health questions to boolean...\n');

        await client.query('BEGIN');

        // List of health question columns to convert
        const healthColumns = [
            'health_q1', 'health_q2', 'health_q3', 'health_q4', 'health_q5', 'health_q6',
            'health_q7a', 'health_q7b', 'health_q7c', 'health_q7d',
            'health_q8a', 'health_q8b', 'health_q8c',
            'covid_question'
        ];

        for (const column of healthColumns) {
            console.log(`Converting ${column}...`);

            // Step 1: Add a temporary boolean column
            await client.query(`
                ALTER TABLE leads 
                ADD COLUMN ${column}_temp BOOLEAN
            `);

            // Step 2: Convert varchar values to boolean
            // 'yes' -> true, 'no' -> false, null/empty -> null
            await client.query(`
                UPDATE leads 
                SET ${column}_temp = CASE 
                    WHEN LOWER(${column}) = 'yes' THEN true
                    WHEN LOWER(${column}) = 'no' THEN false
                    ELSE NULL
                END
            `);

            // Step 3: Drop the old varchar column
            await client.query(`
                ALTER TABLE leads 
                DROP COLUMN ${column}
            `);

            // Step 4: Rename temp column to original name
            await client.query(`
                ALTER TABLE leads 
                RENAME COLUMN ${column}_temp TO ${column}
            `);

            console.log(`✅ ${column} converted successfully`);
        }

        // Add NOT NULL constraints where needed (optional fields can be null)
        console.log('\nSetting NOT NULL constraints on required fields...');

        // These are typically not required, so we'll leave them nullable
        // If you want to make them required, uncomment and modify as needed

        await client.query('COMMIT');

        console.log('\n✅ Migration completed successfully!');
        console.log('All health question fields are now boolean type.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateHealthQuestionsToBoolean();
