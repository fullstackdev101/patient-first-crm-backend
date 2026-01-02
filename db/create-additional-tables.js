import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
    connectionString: connectionString,
});

async function createTables() {
    try {
        await client.connect();
        console.log('Connected to database\n');

        // 1. Rename lead_status to leads_statuses
        console.log('Step 1: Renaming lead_status to leads_statuses...');
        try {
            await client.query(`ALTER TABLE lead_status RENAME TO leads_statuses`);
            console.log('✓ Table renamed successfully');
        } catch (error) {
            if (error.code === '42P01') {
                console.log('⚠ Table lead_status does not exist, skipping rename');
            } else {
                throw error;
            }
        }

        // 2. Create leads_comments table
        console.log('\nStep 2: Creating leads_comments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads_comments (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
                CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ leads_comments table created successfully');

        // Create index for faster queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_leads_comments_lead_id ON leads_comments(lead_id);
            CREATE INDEX IF NOT EXISTS idx_leads_comments_user_id ON leads_comments(user_id);
        `);
        console.log('✓ Indexes created for leads_comments');

        // 3. Create users_activities table
        console.log('\nStep 3: Creating users_activities table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users_activities (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activity_type VARCHAR(50) NOT NULL,
                activity_description TEXT NOT NULL,
                entity_type VARCHAR(50),
                entity_id INTEGER,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_activity FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ users_activities table created successfully');

        // Create indexes for faster queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_activities_user_id ON users_activities(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_activities_type ON users_activities(activity_type);
            CREATE INDEX IF NOT EXISTS idx_users_activities_created_at ON users_activities(created_at);
        `);
        console.log('✓ Indexes created for users_activities');

        // Display table structures
        console.log('\n' + '='.repeat(60));
        console.log('TABLE STRUCTURES');
        console.log('='.repeat(60));

        // leads_statuses structure
        const statusesColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads_statuses'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 leads_statuses:');
        console.table(statusesColumns.rows);

        // leads_comments structure
        const commentsColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'leads_comments'
            ORDER BY ordinal_position
        `);
        console.log('\n💬 leads_comments:');
        console.table(commentsColumns.rows);

        // users_activities structure
        const activitiesColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users_activities'
            ORDER BY ordinal_position
        `);
        console.log('\n📊 users_activities:');
        console.table(activitiesColumns.rows);

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tables created successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Error creating tables:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

// Run the migration
createTables()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
