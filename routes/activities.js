import { db } from '../db/index.js';
import { usersActivities, users } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function activitiesRoutes(fastify, options) {
    // Get recent activities
    fastify.get('/recent', async (request, reply) => {
        try {
            const { limit = 20 } = request.query;

            const activities = await db
                .select({
                    id: usersActivities.id,
                    activity_type: usersActivities.activity_type,
                    activity_description: usersActivities.activity_description,
                    entity_type: usersActivities.entity_type,
                    entity_id: usersActivities.entity_id,
                    created_at: usersActivities.created_at,
                    user_id: usersActivities.user_id,
                    user_name: users.name,
                    user_email: users.email,
                })
                .from(usersActivities)
                .leftJoin(users, eq(usersActivities.user_id, users.id))
                .where(eq(usersActivities.status, 'active'))
                .orderBy(desc(usersActivities.created_at))
                .limit(parseInt(limit));

            return {
                success: true,
                data: activities
            };
        } catch (error) {
            console.error('Error fetching activities:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch activities',
                error: error.message
            });
        }
    });

    // Get activities by user
    fastify.get('/user/:userId', async (request, reply) => {
        try {
            const { userId } = request.params;
            const { limit = 50 } = request.query;

            const activities = await db
                .select()
                .from(usersActivities)
                .where(eq(usersActivities.user_id, parseInt(userId)))
                .orderBy(desc(usersActivities.created_at))
                .limit(parseInt(limit));

            return {
                success: true,
                data: activities
            };
        } catch (error) {
            console.error('Error fetching user activities:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch user activities',
                error: error.message
            });
        }
    });

    // Get activities by entity
    fastify.get('/entity/:entityType/:entityId', async (request, reply) => {
        try {
            const { entityType, entityId } = request.params;

            const activities = await db
                .select({
                    id: usersActivities.id,
                    activity_type: usersActivities.activity_type,
                    activity_description: usersActivities.activity_description,
                    created_at: usersActivities.created_at,
                    user_name: users.name,
                })
                .from(usersActivities)
                .leftJoin(users, eq(usersActivities.user_id, users.id))
                .where(eq(usersActivities.entity_type, entityType))
                .where(eq(usersActivities.entity_id, parseInt(entityId)))
                .orderBy(desc(usersActivities.created_at));

            return {
                success: true,
                data: activities
            };
        } catch (error) {
            console.error('Error fetching entity activities:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch entity activities',
                error: error.message
            });
        }
    });
}
