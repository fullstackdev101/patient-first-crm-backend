import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function createStatusTrackingSystem() {
    try {
        await client.connect();
        console.log('Connected to database\n');

        // 1. Create leads_status_tracking table
        console.log('Step 1: Creating leads_status_tracking table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads_status_tracking (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                old_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_lead_tracking FOREIGN KEY (lead_id) REFERENCES leads(id),
                CONSTRAINT fk_user_tracking FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ leads_status_tracking table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_status_tracking_lead_id ON leads_status_tracking(lead_id);
            CREATE INDEX IF NOT EXISTS idx_status_tracking_user_id ON leads_status_tracking(user_id);
            CREATE INDEX IF NOT EXISTS idx_status_tracking_changed_at ON leads_status_tracking(changed_at);
        `);
        console.log('✓ Indexes created for leads_status_tracking');

        // 2. Add status column to leads_comments
        console.log('\nStep 2: Adding status column to leads_comments...');
        try {
            await client.query(`
                ALTER TABLE leads_comments 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
            `);
            console.log('✓ Status column added to leads_comments');
        } catch (error) {
            if (error.code === '42701') {
                console.log('⚠ Status column already exists in leads_comments');
            } else {
                throw error;
            }
        }

        // 3. Add status column to users_activities
        console.log('\nStep 3: Adding status column to users_activities...');
        try {
            await client.query(`
                ALTER TABLE users_activities 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
            `);
            console.log('✓ Status column added to users_activities');
        } catch (error) {
            if (error.code === '42701') {
                console.log('⚠ Status column already exists in users_activities');
            } else {
                throw error;
            }
        }

        // Display table structures
        console.log('\n' + '='.repeat(60));
        console.log('TABLE STRUCTURES');
        console.log('='.repeat(60));

        // leads_status_tracking structure
        const trackingColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads_status_tracking'
            ORDER BY ordinal_position
        `);
        console.log('\n📊 leads_status_tracking:');
        console.table(trackingColumns.rows);

        // leads_comments structure
        const commentsColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads_comments'
            ORDER BY ordinal_position
        `);
        console.log('\n💬 leads_comments (updated):');
        console.table(commentsColumns.rows);

        // users_activities structure
        const activitiesColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users_activities'
            ORDER BY ordinal_position
        `);
        console.log('\n📈 users_activities (updated):');
        console.table(activitiesColumns.rows);

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tables created/updated successfully!');
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
createStatusTrackingSystem()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
