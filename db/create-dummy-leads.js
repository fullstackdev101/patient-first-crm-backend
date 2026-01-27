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

// Simplified dummy lead data - only required fields
const dummyLeads = [
    // Agent1 leads (7 leads) - user_id: 7
    {
        first_name: 'John',
        last_name: 'Smith',
        date_of_birth: '1980-05-15',
        phone: '555-0101',
        email: 'john.smith1@email.com',
        address: '123 Main St, New York, NY 10001',
        state_of_birth: 'New York',
        ssn: '123-45-6789',
        beneficiary_details: 'Spouse: Jane Smith',
        plan_details: 'Standard Plan A',
        bank_name: 'Chase Bank',
        account_name: 'John Smith',
        account_number: '1234567890',
        routing_number: '021000021',
        account_type: 'Checking',
        created_by: 7,
        assigned_to: 7,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Sarah',
        last_name: 'Johnson',
        date_of_birth: '1975-08-22',
        phone: '555-0102',
        email: 'sarah.j2@email.com',
        address: '456 Oak Ave, Los Angeles, CA 90001',
        state_of_birth: 'California',
        ssn: '234-56-7890',
        beneficiary_details: 'Son: Michael Johnson',
        plan_details: 'Premium Plan B',
        bank_name: 'Bank of America',
        account_name: 'Sarah Johnson',
        account_number: '2345678901',
        routing_number: '026009593',
        account_type: 'Savings',
        created_by: 7,
        assigned_to: 7,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Michael',
        last_name: 'Brown',
        date_of_birth: '1988-12-10',
        phone: '555-0103',
        email: 'mbrown3@email.com',
        address: '789 Pine Rd, Chicago, IL 60601',
        state_of_birth: 'Illinois',
        ssn: '345-67-8901',
        beneficiary_details: 'Wife: Lisa Brown',
        plan_details: 'Family Plan C',
        bank_name: 'Wells Fargo',
        account_name: 'Michael Brown',
        account_number: '3456789012',
        routing_number: '121000248',
        account_type: 'Checking',
        created_by: 7,
        assigned_to: 7,
        status_id: 2,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Emily',
        last_name: 'Davis',
        date_of_birth: '1992-03-18',
        phone: '555-0104',
        email: 'emily.davis4@email.com',
        address: '321 Elm St, Houston, TX 77001',
        state_of_birth: 'Texas',
        ssn: '456-78-9012',
        beneficiary_details: 'Mother: Carol Davis',
        plan_details: 'Basic Plan D',
        bank_name: 'Citibank',
        account_name: 'Emily Davis',
        account_number: '4567890123',
        routing_number: '021000089',
        account_type: 'Checking',
        created_by: 7,
        assigned_to: 7,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Robert',
        last_name: 'Wilson',
        date_of_birth: '1985-07-25',
        phone: '555-0105',
        email: 'rwilson5@email.com',
        address: '654 Maple Dr, Phoenix, AZ 85001',
        state_of_birth: 'Arizona',
        ssn: '567-89-0123',
        beneficiary_details: 'Brother: James Wilson',
        plan_details: 'Gold Plan E',
        bank_name: 'US Bank',
        account_name: 'Robert Wilson',
        account_number: '5678901234',
        routing_number: '091000019',
        account_type: 'Savings',
        created_by: 7,
        assigned_to: 7,
        status_id: 3,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Jennifer',
        last_name: 'Martinez',
        date_of_birth: '1990-11-30',
        phone: '555-0106',
        email: 'jmartinez6@email.com',
        address: '987 Cedar Ln, Philadelphia, PA 19101',
        state_of_birth: 'Pennsylvania',
        ssn: '678-90-1234',
        beneficiary_details: 'Daughter: Sofia Martinez',
        plan_details: 'Silver Plan F',
        bank_name: 'PNC Bank',
        account_name: 'Jennifer Martinez',
        account_number: '6789012345',
        routing_number: '043000096',
        account_type: 'Checking',
        created_by: 7,
        assigned_to: 7,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'David',
        last_name: 'Anderson',
        date_of_birth: '1978-09-05',
        phone: '555-0107',
        email: 'danderson7@email.com',
        address: '147 Birch Ct, San Antonio, TX 78201',
        state_of_birth: 'Texas',
        ssn: '789-01-2345',
        beneficiary_details: 'Wife: Patricia Anderson',
        plan_details: 'Platinum Plan G',
        bank_name: 'TD Bank',
        account_name: 'David Anderson',
        account_number: '7890123456',
        routing_number: '036001808',
        account_type: 'Checking',
        created_by: 7,
        assigned_to: 7,
        status_id: 5,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },

    // Agent2 leads (3 leads) - user_id: 8
    {
        first_name: 'Lisa',
        last_name: 'Thompson',
        date_of_birth: '1983-04-12',
        phone: '555-0201',
        email: 'lthompson8@email.com',
        address: '258 Spruce St, San Diego, CA 92101',
        state_of_birth: 'California',
        ssn: '890-12-3456',
        beneficiary_details: 'Husband: Mark Thompson',
        plan_details: 'Standard Plan A',
        bank_name: 'Chase Bank',
        account_name: 'Lisa Thompson',
        account_number: '8901234567',
        routing_number: '021000021',
        account_type: 'Savings',
        created_by: 8,
        assigned_to: 8,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Christopher',
        last_name: 'Lee',
        date_of_birth: '1987-06-20',
        phone: '555-0202',
        email: 'clee9@email.com',
        address: '369 Willow Way, Dallas, TX 75201',
        state_of_birth: 'Texas',
        ssn: '901-23-4567',
        beneficiary_details: 'Sister: Angela Lee',
        plan_details: 'Premium Plan B',
        bank_name: 'Bank of America',
        account_name: 'Christopher Lee',
        account_number: '9012345678',
        routing_number: '026009593',
        account_type: 'Checking',
        created_by: 8,
        assigned_to: 8,
        status_id: 2,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    },
    {
        first_name: 'Amanda',
        last_name: 'White',
        date_of_birth: '1995-01-08',
        phone: '555-0203',
        email: 'awhite10@email.com',
        address: '741 Ash Blvd, San Jose, CA 95101',
        state_of_birth: 'California',
        ssn: '012-34-5678',
        beneficiary_details: 'Father: Robert White',
        plan_details: 'Basic Plan D',
        bank_name: 'Wells Fargo',
        account_name: 'Amanda White',
        account_number: '0123456789',
        routing_number: '121000248',
        account_type: 'Checking',
        created_by: 8,
        assigned_to: 8,
        status_id: 1,
        hospitalized_nursing_oxygen_cancer_assistance: false,
        organ_transplant_terminal_condition: false,
        aids_hiv_immune_deficiency: false,
        diabetes_complications_insulin: false,
        kidney_disease_multiple_cancers: false,
        pending_tests_surgery_hospitalization: false,
        angina_stroke_lupus_copd_hepatitis: false,
        heart_attack_aneurysm_surgery: false,
        cancer_treatment_2years: false,
        substance_abuse_treatment: false,
        cardiovascular_events_3years: false,
        cancer_respiratory_liver_3years: false,
        neurological_conditions_3years: false,
        covid_question: false
    }
];

