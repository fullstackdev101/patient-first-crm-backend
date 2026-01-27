import pkg from 'pg';
const { Client } = pkg;
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

async function updateLeadsStatuses() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Check which table exists
        console.log('\n🔍 Checking which status table exists...');

        const tableCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('lead_status', 'leads_statuses')
        `);

        console.log('Found tables:', tableCheck.rows.map(r => r.table_name));

        // Determine which table to use
        const tableName = tableCheck.rows.find(r => r.table_name === 'leads_statuses')
            ? 'leads_statuses'
            : 'lead_status';

        console.log(`\n📝 Using table: ${tableName}`);

        // Define the new statuses
        const statuses = [
            { status_name: 'New', description: 'Initial entry stage for new leads' },
            { status_name: 'Manager Review', description: 'Lead is under management review' },
            { status_name: 'QA Review', description: 'Lead is under quality assurance review' },
            { status_name: 'QA Manager Review', description: 'Lead is under quality assurance Manager review' },
            { status_name: 'Approved', description: 'Lead has been approved' },
            { status_name: 'Pending', description: 'Lead is pending further action' },
            { status_name: 'Rejected', description: 'Rejected or declined' }
        ];

        console.log('\n🔄 Updating statuses...');

        for (const status of statuses) {
            await client.query(
                `INSERT INTO ${tableName} (status_name, description, status) 
                 VALUES ($1, $2, 'active')
                 ON CONFLICT (status_name) 
                 DO UPDATE SET description = EXCLUDED.description`,
                [status.status_name, status.description]
            );
            console.log(`  ✓ Inserted/Updated: ${status.status_name}`);
        }

        // Display current status records
        const result = await client.query(`SELECT * FROM ${tableName} ORDER BY id`);
        console.log(`\n✅ ${tableName} table updated successfully!`);
        console.log(`\nCurrent ${tableName} records:`);
        console.table(result.rows);

        console.log('\nStatus values:');
        result.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.status_name} - ${row.description}`);
        });

    } catch (error) {
        console.error('❌ Error updating statuses:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

updateLeadsStatuses()
    .then(() => {
        console.log('\n✅ Update completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Update failed:', error);
        process.exit(1);
    });
