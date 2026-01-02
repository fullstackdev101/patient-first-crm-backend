-- Create roles table if it doesn't exist

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default roles if they don't exist
INSERT INTO roles (id, name) VALUES 
    (1, 'Admin'),
    (2, 'Manager'),
    (3, 'Agent'),
    (4, 'QA'),
    (5, 'Reviewer')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to ensure next insert starts from 6
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
