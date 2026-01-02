import { db } from '../db/index.js';
import { leadsStatuses } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function statusesRoutes(fastify, options) {
    // Get all active statuses
    fastify.get('/', async (request, reply) => {
        try {
            const statuses = await db
                .select()
                .from(leadsStatuses)
                .where(eq(leadsStatuses.status, 'active'))
                .orderBy(asc(leadsStatuses.sort_order));

            return {
                success: true,
                data: statuses
            };
        } catch (error) {
            console.error('Error fetching statuses:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch statuses',
                error: error.message
            });
        }
    });
}
