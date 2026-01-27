import { pool } from './db/index.js';

async function addLicenseAgentStatus() {
    try {
        console.log('Adding License Agent status to leads_statuses table...');

        // Check if status already exists
        const checkQuery = `
            SELECT id, status_name 
            FROM leads_statuses 
            WHERE status_name = 'License Agent';
        `;

        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✓ License Agent status already exists with ID:', checkResult.rows[0].id);
            return;
        }

        // Get the max sort_order to add this status at the end
        const maxSortQuery = `
            SELECT COALESCE(MAX(sort_order), 0) as max_sort 
            FROM leads_statuses;
        `;
        const maxSortResult = await pool.query(maxSortQuery);
        const nextSortOrder = maxSortResult.rows[0].max_sort + 1;

        // Insert the new status
        const insertQuery = `
            INSERT INTO leads_statuses (status_name, description, status, sort_order, created_at, updated_at)
            VALUES ('License Agent', 'Lead assigned to License Agent for processing', 'active', $1, NOW(), NOW())
            RETURNING id, status_name;
        `;

        const result = await pool.query(insertQuery, [nextSortOrder]);
        console.log('✓ Successfully added License Agent status with ID:', result.rows[0].id);
        console.log('  Sort order:', nextSortOrder);

    } catch (error) {
        console.error('Error adding License Agent status:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the migration
addLicenseAgentStatus()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
