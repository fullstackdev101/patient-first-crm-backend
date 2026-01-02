-- Create IP Access Control table

CREATE TABLE IF NOT EXISTS ip_access_control (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE, -- Supports both IPv4 and IPv6
    location VARCHAR(255),
    details TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_ip_address ON ip_access_control(ip_address);
CREATE INDEX idx_status ON ip_access_control(status);

-- Add comment
COMMENT ON TABLE ip_access_control IS 'Stores IP addresses allowed to access the CRM system';
