-- Migration: Add encrypted columns for sensitive fields
-- Date: 2026-03-18
-- This adds three nullable TEXT columns to store AES-256-GCM encrypted values.
-- Existing plain-text columns are NOT removed; data migration is handled separately.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ssn_enc TEXT,
  ADD COLUMN IF NOT EXISTS account_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS routing_number_enc TEXT;
