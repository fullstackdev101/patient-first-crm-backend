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

async function addCreatedByColumn() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        console.log('📝 Adding created_by column to leads table...\n');

        // Check if column already exists
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='leads' AND column_name='created_by'
        `);

        if (checkColumn.rows.length > 0) {
            console.log('ℹ️  Column created_by already exists');
        } else {
            // Add created_by column
            await client.query(`
                ALTER TABLE leads 
                ADD COLUMN created_by INTEGER REFERENCES users(id)
            `);
            console.log('✅ Column created_by added successfully');
        }

    } catch (error) {
        console.error('\n❌ Error adding column:', error);
        console.error('\nError details:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

addCreatedByColumn()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed');
        process.exit(1);
    });
