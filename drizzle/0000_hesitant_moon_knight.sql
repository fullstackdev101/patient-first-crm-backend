CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"middle_initial" varchar(1),
	"date_of_birth" date NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"state_of_birth" varchar(50) NOT NULL,
	"ssn" varchar(11) NOT NULL,
	"height" varchar(20),
	"weight" varchar(20),
	"insurance_provider" varchar(255),
	"policy_number" varchar(100),
	"medical_notes" text,
	"doctor_name" varchar(255),
	"doctor_phone" varchar(20),
	"doctor_address" text,
	"beneficiary_details" text NOT NULL,
	"plan_details" text NOT NULL,
	"hospitalized_nursing_oxygen_cancer_assistance" boolean NOT NULL,
	"organ_transplant_terminal_condition" boolean NOT NULL,
	"aids_hiv_immune_deficiency" boolean NOT NULL,
	"diabetes_complications_insulin" boolean NOT NULL,
	"kidney_disease_multiple_cancers" boolean NOT NULL,
	"pending_tests_surgery_hospitalization" boolean NOT NULL,
	"angina_stroke_lupus_copd_hepatitis" boolean NOT NULL,
	"heart_attack_aneurysm_surgery" boolean NOT NULL,
	"cancer_treatment_2years" boolean NOT NULL,
	"substance_abuse_treatment" boolean NOT NULL,
	"cardiovascular_events_3years" boolean NOT NULL,
	"cancer_respiratory_liver_3years" boolean NOT NULL,
	"neurological_conditions_3years" boolean NOT NULL,
	"covid_question" boolean NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_number" varchar(100) NOT NULL,
	"routing_number" varchar(100) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"banking_comments" text,
	"status" integer NOT NULL,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads_assigned_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"assigned_by_user_id" integer NOT NULL,
	"assigned_to_user_id" integer NOT NULL,
	"old_assigned_to" integer,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "leads_status_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"old_status" integer,
	"new_status" integer NOT NULL,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_name" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leads_statuses_status_name_unique" UNIQUE("status_name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(1) NOT NULL,
	"description" varchar(255),
	"status" varchar(1) DEFAULT 'A' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"role_id" integer,
	"assigned_ip" varchar(45),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"activity_description" text NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_status_leads_statuses_id_fk" FOREIGN KEY ("status") REFERENCES "public"."leads_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_assigned_tracking" ADD CONSTRAINT "leads_assigned_tracking_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_assigned_tracking" ADD CONSTRAINT "leads_assigned_tracking_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_assigned_tracking" ADD CONSTRAINT "leads_assigned_tracking_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_assigned_tracking" ADD CONSTRAINT "leads_assigned_tracking_old_assigned_to_users_id_fk" FOREIGN KEY ("old_assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_comments" ADD CONSTRAINT "leads_comments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_comments" ADD CONSTRAINT "leads_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_status_tracking" ADD CONSTRAINT "leads_status_tracking_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_status_tracking" ADD CONSTRAINT "leads_status_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_status_tracking" ADD CONSTRAINT "leads_status_tracking_old_status_leads_statuses_id_fk" FOREIGN KEY ("old_status") REFERENCES "public"."leads_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_status_tracking" ADD CONSTRAINT "leads_status_tracking_new_status_leads_statuses_id_fk" FOREIGN KEY ("new_status") REFERENCES "public"."leads_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_activities" ADD CONSTRAINT "users_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;