const mysql = require('mysql2/promise');
require('dotenv').config();

async function createLeadStatusTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'patientfirst_crm'
    });

    try {
        console.log('Creating lead_status table...');

        // Create lead_status table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS lead_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                status_name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✓ lead_status table created successfully');

        // Insert status values from screenshot
        console.log('Inserting status values...');

        const statuses = [
            { status_name: 'Entry', description: 'Initial entry stage for new leads' },
            { status_name: 'Manage Review', description: 'Lead is under management review' },
            { status_name: 'QA Review', description: 'Lead is under quality assurance review' },
            { status_name: 'Approved', description: 'Lead has been approved' },
            { status_name: 'Pending', description: 'Lead is pending further action' },
            { status_name: 'New', description: 'New lead, not yet processed' }
        ];

        for (const status of statuses) {
            await connection.execute(
                `INSERT INTO lead_status (status_name, description, status) 
                 VALUES (?, ?, 'active')
                 ON DUPLICATE KEY UPDATE description = VALUES(description)`,
                [status.status_name, status.description]
            );
            console.log(`  ✓ Inserted: ${status.status_name}`);
        }

        console.log('\n✅ Lead status table created and populated successfully!');
        console.log('\nStatus values:');
        console.log('  1. Entry');
        console.log('  2. Manage Review');
        console.log('  3. QA Review');
        console.log('  4. Approved');
        console.log('  5. Pending');
        console.log('  6. New');

        // Display current status records
        const [rows] = await connection.execute('SELECT * FROM lead_status ORDER BY id');
        console.log('\nCurrent lead_status records:');
        console.table(rows);

    } catch (error) {
        console.error('Error creating lead_status table:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the migration
createLeadStatusTable()
    .then(() => {
        console.log('\nMigration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nMigration failed:', error);
        process.exit(1);
    });
