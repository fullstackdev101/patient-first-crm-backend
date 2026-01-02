import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL from .env or construct from individual vars
const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function seedLeadStatus() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Create lead_status table if it doesn't exist
        console.log('Creating lead_status table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lead_status (
                id SERIAL PRIMARY KEY,
                status_name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Table created/verified');

        // Insert status values from screenshot
        console.log('\nInserting status values...');

        const statuses = [
            { status_name: 'Entry', description: 'Initial entry stage for new leads' },
            { status_name: 'Manage Review', description: 'Lead is under management review' },
            { status_name: 'QA Review', description: 'Lead is under quality assurance review' },
            { status_name: 'Approved', description: 'Lead has been approved' },
            { status_name: 'Pending', description: 'Lead is pending further action' },
            { status_name: 'New', description: 'New lead, not yet processed' }
        ];

        for (const status of statuses) {
            await client.query(
                `INSERT INTO lead_status (status_name, description, status) 
                 VALUES ($1, $2, 'active')
                 ON CONFLICT (status_name) 
                 DO UPDATE SET description = EXCLUDED.description`,
                [status.status_name, status.description]
            );
            console.log(`  ✓ Inserted/Updated: ${status.status_name}`);
        }

        // Display current status records
        const result = await client.query('SELECT * FROM lead_status ORDER BY id');
        console.log('\n✅ Lead status table seeded successfully!');
        console.log('\nCurrent lead_status records:');
        console.table(result.rows);

        console.log('\nStatus values:');
        result.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.status_name} - ${row.description}`);
        });

    } catch (error) {
        console.error('Error seeding lead_status:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

// Run the seed script
seedLeadStatus()
    .then(() => {
        console.log('\n✅ Seed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
