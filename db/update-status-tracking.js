import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function updateStatusTracking() {
    try {
        await client.connect();
        console.log('Connected to database\n');

        // Check if there's any data in status tracking
        const trackingCount = await client.query(`SELECT COUNT(*) FROM leads_status_tracking`);
        console.log(`Found ${trackingCount.rows[0].count} records in leads_status_tracking`);

        if (parseInt(trackingCount.rows[0].count) > 0) {
            // Get status mapping
            const statusMapping = await client.query(`
                SELECT id, status_name FROM leads_statuses
            `);

            // Add new columns
            console.log('\nAdding new integer columns...');
            await client.query(`
                ALTER TABLE leads_status_tracking 
                ADD COLUMN IF NOT EXISTS old_status_id INTEGER,
                ADD COLUMN IF NOT EXISTS new_status_id INTEGER
            `);

            // Populate new columns from old ones
            console.log('Populating new columns...');
            for (const status of statusMapping.rows) {
                await client.query(`
                    UPDATE leads_status_tracking 
                    SET old_status_id = $1 
                    WHERE old_status = $2
                `, [status.id, status.status_name]);

                await client.query(`
                    UPDATE leads_status_tracking 
                    SET new_status_id = $1 
                    WHERE new_status = $2
                `, [status.id, status.status_name]);
            }

            // Make new_status_id NOT NULL
            await client.query(`
                ALTER TABLE leads_status_tracking 
                ALTER COLUMN new_status_id SET NOT NULL
            `);

            // Drop old columns
            await client.query(`
                ALTER TABLE leads_status_tracking 
                DROP COLUMN old_status,
                DROP COLUMN new_status
            `);

            // Rename columns
            await client.query(`
                ALTER TABLE leads_status_tracking 
                RENAME COLUMN old_status_id TO old_status
            `);

            await client.query(`
                ALTER TABLE leads_status_tracking 
                RENAME COLUMN new_status_id TO new_status
            `);

            // Add foreign keys
            await client.query(`
                ALTER TABLE leads_status_tracking 
                ADD CONSTRAINT fk_tracking_new_status 
                FOREIGN KEY (new_status) 
                REFERENCES leads_statuses(id)
            `);

            console.log('✓ Status tracking table updated');
        } else {
            console.log('\nNo data in tracking table, updating schema directly...');

            // Drop and recreate with correct types
            await client.query(`DROP TABLE IF EXISTS leads_status_tracking CASCADE`);

            await client.query(`
                CREATE TABLE leads_status_tracking (
                    id SERIAL PRIMARY KEY,
                    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    old_status INTEGER REFERENCES leads_statuses(id),
                    new_status INTEGER NOT NULL REFERENCES leads_statuses(id),
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await client.query(`
                CREATE INDEX idx_status_tracking_lead_id ON leads_status_tracking(lead_id);
                CREATE INDEX idx_status_tracking_user_id ON leads_status_tracking(user_id);
                CREATE INDEX idx_status_tracking_changed_at ON leads_status_tracking(changed_at);
            `);

            console.log('✓ Status tracking table recreated with integer types');
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

updateStatusTracking()
    .then(() => {
        console.log('\n✅ Complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
