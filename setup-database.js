import bcrypt from 'bcrypt';
import { query } from './config/db.js';

/**
 * Script to check database schema and create test users
 */

const checkAndSetupDatabase = async () => {
    try {
        console.log('🔍 Checking database schema...\n');

        // Check if users table exists
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ Users table does not exist. Creating table...\n');

            // Create users table
            await query(`
                CREATE TABLE users (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);

            console.log('✅ Users table created successfully!\n');
        } else {
            console.log('✅ Users table exists\n');
        }

        // Check if any users exist
        const userCount = await query('SELECT COUNT(*) FROM users');
        console.log(`📊 Current user count: ${userCount.rows[0].count}\n`);

        if (parseInt(userCount.rows[0].count) === 0) {
            console.log('👤 Creating test users...\n');

            // Hash passwords
            const hashedPassword = await bcrypt.hash('password123', 10);

            // Insert test users
            const testUsers = [
                {
                    id: 'U001',
                    name: 'John Smith',
                    username: 'john.smith',
                    email: 'john.smith@patientfirst.com',
                    password: hashedPassword,
                    role: 'Admin',
                    status: 'Active'
                },
                {
                    id: 'U002',
                    name: 'Sarah Johnson',
                    username: 'sarah.johnson',
                    email: 'sarah.johnson@patientfirst.com',
                    password: hashedPassword,
                    role: 'Manager',
                    status: 'Active'
                },
                {
                    id: 'U003',
                    name: 'Mike Davis',
                    username: 'mike.davis',
                    email: 'mike.davis@patientfirst.com',
                    password: hashedPassword,
                    role: 'Sales',
                    status: 'Active'
                }
            ];

            for (const user of testUsers) {
                await query(
                    `INSERT INTO users (id, name, username, email, password, role, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [user.id, user.name, user.username, user.email, user.password, user.role, user.status]
                );
                console.log(`✅ Created user: ${user.username} (${user.role})`);
            }

            console.log('\n✅ Test users created successfully!');
            console.log('📝 All test users have password: password123\n');
        }

        // Display all users
        const users = await query('SELECT id, name, username, email, role, status FROM users');
        console.log('👥 Current users in database:');
        console.table(users.rows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

checkAndSetupDatabase();
