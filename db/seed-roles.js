import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Use DATABASE_URL from .env
const connectionString = process.env.DATABASE_URL;

console.log('🔍 Database connection check:');
console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   Connection string:', connectionString ? connectionString.replace(/:[^:@]+@/, ':****@') : 'NOT SET');

const pool = new Pool({
    connectionString: connectionString,
});

async function seedRoles() {
    try {
        console.log('Seeding roles table...');

        const rolesToInsert = [
            { id: 1, role: 'SuperAdmin', description: 'System Administrator', status: 'Active' },
            { id: 2, role: 'Manager', description: 'Team Manager', status: 'Active' },
            { id: 3, role: 'Agent', description: 'Sales Agent or closure agent or entry operator', status: 'Active' },
            { id: 4, role: 'License Agent', description: 'License Agent', status: 'Active' },
            { id: 5, role: 'QA Review', description: 'QA Review', status: 'Active' },
            { id: 6, role: 'QA Manager', description: 'QA Manager', status: 'Active' },
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
            console.log(`  ✓ Inserted/Updated: ${roleData.role}`);
        }

        console.log('✅ Roles seeded successfully!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding roles:', error);
        await pool.end();
        process.exit(1);
    }
}

seedRoles();
