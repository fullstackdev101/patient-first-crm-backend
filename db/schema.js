import { pgTable, serial, varchar, text, timestamp, integer, boolean, date } from 'drizzle-orm/pg-core';

// Roles Table
export const roles = pgTable('roles', {
    id: serial('id').primaryKey(),
    role: varchar('role', { length: 10 }).notNull(),
    description: varchar('description', { length: 255 }),
    status: varchar('status', { length: 1 }).notNull().default('A'),
    created_at: timestamp('created_at').defaultNow(),
    created_by: integer('created_by'),
});

// Leads Statuses Table (renamed from lead_status)
export const leadsStatuses = pgTable('leads_statuses', {
    id: serial('id').primaryKey(),
    status_name: varchar('status_name', { length: 50 }).notNull().unique(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    sort_order: integer('sort_order').default(0),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Leads Comments Table
export const leadsComments = pgTable('leads_comments', {
    id: serial('id').primaryKey(),
    lead_id: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    comment: text('comment').notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
    status: varchar('status', { length: 20 }).default('active'),
});

// Users Activities Table
export const usersActivities = pgTable('users_activities', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    activity_type: varchar('activity_type', { length: 50 }).notNull(),
    activity_description: text('activity_description').notNull(),
    entity_type: varchar('entity_type', { length: 50 }),
    entity_id: integer('entity_id'),
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    created_at: timestamp('created_at').defaultNow(),
    status: varchar('status', { length: 20 }).default('active'),
});

// Leads Status Tracking Table
export const leadsStatusTracking = pgTable('leads_status_tracking', {
    id: serial('id').primaryKey(),
    lead_id: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    old_status: integer('old_status').references(() => leadsStatuses.id),
    new_status: integer('new_status').notNull().references(() => leadsStatuses.id),
    changed_at: timestamp('changed_at').defaultNow(),
});

// Leads Assigned Tracking Table
export const leadsAssignedTracking = pgTable('leads_assigned_tracking', {
    id: serial('id').primaryKey(),
    lead_id: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    assigned_by_user_id: integer('assigned_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    assigned_to_user_id: integer('assigned_to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    old_assigned_to: integer('old_assigned_to').references(() => users.id, { onDelete: 'set null' }),
    assigned_at: timestamp('assigned_at').defaultNow(),
});

// Users Table
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('Active'),
    role_id: integer('role_id').references(() => roles.id),
    assigned_ip: varchar('assigned_ip', { length: 45 }),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Leads Table
export const leads = pgTable('leads', {
    id: serial('id').primaryKey(),

    // Personal Information
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    middle_initial: varchar('middle_initial', { length: 1 }),
    date_of_birth: date('date_of_birth').notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    address: text('address').notNull(),
    state_of_birth: varchar('state_of_birth', { length: 50 }).notNull(),
    ssn: varchar('ssn', { length: 11 }).notNull(),

    // Medical Information
    height: varchar('height', { length: 20 }),
    weight: varchar('weight', { length: 20 }),
    insurance_provider: varchar('insurance_provider', { length: 255 }),
    policy_number: varchar('policy_number', { length: 100 }),
    medical_notes: text('medical_notes'),

    // Doctor Information
    doctor_name: varchar('doctor_name', { length: 255 }),
    doctor_phone: varchar('doctor_phone', { length: 20 }),
    doctor_address: text('doctor_address'),

    // Beneficiary Information
    beneficiary_details: text('beneficiary_details').notNull(),

    // Plan Information
    plan_details: text('plan_details').notNull(),

    // Health Questionnaire
    hospitalized_nursing_oxygen_cancer_assistance: boolean('hospitalized_nursing_oxygen_cancer_assistance').notNull(),
    organ_transplant_terminal_condition: boolean('organ_transplant_terminal_condition').notNull(),
    aids_hiv_immune_deficiency: boolean('aids_hiv_immune_deficiency').notNull(),
    diabetes_complications_insulin: boolean('diabetes_complications_insulin').notNull(),
    kidney_disease_multiple_cancers: boolean('kidney_disease_multiple_cancers').notNull(),
    pending_tests_surgery_hospitalization: boolean('pending_tests_surgery_hospitalization').notNull(),
    angina_stroke_lupus_copd_hepatitis: boolean('angina_stroke_lupus_copd_hepatitis').notNull(),
    heart_attack_aneurysm_surgery: boolean('heart_attack_aneurysm_surgery').notNull(),
    cancer_treatment_2years: boolean('cancer_treatment_2years').notNull(),
    substance_abuse_treatment: boolean('substance_abuse_treatment').notNull(),
    cardiovascular_events_3years: boolean('cardiovascular_events_3years').notNull(),
    cancer_respiratory_liver_3years: boolean('cancer_respiratory_liver_3years').notNull(),
    neurological_conditions_3years: boolean('neurological_conditions_3years').notNull(),
    covid_question: boolean('covid_question').notNull(),

    // Banking Information
    bank_name: varchar('bank_name', { length: 255 }).notNull(),
    account_name: varchar('account_name', { length: 255 }).notNull(),
    account_number: varchar('account_number', { length: 100 }).notNull(),
    routing_number: varchar('routing_number', { length: 100 }).notNull(),
    account_type: varchar('account_type', { length: 50 }).notNull(),
    banking_comments: text('banking_comments'),

    // Metadata
    status: integer('status').notNull().references(() => leadsStatuses.id),
    assigned_to: integer('assigned_to').references(() => users.id),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});
