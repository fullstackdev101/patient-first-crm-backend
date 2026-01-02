-- Reset leads_statuses table with clean sequential IDs
-- Goal: Same statuses, same order, but 'Reject' should be ID 7

BEGIN;

-- Step 1: Insert new statuses with temporary IDs and temporary unique names
INSERT INTO leads_statuses (id, status_name, description, sort_order, status) VALUES
(101, 'TEMP_New', 'New lead, not yet processed', 1, 'active'),
(102, 'TEMP_Manager_Review', 'Lead is under management review', 2, 'active'),
(103, 'TEMP_QA_Review', 'Lead is under quality assurance review', 3, 'active'),
(104, 'TEMP_Approved', 'Lead has been approved', 4, 'active'),
(105, 'TEMP_Pending', 'Lead is pending further action', 5, 'active'),
(107, 'TEMP_Reject', 'Lead has been rejected', 7, 'active');

-- Step 2: Update leads to use new temporary IDs
UPDATE leads SET status = 101 WHERE status = 1;
UPDATE leads SET status = 102 WHERE status = 2;
UPDATE leads SET status = 103 WHERE status = 3;
UPDATE leads SET status = 104 WHERE status = 4;
UPDATE leads SET status = 105 WHERE status = 5;
UPDATE leads SET status = 107 WHERE status = 8;

-- Step 3: Update status tracking history
UPDATE leads_status_tracking SET old_status = 101 WHERE old_status = 1;
UPDATE leads_status_tracking SET new_status = 101 WHERE new_status = 1;
UPDATE leads_status_tracking SET old_status = 102 WHERE old_status = 2;
UPDATE leads_status_tracking SET new_status = 102 WHERE new_status = 2;
UPDATE leads_status_tracking SET old_status = 103 WHERE old_status = 3;
UPDATE leads_status_tracking SET new_status = 103 WHERE new_status = 3;
UPDATE leads_status_tracking SET old_status = 104 WHERE old_status = 4;
UPDATE leads_status_tracking SET new_status = 104 WHERE new_status = 4;
UPDATE leads_status_tracking SET old_status = 105 WHERE old_status = 5;
UPDATE leads_status_tracking SET new_status = 105 WHERE new_status = 5;
UPDATE leads_status_tracking SET old_status = 107 WHERE old_status = 8;
UPDATE leads_status_tracking SET new_status = 107 WHERE new_status = 8;

-- Step 4: Delete old statuses (now safe since no references)
DELETE FROM leads_statuses WHERE id IN (1, 2, 3, 4, 5, 8);

-- Step 5: Insert final statuses with correct IDs
INSERT INTO leads_statuses (id, status_name, description, sort_order, status) VALUES
(1, 'New', 'New lead, not yet processed', 1, 'active'),
(2, 'Manager Review', 'Lead is under management review', 2, 'active'),
(3, 'QA Review', 'Lead is under quality assurance review', 3, 'active'),
(4, 'Approved', 'Lead has been approved', 4, 'active'),
(5, 'Pending', 'Lead is pending further action', 5, 'active'),
(7, 'Reject', 'Lead has been rejected', 7, 'active');

-- Step 6: Update leads to final IDs
UPDATE leads SET status = 1 WHERE status = 101;
UPDATE leads SET status = 2 WHERE status = 102;
UPDATE leads SET status = 3 WHERE status = 103;
UPDATE leads SET status = 4 WHERE status = 104;
UPDATE leads SET status = 5 WHERE status = 105;
UPDATE leads SET status = 7 WHERE status = 107;

-- Step 7: Update status tracking history to final IDs
UPDATE leads_status_tracking SET old_status = 1 WHERE old_status = 101;
UPDATE leads_status_tracking SET new_status = 1 WHERE new_status = 101;
UPDATE leads_status_tracking SET old_status = 2 WHERE old_status = 102;
UPDATE leads_status_tracking SET new_status = 2 WHERE new_status = 102;
UPDATE leads_status_tracking SET old_status = 3 WHERE old_status = 103;
UPDATE leads_status_tracking SET new_status = 3 WHERE new_status = 103;
UPDATE leads_status_tracking SET old_status = 4 WHERE old_status = 104;
UPDATE leads_status_tracking SET new_status = 4 WHERE new_status = 104;
UPDATE leads_status_tracking SET old_status = 5 WHERE old_status = 105;
UPDATE leads_status_tracking SET new_status = 5 WHERE new_status = 105;
UPDATE leads_status_tracking SET old_status = 7 WHERE old_status = 107;
UPDATE leads_status_tracking SET new_status = 7 WHERE new_status = 107;

-- Step 8: Delete temporary statuses (now safe)
DELETE FROM leads_statuses WHERE id IN (101, 102, 103, 104, 105, 107);

-- Verify the changes
SELECT id, status_name, description, sort_order, status 
FROM leads_statuses 
ORDER BY id ASC;

COMMIT;

-- Display summary
SELECT 
    'Statuses reset successfully' as message,
    COUNT(*) as total_statuses
FROM leads_statuses;
