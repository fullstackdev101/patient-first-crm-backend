-- Increase the role column width from 10 to 50 characters
ALTER TABLE roles ALTER COLUMN role TYPE VARCHAR(50);

-- Also increase description column width from 30 to 255 characters for better flexibility
ALTER TABLE roles ALTER COLUMN description TYPE VARCHAR(255);
