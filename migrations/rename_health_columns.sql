-- Migration: Rename health questionnaire columns to descriptive names
-- This migration renames all health_q* columns to descriptive names that match the medical conditions

ALTER TABLE leads 
  RENAME COLUMN health_q1 TO hospitalized_nursing_oxygen_cancer_assistance;

ALTER TABLE leads 
  RENAME COLUMN health_q2 TO organ_transplant_terminal_condition;

ALTER TABLE leads 
  RENAME COLUMN health_q3 TO aids_hiv_immune_deficiency;

ALTER TABLE leads 
  RENAME COLUMN health_q4 TO diabetes_complications_insulin;

ALTER TABLE leads 
  RENAME COLUMN health_q5 TO kidney_disease_multiple_cancers;

ALTER TABLE leads 
  RENAME COLUMN health_q6 TO pending_tests_surgery_hospitalization;

ALTER TABLE leads 
  RENAME COLUMN health_q7a TO angina_stroke_lupus_copd_hepatitis;

ALTER TABLE leads 
  RENAME COLUMN health_q7b TO heart_attack_aneurysm_surgery;

ALTER TABLE leads 
  RENAME COLUMN health_q7c TO cancer_treatment_2years;

ALTER TABLE leads 
  RENAME COLUMN health_q7d TO substance_abuse_treatment;

ALTER TABLE leads 
  RENAME COLUMN health_q8a TO cardiovascular_events_3years;

ALTER TABLE leads 
  RENAME COLUMN health_q8b TO cancer_respiratory_liver_3years;

ALTER TABLE leads 
  RENAME COLUMN health_q8c TO neurological_conditions_3years;
