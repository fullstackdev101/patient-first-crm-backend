import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export default async function ipAccessRoutes(fastify, options) {
    // Get all IP access records
    fastify.get('/', async (request, reply) => {
        try {
            const result = await db.execute(sql`
                SELECT 
                    id, 
                    ip_address, 
                    location, 
                    details, 
                    status, 
                    created_by,
                    created_at, 
                    updated_at
                FROM ip_access_control
                ORDER BY created_at DESC
            `);

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            console.error('Error fetching IP access records:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch IP access records',
                error: error.message
            });
        }
    });

    // Get single IP access record by ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const result = await db.execute(sql`
                SELECT 
                    id, 
                    ip_address, 
                    location, 
                    details, 
                    status, 
                    created_by,
                    created_at, 
                    updated_at
                FROM ip_access_control
                WHERE id = ${id}
            `);

            if (result.rows.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'IP access record not found'
                });
            }

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            console.error('Error fetching IP access record:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch IP access record',
                error: error.message
            });
        }
    });

    // Create new IP access record
    fastify.post('/', async (request, reply) => {
        try {
            const { ip_address, location, details, status = 'active' } = request.body;

            // Validate IP address
            if (!ip_address) {
                return reply.status(400).send({
                    success: false,
                    message: 'IP address is required'
                });
            }

            // Basic IP validation (IPv4 and IPv6)
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

            if (!ipv4Regex.test(ip_address) && !ipv6Regex.test(ip_address)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid IP address format'
                });
            }

            // For IPv4, validate range (0-255)
            if (ipv4Regex.test(ip_address)) {
                const octets = ip_address.split('.');
                const invalidOctet = octets.some(octet => parseInt(octet) > 255);
                if (invalidOctet) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Invalid IPv4 address: octets must be 0-255'
                    });
                }
            }

            // Check if IP already exists
            const existingIP = await db.execute(sql`
                SELECT id FROM ip_access_control WHERE ip_address = ${ip_address}
            `);

            if (existingIP.rows.length > 0) {
                return reply.status(409).send({
                    success: false,
                    message: 'IP address already exists'
                });
            }

            const result = await db.execute(sql`
                INSERT INTO ip_access_control (ip_address, location, details, status)
                VALUES (${ip_address}, ${location || null}, ${details || null}, ${status})
                RETURNING id, ip_address, location, details, status, created_at, updated_at
            `);

            return reply.status(201).send({
                success: true,
                message: 'IP access record created successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error creating IP access record:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to create IP access record',
                error: error.message
            });
        }
    });

    // Update IP access record
    fastify.put('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { ip_address, location, details, status } = request.body;

            // Check if record exists
            const existing = await db.execute(sql`
                SELECT id FROM ip_access_control WHERE id = ${id}
            `);

            if (existing.rows.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'IP access record not found'
                });
            }

            // Validate IP if provided
            if (ip_address) {
                const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

                if (!ipv4Regex.test(ip_address) && !ipv6Regex.test(ip_address)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Invalid IP address format'
                    });
                }

                if (ipv4Regex.test(ip_address)) {
                    const octets = ip_address.split('.');
                    const invalidOctet = octets.some(octet => parseInt(octet) > 255);
                    if (invalidOctet) {
                        return reply.status(400).send({
                            success: false,
                            message: 'Invalid IPv4 address: octets must be 0-255'
                        });
                    }
                }

                // Check if new IP already exists (excluding current record)
                const duplicateIP = await db.execute(sql`
                    SELECT id FROM ip_access_control 
                    WHERE ip_address = ${ip_address} AND id != ${id}
                `);

                if (duplicateIP.rows.length > 0) {
                    return reply.status(409).send({
                        success: false,
                        message: 'IP address already exists'
                    });
                }
            }

            const result = await db.execute(sql`
                UPDATE ip_access_control
                SET 
                    ip_address = COALESCE(${ip_address}, ip_address),
                    location = COALESCE(${location}, location),
                    details = COALESCE(${details}, details),
                    status = COALESCE(${status}, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${id}
                RETURNING id, ip_address, location, details, status, created_at, updated_at
            `);

            return {
                success: true,
                message: 'IP access record updated successfully',
                data: result.rows[0]
            };
        } catch (error) {
            console.error('Error updating IP access record:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to update IP access record',
                error: error.message
            });
        }
    });

    // Delete IP access record
    fastify.delete('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            // Check if record exists
            const existing = await db.execute(sql`
                SELECT id FROM ip_access_control WHERE id = ${id}
            `);

            if (existing.rows.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'IP access record not found'
                });
            }

            await db.execute(sql`
                DELETE FROM ip_access_control WHERE id = ${id}
            `);

            return {
                success: true,
                message: 'IP access record deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting IP access record:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to delete IP access record',
                error: error.message
            });
        }
    });
}
