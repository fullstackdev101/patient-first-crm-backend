import { pool } from './index.js';

async function inspectRoles() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'roles'
            ORDER BY ordinal_position
        `);

        console.log('Roles table columns:');
        console.log(result.rows);

        // Also check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'roles'
            );
        `);
        console.log('Table exists:', tableCheck.rows[0].exists);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

inspectRoles();
