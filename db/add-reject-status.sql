-- Add 'Reject' status and rename 'Manage Review' to 'Manager Review'

BEGIN;

-- 1. Rename 'Manage Review' to 'Manager Review'
UPDATE leads_statuses 
SET status_name = 'Manager Review'
WHERE id = 2 AND status_name = 'Manage Review';

-- 2. Add new 'Reject' status
-- Insert after 'Pending' (sort_order 6)
INSERT INTO leads_statuses (status_name, description, sort_order, status)
VALUES ('Reject', 'Lead has been rejected', 6, 'active');

-- Verify the changes
SELECT id, status_name, description, sort_order, status 
FROM leads_statuses 
ORDER BY sort_order ASC;

COMMIT;

-- Display summary
SELECT 
    'Status updates completed successfully' as message,
    COUNT(*) as total_statuses
FROM leads_statuses;
