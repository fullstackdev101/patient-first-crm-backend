-- Update 'Reject' to 'Rejected' in leads_statuses table

UPDATE leads_statuses 
SET status_name = 'Rejected' 
WHERE status_name = 'Reject';
