-- Update Lead Statuses Migration Script
-- Current state (from image):
-- ID 1: Entry
-- ID 6: New (already exists)
-- ID 7: Rejected (to be deleted)
-- ID 8: (to be renumbered to 7)
--
-- Goal:
-- 1. Keep ID 1 but rename from 'Entry' to 'New'
-- 2. Remove ID 6 (duplicate 'New')
-- 3. Remove ID 7 ('Rejected')
-- 4. Renumber ID 8 to ID 7

-- Start transaction for safety
BEGIN;

-- Step 1: Move any leads using status 6 (New) to status 1 (Entry, will be renamed to New)
DO $$
DECLARE
    count_status_6 INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_status_6 FROM leads WHERE status = 6;
    RAISE NOTICE 'Leads with status 6 (New): %', count_status_6;
    
    IF count_status_6 > 0 THEN
        UPDATE leads SET status = 1 WHERE status = 6;
        RAISE NOTICE 'Moved % leads from status 6 to status 1', count_status_6;
    END IF;
END $$;

-- Step 2: Update status tracking history - replace status 6 with status 1
UPDATE leads_status_tracking SET old_status = 1 WHERE old_status = 6;
UPDATE leads_status_tracking SET new_status = 1 WHERE new_status = 6;

-- Step 3: Delete status ID 6 (duplicate 'New')
DELETE FROM leads_statuses WHERE id = 6;

-- Step 4: Now rename ID 1 from 'Entry' to 'New'
UPDATE leads_statuses 
SET status_name = 'New',
    description = 'New lead, not yet processed'
WHERE id = 1;

-- Step 5: Handle status 7 and 8
DO $$
DECLARE
    count_status_7 INTEGER;
    count_status_8 INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_status_7 FROM leads WHERE status = 7;
    SELECT COUNT(*) INTO count_status_8 FROM leads WHERE status = 8;
    
    RAISE NOTICE 'Leads with status 7: %', count_status_7;
    RAISE NOTICE 'Leads with status 8: %', count_status_8;
    
    -- Move any leads using status 7 to status 1 (New)
    IF count_status_7 > 0 THEN
        UPDATE leads SET status = 1 WHERE status = 7;
        RAISE NOTICE 'Moved % leads from status 7 to status 1', count_status_7;
    END IF;
    
    -- Temporarily move leads using status 8 to a safe status (status 1)
    IF count_status_8 > 0 THEN
        UPDATE leads SET status = 1 WHERE status = 8;
        RAISE NOTICE 'Temporarily moved % leads from status 8 to status 1', count_status_8;
    END IF;
END $$;

-- Step 6: Update status tracking history for status 7 and 8
UPDATE leads_status_tracking SET old_status = 1 WHERE old_status = 7;
UPDATE leads_status_tracking SET new_status = 1 WHERE new_status = 7;
UPDATE leads_status_tracking SET old_status = 1 WHERE old_status = 8;
UPDATE leads_status_tracking SET new_status = 1 WHERE new_status = 8;

-- Step 7: Delete status ID 7
DELETE FROM leads_statuses WHERE id = 7;

-- Step 8: Renumber status ID 8 to ID 7 (if ID 8 exists)
UPDATE leads_statuses SET id = 7 WHERE id = 8;

-- Verify the changes
SELECT id, status_name, description, sort_order, status 
FROM leads_statuses 
ORDER BY sort_order ASC;

-- Commit the transaction
COMMIT;

-- Display summary
SELECT 
    'Migration completed successfully' as message,
    COUNT(*) as total_statuses
FROM leads_statuses;
