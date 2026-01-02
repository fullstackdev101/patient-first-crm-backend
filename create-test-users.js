import bcrypt from 'bcrypt';
import { query } from './config/db.js';

/**
 * Script to create test users in the existing database schema
 * Schema: id (integer), name, username, email, password (text), status, role_id
 */

const createTestUsers = async () => {
    try {
        console.log('👤 Creating test users...\n');

        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 10);
        console.log('🔐 Password hashed successfully\n');

        // Get next available ID
        const maxIdResult = await query('SELECT COALESCE(MAX(id), 0) as max_id FROM users');
        let nextId = parseInt(maxIdResult.rows[0].max_id) + 1;

        // Test users to create
        const testUsers = [
            {
                name: 'John Smith',
                username: 'john.smith',
                email: 'john.smith@patientfirst.com',
                password: hashedPassword,
                status: 'Active',
                role_id: 1 // Assuming 1 is Admin
            },
            {
                name: 'Sarah Johnson',
                username: 'sarah.johnson',
                email: 'sarah.johnson@patientfirst.com',
                password: hashedPassword,
                status: 'Active',
                role_id: 2 // Assuming 2 is Manager
            },
            {
                name: 'Mike Davis',
                username: 'mike.davis',
                email: 'mike.davis@patientfirst.com',
                password: hashedPassword,
                status: 'Active',
                role_id: 3 // Assuming 3 is Sales/Agent
            }
        ];

        for (const user of testUsers) {
            try {
                // Check if user already exists
                const existing = await query(
                    'SELECT id FROM users WHERE username = $1',
                    [user.username]
                );

                if (existing.rows.length > 0) {
                    console.log(`⚠️  User ${user.username} already exists, skipping...`);
                    continue;
                }

                // Insert user
                await query(
                    `INSERT INTO users (id, name, username, email, password, status, role_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [nextId, user.name, user.username, user.email, user.password, user.status, user.role_id]
                );

                console.log(`✅ Created user: ${user.username} (ID: ${nextId}, role_id: ${user.role_id})`);
                nextId++;
            } catch (err) {
                console.error(`❌ Error creating user ${user.username}:`, err.message);
            }
        }

        console.log('\n✅ Test user creation complete!');
        console.log('📝 All test users have password: password123\n');

        // Display all users
        const users = await query('SELECT id, name, username, email, status, role_id FROM users');
        console.log('👥 Current users in database:');
        console.table(users.rows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

createTestUsers();
