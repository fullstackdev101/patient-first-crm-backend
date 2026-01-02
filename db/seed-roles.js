import { pool } from './index.js';

async function seedRoles() {
    try {
        console.log('Seeding roles table...');

        const rolesToInsert = [
            { id: 1, role: 'Admin', description: 'System Administrator', status: 'Active' },
            { id: 2, role: 'Manager', description: 'Team Manager', status: 'Active' },
            { id: 3, role: 'Agent', description: 'Sales Agent', status: 'Active' },
            { id: 4, role: 'QA', description: 'Quality Assurance', status: 'Active' },
            { id: 5, role: 'Reviewer', description: 'Lead Reviewer', status: 'Active' },
        ];

        for (const roleData of rolesToInsert) {
            await pool.query(
                `INSERT INTO roles (id, role, description, status, created_at) 
                 VALUES ($1, $2, $3, $4, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET 
                 role = EXCLUDED.role, 
                 description = EXCLUDED.description`,
                [roleData.id, roleData.role, roleData.description, roleData.status]
            );
        }

        console.log('✅ Roles seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding roles:', error);
        process.exit(1);
    }
}

seedRoles();
