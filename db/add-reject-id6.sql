-- Add 'Reject' status as ID 6 (sequential)

BEGIN;

-- Simply add 'Reject' status with ID 6
INSERT INTO leads_statuses (id, status_name, description, sort_order, status)
VALUES (6, 'Reject', 'Lead has been rejected', 6, 'active');

-- Verify the changes
SELECT id, status_name, description, sort_order, status 
FROM leads_statuses 
ORDER BY id ASC;

COMMIT;

-- Display summary
SELECT 
    'Reject status added successfully' as message,
    COUNT(*) as total_statuses
FROM leads_statuses;
