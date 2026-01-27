import { pool } from './db/index.js';

async function addHealthCommentsColumn() {
    try {
        console.log('Adding health_comments column to leads table...');

        // Check if column already exists
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leads' 
            AND column_name = 'health_comments';
        `;

        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✓ Column health_comments already exists');
            return;
        }

        // Add the column
        const alterQuery = `
            ALTER TABLE leads 
            ADD COLUMN health_comments TEXT;
        `;

        await pool.query(alterQuery);
        console.log('✓ Successfully added health_comments column to leads table');

    } catch (error) {
        console.error('Error adding health_comments column:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the migration
addHealthCommentsColumn()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
