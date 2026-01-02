import { query } from './config/db.js';

/**
 * Script to inspect roles table
 */

const inspectRoles = async () => {
    try {
        console.log('🔍 Checking for roles table...\n');

        // Check if roles table exists
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'roles'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Roles table exists\n');

            // Get roles
            const roles = await query('SELECT * FROM roles');
            console.log('📋 Available roles:');
            console.table(roles.rows);
        } else {
            console.log('❌ Roles table does not exist\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

inspectRoles();
