import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function convertStatusToForeignKey() {
    try {
        await client.connect();
        console.log('Connected to database\n');

        // 1. Create a mapping of status names to IDs
        console.log('Step 1: Getting status name to ID mapping...');
        const statusMapping = await client.query(`
            SELECT id, status_name FROM leads_statuses ORDER BY id
        `);
        console.log('Status mapping:');
        console.table(statusMapping.rows);

        // 2. Add new column status_id as integer
        console.log('\nStep 2: Adding status_id column...');
        try {
            await client.query(`
                ALTER TABLE leads 
                ADD COLUMN IF NOT EXISTS status_id INTEGER
            `);
            console.log('✓ status_id column added');
        } catch (error) {
            if (error.code === '42701') {
                console.log('⚠ status_id column already exists');
            } else {
                throw error;
            }
        }

        // 3. Populate status_id based on status name
        console.log('\nStep 3: Populating status_id from status names...');
        for (const status of statusMapping.rows) {
            await client.query(`
                UPDATE leads 
                SET status_id = $1 
                WHERE status = $2
            `, [status.id, status.status_name]);
            console.log(`✓ Updated leads with status '${status.status_name}' to status_id ${status.id}`);
        }

        // Check for any leads with null status_id (unmapped statuses)
        const unmappedLeads = await client.query(`
            SELECT id, status FROM leads WHERE status_id IS NULL
        `);
        if (unmappedLeads.rows.length > 0) {
            console.log('\n⚠ WARNING: Found leads with unmapped statuses:');
            console.table(unmappedLeads.rows);
            // Set them to 'Entry' (id = 1) as default
            await client.query(`
                UPDATE leads SET status_id = 1 WHERE status_id IS NULL
            `);
            console.log('✓ Set unmapped leads to default status (Entry)');
        }

        // 4. Make status_id NOT NULL
        console.log('\nStep 4: Making status_id NOT NULL...');
        await client.query(`
            ALTER TABLE leads 
            ALTER COLUMN status_id SET NOT NULL
        `);
        console.log('✓ status_id is now NOT NULL');

        // 5. Drop old status column
        console.log('\nStep 5: Dropping old status column...');
        await client.query(`
            ALTER TABLE leads 
            DROP COLUMN IF EXISTS status
        `);
        console.log('✓ Old status column dropped');

        // 6. Rename status_id to status
        console.log('\nStep 6: Renaming status_id to status...');
        await client.query(`
            ALTER TABLE leads 
            RENAME COLUMN status_id TO status
        `);
        console.log('✓ Column renamed to status');

        // 7. Add foreign key constraint
        console.log('\nStep 7: Adding foreign key constraint...');
        try {
            await client.query(`
                ALTER TABLE leads 
                ADD CONSTRAINT fk_leads_status 
                FOREIGN KEY (status) 
                REFERENCES leads_statuses(id)
            `);
            console.log('✓ Foreign key constraint added');
        } catch (error) {
            if (error.code === '42710') {
                console.log('⚠ Foreign key constraint already exists');
            } else {
                throw error;
            }
        }

        // 8. Create index on status
        console.log('\nStep 8: Creating index on status...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
        `);
        console.log('✓ Index created');

        // Display final structure
        console.log('\n' + '='.repeat(60));
        console.log('FINAL LEADS TABLE STRUCTURE');
        console.log('='.repeat(60));

        const leadsColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads' AND column_name IN ('id', 'status', 'assigned_to')
            ORDER BY ordinal_position
        `);
        console.table(leadsColumns.rows);

        // Show sample data
        console.log('\nSample leads with new status structure:');
        const sampleLeads = await client.query(`
            SELECT l.id, l.first_name, l.last_name, l.status, ls.status_name, l.assigned_to
            FROM leads l
            LEFT JOIN leads_statuses ls ON l.status = ls.id
            LIMIT 5
        `);
        console.table(sampleLeads.rows);

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

// Run the migration
convertStatusToForeignKey()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
