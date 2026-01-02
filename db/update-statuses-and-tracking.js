import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function updateStatusesAndTracking() {
    try {
        await client.connect();
        console.log('Connected to database\n');

        // 1. Add sort_order column to leads_statuses
        console.log('Step 1: Adding sort_order column to leads_statuses...');
        try {
            await client.query(`
                ALTER TABLE leads_statuses 
                ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
            `);
            console.log('✓ sort_order column added to leads_statuses');
        } catch (error) {
            if (error.code === '42701') {
                console.log('⚠ sort_order column already exists');
            } else {
                throw error;
            }
        }

        // 2. Add 'Rejected' status if it doesn't exist
        console.log('\nStep 2: Adding "Rejected" status...');
        const checkRejected = await client.query(`
            SELECT id FROM leads_statuses WHERE status_name = 'Rejected'
        `);

        if (checkRejected.rows.length === 0) {
            await client.query(`
                INSERT INTO leads_statuses (status_name, description, status, sort_order)
                VALUES ('Rejected', 'Lead has been rejected', 'active', 7)
            `);
            console.log('✓ "Rejected" status added');
        } else {
            console.log('⚠ "Rejected" status already exists');
        }

        // 3. Update sort_order for existing statuses
        console.log('\nStep 3: Updating sort_order for existing statuses...');
        const statusOrder = [
            { name: 'Entry', order: 1 },
            { name: 'Manage Review', order: 2 },
            { name: 'QA Review', order: 3 },
            { name: 'Approved', order: 4 },
            { name: 'Pending', order: 5 },
            { name: 'New', order: 6 },
            { name: 'Rejected', order: 7 }
        ];

        for (const status of statusOrder) {
            await client.query(`
                UPDATE leads_statuses 
                SET sort_order = $1 
                WHERE status_name = $2
            `, [status.order, status.name]);
        }
        console.log('✓ sort_order updated for all statuses');

        // 4. Create leads_assigned_tracking table
        console.log('\nStep 4: Creating leads_assigned_tracking table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads_assigned_tracking (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                assigned_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                old_assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_lead_assigned FOREIGN KEY (lead_id) REFERENCES leads(id),
                CONSTRAINT fk_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id),
                CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ leads_assigned_tracking table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_assigned_tracking_lead_id ON leads_assigned_tracking(lead_id);
            CREATE INDEX IF NOT EXISTS idx_assigned_tracking_assigned_to ON leads_assigned_tracking(assigned_to_user_id);
            CREATE INDEX IF NOT EXISTS idx_assigned_tracking_assigned_at ON leads_assigned_tracking(assigned_at);
        `);
        console.log('✓ Indexes created for leads_assigned_tracking');

        // Display results
        console.log('\n' + '='.repeat(60));
        console.log('UPDATED TABLES');
        console.log('='.repeat(60));

        // Show all statuses with sort_order
        const statuses = await client.query(`
            SELECT id, status_name, description, sort_order, status
            FROM leads_statuses
            ORDER BY sort_order
        `);
        console.log('\n📊 leads_statuses (with sort_order):');
        console.table(statuses.rows);

        // Show leads_assigned_tracking structure
        const assignedColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads_assigned_tracking'
            ORDER BY ordinal_position
        `);
        console.log('\n👥 leads_assigned_tracking:');
        console.table(assignedColumns.rows);

        console.log('\n' + '='.repeat(60));
        console.log('✅ All updates completed successfully!');
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
updateStatusesAndTracking()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
