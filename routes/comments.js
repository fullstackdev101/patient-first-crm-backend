import { db } from '../db/index.js';
import { leadsComments, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export default async function commentsRoutes(fastify, options) {
    // Get all comments for a lead
    fastify.get('/:leadId/comments', async (request, reply) => {
        try {
            const { leadId } = request.params;

            const comments = await db
                .select({
                    id: leadsComments.id,
                    lead_id: leadsComments.lead_id,
                    user_id: leadsComments.user_id,
                    comment: leadsComments.comment,
                    created_at: leadsComments.created_at,
                    updated_at: leadsComments.updated_at,
                    user_name: users.name,
                })
                .from(leadsComments)
                .leftJoin(users, eq(leadsComments.user_id, users.id))
                .where(eq(leadsComments.lead_id, parseInt(leadId)))
                .orderBy(desc(leadsComments.created_at));

            return {
                success: true,
                data: comments
            };
        } catch (error) {
            console.error('Error fetching comments:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch comments',
                error: error.message
            });
        }
    });

    // Add a new comment to a lead
    fastify.post('/:leadId/comments', async (request, reply) => {
        try {
            const { leadId } = request.params;
            const { comment, user_id } = request.body;

            if (!comment || !user_id) {
                return reply.status(400).send({
                    success: false,
                    message: 'Comment and user_id are required'
                });
            }

            const [newComment] = await db
                .insert(leadsComments)
                .values({
                    lead_id: parseInt(leadId),
                    user_id: parseInt(user_id),
                    comment: comment,
                })
                .returning();

            // Fetch the comment with user info
            const [commentWithUser] = await db
                .select({
                    id: leadsComments.id,
                    lead_id: leadsComments.lead_id,
                    user_id: leadsComments.user_id,
                    comment: leadsComments.comment,
                    created_at: leadsComments.created_at,
                    updated_at: leadsComments.updated_at,
                    user_name: users.name,
                })
                .from(leadsComments)
                .leftJoin(users, eq(leadsComments.user_id, users.id))
                .where(eq(leadsComments.id, newComment.id));

            return {
                success: true,
                message: 'Comment added successfully',
                data: commentWithUser
            };
        } catch (error) {
            console.error('Error adding comment:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to add comment',
                error: error.message
            });
        }
    });
}
