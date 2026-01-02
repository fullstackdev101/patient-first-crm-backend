import { pool } from './index.js';

async function createLeadsTable() {
    try {
        console.log('Creating leads table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                
                -- Personal Information
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                middle_initial VARCHAR(1),
                date_of_birth DATE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                state_of_birth VARCHAR(50) NOT NULL,
                ssn VARCHAR(11) NOT NULL,
                
                -- Medical Information
                height VARCHAR(20),
                weight VARCHAR(20),
                insurance_provider VARCHAR(255),
                policy_number VARCHAR(100),
                medical_notes TEXT,
                
                -- Doctor Information
                doctor_name VARCHAR(255),
                doctor_phone VARCHAR(20),
                doctor_address TEXT,
                
                -- Beneficiary Information
                beneficiary_details TEXT NOT NULL,
                
                -- Plan Information
                plan_details TEXT NOT NULL,
                
                -- Health Questionnaire
                health_q1 BOOLEAN NOT NULL,
                health_q2 BOOLEAN NOT NULL,
                health_q3 BOOLEAN NOT NULL,
                health_q4 BOOLEAN NOT NULL,
                health_q5 BOOLEAN NOT NULL,
                health_q6 BOOLEAN NOT NULL,
                health_q7a BOOLEAN NOT NULL,
                health_q7b BOOLEAN NOT NULL,
                health_q7c BOOLEAN NOT NULL,
                health_q7d BOOLEAN NOT NULL,
                health_q8a BOOLEAN NOT NULL,
                health_q8b BOOLEAN NOT NULL,
                health_q8c BOOLEAN NOT NULL,
                covid_question BOOLEAN NOT NULL,
                
                -- Banking Information
                bank_name VARCHAR(255) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                account_number VARCHAR(100) NOT NULL,
                routing_number VARCHAR(100) NOT NULL,
                account_type VARCHAR(50) NOT NULL,
                banking_comments TEXT,
                
                -- Metadata
                status VARCHAR(20) NOT NULL DEFAULT 'Entry',
                assigned_to INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;

        await pool.query(createTableQuery);
        console.log('✅ Leads table created successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating leads table:', error);
        process.exit(1);
    }
}

createLeadsTable();
