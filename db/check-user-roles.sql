-- Check current user roles
SELECT id, name, username, role_id FROM users ORDER BY id;

-- Example: Update faisal to Manager (role_id = 2)
-- UPDATE users SET role_id = 2 WHERE username = 'faisal';

-- Example: Update john.smith to Admin (role_id = 1)  
-- UPDATE users SET role_id = 1 WHERE username = 'john.smith';

-- Role IDs:
-- 1 = Admin
-- 2 = Manager
-- 3 = Agent
-- 4 = QA
-- 5 = Reviewer
