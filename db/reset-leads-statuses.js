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

async function resetLeadsStatuses() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Check if there are any leads referencing statuses
        console.log('\n🔍 Checking for leads referencing statuses...');
        const leadsCheck = await client.query('SELECT COUNT(*) as count FROM leads');
        console.log(`   Found ${leadsCheck.rows[0].count} leads in the database`);

        if (parseInt(leadsCheck.rows[0].count) > 0) {
            console.log('\n⚠️  WARNING: There are existing leads that reference statuses.');
            console.log('   This operation will fail if foreign key constraints exist.');
            console.log('   Proceeding anyway...\n');
        }

        // Truncate the table and reset sequence
        console.log('🗑️  Truncating leads_statuses table...');
        await client.query('TRUNCATE TABLE leads_statuses RESTART IDENTITY CASCADE');
        console.log('✅ Table truncated and ID sequence reset');

        // Insert fresh statuses with clean IDs
        console.log('\n📝 Inserting fresh statuses...');

        const statuses = [
            { status_name: 'New', description: 'Initial entry stage for new leads' },
            { status_name: 'Manager Review', description: 'Lead is under management review' },
            { status_name: 'QA Review', description: 'Lead is under quality assurance review' },
            { status_name: 'QA Manager Review', description: 'Lead is under quality assurance Manager review' },
            { status_name: 'Approved', description: 'Lead has been approved' },
            { status_name: 'Pending', description: 'Lead is pending further action' },
            { status_name: 'Rejected', description: 'Rejected or declined' }
        ];

        for (const status of statuses) {
            const result = await client.query(
                `INSERT INTO leads_statuses (status_name, description, status, sort_order) 
                 VALUES ($1, $2, 'active', $3) RETURNING id`,
                [status.status_name, status.description, statuses.indexOf(status) + 1]
            );
            console.log(`  ✓ ID ${result.rows[0].id}: ${status.status_name}`);
        }

        // Display final results
        const finalResult = await client.query('SELECT id, status_name, description, sort_order FROM leads_statuses ORDER BY id');
        console.log('\n✅ Leads_statuses table reset successfully!');
        console.log('\n📊 Final status records:');
        console.table(finalResult.rows);

        console.log('\nStatus summary:');
        finalResult.rows.forEach((row) => {
            console.log(`  ${row.id}. ${row.status_name} - ${row.description}`);
        });

    } catch (error) {
        console.error('\n❌ Error resetting statuses:', error);
        console.error('\nError details:', error.message);

        if (error.code === '23503') {
            console.error('\n⚠️  Foreign key constraint violation!');
            console.error('   Existing leads are referencing these statuses.');
            console.error('   You need to either:');
            console.error('   1. Delete all leads first, OR');
            console.error('   2. Update existing lead status references to match new IDs');
        }

        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

resetLeadsStatuses()
    .then(() => {
        console.log('\n✅ Reset completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Reset failed');
        process.exit(1);
    });
