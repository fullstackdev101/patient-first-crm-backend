import { db } from '../db/index.js';
import { leadsStatusTracking, leadsStatuses } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export default async function statusTrackingRoutes(fastify, options) {
    // Get status tracking history for a lead
    fastify.get('/leads/:leadId/status-history', async (request, reply) => {
        try {
            const { leadId } = request.params;

            // Use raw SQL to get status names via joins
            const history = await db.execute(sql`
                SELECT 
                    lst.id,
                    lst.lead_id,
                    lst.user_id,
                    lst.old_status as old_status_id,
                    lst.new_status as new_status_id,
                    old_s.status_name as old_status_name,
                    new_s.status_name as new_status_name,
                    lst.changed_at
                FROM leads_status_tracking lst
                LEFT JOIN leads_statuses old_s ON lst.old_status = old_s.id
                INNER JOIN leads_statuses new_s ON lst.new_status = new_s.id
                WHERE lst.lead_id = ${parseInt(leadId)}
                ORDER BY lst.changed_at DESC
            `);

            return {
                success: true,
                data: history.rows
            };
        } catch (error) {
            console.error('Error fetching status history:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch status history',
                error: error.message
            });
        }
    });

    // Add status tracking entry (used internally by leads update)
    fastify.post('/leads/:leadId/status-tracking', async (request, reply) => {
        try {
            const { leadId } = request.params;
            const { user_id, old_status, new_status } = request.body;

            if (!user_id || !new_status) {
                return reply.status(400).send({
                    success: false,
                    message: 'user_id and new_status are required'
                });
            }

            const [tracking] = await db
                .insert(leadsStatusTracking)
                .values({
                    lead_id: parseInt(leadId),
                    user_id: parseInt(user_id),
                    old_status: old_status || null,
                    new_status: new_status,
                })
                .returning();

            return {
                success: true,
                data: tracking
            };
        } catch (error) {
            console.error('Error creating status tracking:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to create status tracking',
                error: error.message
            });
        }
    });
}
