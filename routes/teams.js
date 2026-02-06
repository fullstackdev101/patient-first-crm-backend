import { db } from '../db/index.js';
import { teams } from '../db/schema.js';
import { eq, ilike, or, asc, desc, sql } from 'drizzle-orm';
import { getNowCentral } from '../utils/datetime.js';

export default async function teamsRoutes(fastify, options) {
    // Get all teams with search, filtering, and pagination
    fastify.get('/', async (request, reply) => {
        try {
            const { search, status, page = 1, limit = 10 } = request.query;

            // Calculate offset for pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Build WHERE conditions
            const conditions = [];

            if (search) {
                conditions.push(
                    or(
                        ilike(teams.team_name, `%${search}%`),
                        ilike(teams.description, `%${search}%`)
                    )
                );
            }

            if (status && status !== 'all') {
                conditions.push(eq(teams.status, status));
            }

            // Get total count
            const countQuery = conditions.length > 0
                ? db.select({ count: sql`count(*)` }).from(teams).where(sql`${sql.join(conditions, sql` AND `)}`

                )
                : db.select({ count: sql`count(*)` }).from(teams);

            const countResult = await countQuery;
            const total = parseInt(countResult[0].count);

            // Get teams with pagination
            let query = db.select().from(teams);

            if (conditions.length > 0) {
                query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
            }

            const teamsList = await query
                .orderBy(asc(teams.sort_order), asc(teams.team_name))
                .limit(parseInt(limit))
                .offset(offset);

            return {
                success: true,
                data: {
                    teams: teamsList,
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            console.error('Error fetching teams:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch teams',
                error: error.message
            });
        }
    });

    // Get single team by ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const team = await db.select()
                .from(teams)
                .where(eq(teams.id, parseInt(id)))
                .limit(1);

            if (team.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'Team not found'
                });
            }

            return {
                success: true,
                data: team[0]
            };
        } catch (error) {
            console.error('Error fetching team:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch team',
                error: error.message
            });
        }
    });

    // Create new team
    fastify.post('/', async (request, reply) => {
        try {
            const { team_name, description, status, sort_order } = request.body;

            // Validate required fields
            if (!team_name) {
                return reply.status(400).send({
                    success: false,
                    message: 'Team name is required'
                });
            }

            // Get created_by from authenticated user
            const userId = request.user?.id || 1;

            // Create team
            const newTeam = await db.insert(teams)
                .values({
                    team_name,
                    description: description || null,
                    status: status || 'active',
                    sort_order: sort_order !== undefined ? parseInt(sort_order) : 0,
                    created_by: userId,
                    created_at: getNowCentral(),
                    updated_at: getNowCentral()
                })
                .returning();

            return {
                success: true,
                message: 'Team created successfully',
                data: newTeam[0]
            };
        } catch (error) {
            console.error('Error creating team:', error);

            // Handle unique constraint violation
            if (error.code === '23505') {
                return reply.status(400).send({
                    success: false,
                    message: 'Team name already exists'
                });
            }

            return reply.status(500).send({
                success: false,
                message: 'Failed to create team',
                error: error.message
            });
        }
    });

    // Update team
    fastify.put('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { team_name, description, status, sort_order } = request.body;

            // Check if team exists
            const existingTeam = await db.select()
                .from(teams)
                .where(eq(teams.id, parseInt(id)))
                .limit(1);

            if (existingTeam.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'Team not found'
                });
            }

            // Build update data
            const updateData = {};
            if (team_name !== undefined) updateData.team_name = team_name;
            if (description !== undefined) updateData.description = description;
            if (status !== undefined) updateData.status = status;
            if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);

            // Always update updated_at
            updateData.updated_at = getNowCentral();

            // Update team
            const updatedTeam = await db.update(teams)
                .set(updateData)
                .where(eq(teams.id, parseInt(id)))
                .returning();

            return {
                success: true,
                message: 'Team updated successfully',
                data: updatedTeam[0]
            };
        } catch (error) {
            console.error('Error updating team:', error);

            // Handle unique constraint violation
            if (error.code === '23505') {
                return reply.status(400).send({
                    success: false,
                    message: 'Team name already exists'
                });
            }

            return reply.status(500).send({
                success: false,
                message: 'Failed to update team',
                error: error.message
            });
        }
    });

    // Delete team
    fastify.delete('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            // Check if team exists
            const existingTeam = await db.select()
                .from(teams)
                .where(eq(teams.id, parseInt(id)))
                .limit(1);

            if (existingTeam.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'Team not found'
                });
            }

            // Delete team
            await db.delete(teams)
                .where(eq(teams.id, parseInt(id)));

            return {
                success: true,
                message: 'Team deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting team:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to delete team',
                error: error.message
            });
        }
    });
}
