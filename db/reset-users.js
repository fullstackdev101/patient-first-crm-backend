import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

console.log('🔍 Database connection check:');
console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   Connection string:', connectionString ? connectionString.replace(/:[^:@]+@/, ':****@') : 'NOT SET');

const client = new Client({
    connectionString: connectionString,
});

async function resetUsersTable() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Truncate the table and reset sequence
        console.log('\n🗑️  Truncating users table...');
        await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        console.log('✅ Table truncated and ID sequence reset');

        // Define dummy users
        console.log('\n📝 Creating dummy users...');

        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const users = [
            // Active users with different roles
            {
                name: 'Super Admin',
                username: 'superadmin',
                email: 'superadmin@patientfirst.com',
                password: hashedPassword,
                role_id: 1, // SuperAdmin
                status: 'Active',
                assigned_ip: null
            },
            {
                name: 'John Manager',
                username: 'john.manager',
                email: 'john.manager@patientfirst.com',
                password: hashedPassword,
                role_id: 2, // Manager
                status: 'Active',
                assigned_ip: null
            },
            {
                name: 'Sarah Agent',
                username: 'sarah.agent',
                email: 'sarah.agent@patientfirst.com',
                password: hashedPassword,
                role_id: 3, // Agent
                status: 'Active',
                assigned_ip: null
            },
            {
                name: 'Mike License',
                username: 'mike.license',
                email: 'mike.license@patientfirst.com',
                password: hashedPassword,
                role_id: 4, // License Agent
                status: 'Active',
                assigned_ip: null
            },
            {
                name: 'Emma QA',
                username: 'emma.qa',
                email: 'emma.qa@patientfirst.com',
                password: hashedPassword,
                role_id: 5, // QA Review
                status: 'Active',
                assigned_ip: null
            },
            {
                name: 'David QA Manager',
                username: 'david.qamanager',
                email: 'david.qamanager@patientfirst.com',
                password: hashedPassword,
                role_id: 6, // QA Manager
                status: 'Active',
                assigned_ip: null
            },
        ];

        // Add 10 inactive agents
        for (let i = 1; i <= 10; i++) {
            users.push({
                name: `Agent ${i}`,
                username: `agent${i}`,
                email: `agent${i}@patientfirst.com`, // Unique email for each agent
                password: hashedPassword,
                role_id: 3, // Agent
                status: 'Inactive',
                assigned_ip: null
            });
        }

        // Insert users
        for (const user of users) {
            const result = await client.query(
                `INSERT INTO users (name, username, email, password, role_id, status, assigned_ip) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [user.name, user.username, user.email, user.password, user.role_id, user.status, user.assigned_ip]
            );
            console.log(`  ✓ ID ${result.rows[0].id}: ${user.name} (${user.username}) - ${user.status}`);
        }

        // Display final results
        const finalResult = await client.query(`
            SELECT u.id, u.name, u.username, u.email, u.status, r.role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.id
        `);

        console.log('\n✅ Users table reset successfully!');
        console.log(`\n📊 Total users created: ${finalResult.rows.length}`);
        console.log('\n📋 User Summary:');
        console.table(finalResult.rows);

        console.log('\n🔑 Default Password for all users: password123');
        console.log('\n📝 Active Users:');
        finalResult.rows.filter(u => u.status === 'Active').forEach(u => {
            console.log(`  - ${u.username} (${u.role})`);
        });

    } catch (error) {
        console.error('\n❌ Error resetting users:', error);
        console.error('\nError details:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

resetUsersTable()
    .then(() => {
        console.log('\n✅ Reset completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Reset failed');
        process.exit(1);
    });