async function createDummyLeads() {
    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        console.log('📝 Creating dummy leads...\n');

        let agent1Count = 0;
        let agent2Count = 0;

        for (const lead of dummyLeads) {
            const result = await client.query(
                `INSERT INTO leads (
                    first_name, last_name, date_of_birth, phone, email, 
                    address, state_of_birth, ssn,
                    beneficiary_details, plan_details,
                    bank_name, account_name, account_number, routing_number, account_type,
                    created_by, assigned_to, status,
                    hospitalized_nursing_oxygen_cancer_assistance, organ_transplant_terminal_condition,
                    aids_hiv_immune_deficiency, diabetes_complications_insulin,
                    kidney_disease_multiple_cancers, pending_tests_surgery_hospitalization,
                    angina_stroke_lupus_copd_hepatitis, heart_attack_aneurysm_surgery,
                    cancer_treatment_2years, substance_abuse_treatment,
                    cardiovascular_events_3years, cancer_respiratory_liver_3years,
                    neurological_conditions_3years, covid_question,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18,
                    $19, $20, $21, $22, $23, $24, $25, $26,
                    $27, $28, $29, $30, $31, $32, NOW(), NOW()
                ) 
                RETURNING id`,
                [
                    lead.first_name, lead.last_name, lead.date_of_birth, lead.phone, lead.email,
                    lead.address, lead.state_of_birth, lead.ssn,
                    lead.beneficiary_details, lead.plan_details,
                    lead.bank_name, lead.account_name, lead.account_number, lead.routing_number, lead.account_type,
                    lead.created_by, lead.assigned_to, lead.status_id,
                    lead.hospitalized_nursing_oxygen_cancer_assistance, lead.organ_transplant_terminal_condition,
                    lead.aids_hiv_immune_deficiency, lead.diabetes_complications_insulin,
                    lead.kidney_disease_multiple_cancers, lead.pending_tests_surgery_hospitalization,
                    lead.angina_stroke_lupus_copd_hepatitis, lead.heart_attack_aneurysm_surgery,
                    lead.cancer_treatment_2years, lead.substance_abuse_treatment,
                    lead.cardiovascular_events_3years, lead.cancer_respiratory_liver_3years,
                    lead.neurological_conditions_3years, lead.covid_question
                ]
            );

            if (lead.created_by === 7) {
                agent1Count++;
                console.log(`  ✓ Agent1 Lead ${agent1Count}: ${lead.first_name} ${lead.last_name} (ID: ${result.rows[0].id})`);
            } else {
                agent2Count++;
                console.log(`  ✓ Agent2 Lead ${agent2Count}: ${lead.first_name} ${lead.last_name} (ID: ${result.rows[0].id})`);
            }
        }

        console.log('\n✅ Dummy leads created successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   Agent1 (user_id: 7) leads: ${agent1Count}`);
        console.log(`   Agent2 (user_id: 8) leads: ${agent2Count}`);
        console.log(`   Total leads: ${agent1Count + agent2Count}`);

    } catch (error) {
        console.error('\n❌ Error creating dummy leads:', error);
        console.error('\nError details:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

createDummyLeads()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed');
        process.exit(1);
    });
