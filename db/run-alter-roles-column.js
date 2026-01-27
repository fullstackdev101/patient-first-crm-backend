import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Read the SQL file
        const sql = readFileSync(join(__dirname, 'alter-roles-column.sql'), 'utf8');

        console.log('\n📝 Executing migration...');
        console.log(sql);

        await client.query(sql);

        console.log('\n✅ Migration completed successfully!');
        console.log('   - role column increased to VARCHAR(50)');
        console.log('   - description column increased to VARCHAR(255)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

runMigration()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
