-- Add assigned_ip column to users table

ALTER TABLE users 
ADD COLUMN assigned_ip VARCHAR(45);

-- Add foreign key constraint to ip_access_control
ALTER TABLE users
ADD CONSTRAINT fk_users_assigned_ip 
FOREIGN KEY (assigned_ip) 
REFERENCES ip_access_control(ip_address)
ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_users_assigned_ip ON users(assigned_ip);
