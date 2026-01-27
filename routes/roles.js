import pool from '../config/db.js';

export default async function rolesRoutes(fastify, options) {
    // GET /api/roles - Get all roles
    fastify.get('/', async (request, reply) => {
        try {
            const result = await pool.query(
                'SELECT id, role, description, status FROM roles WHERE status = $1 ORDER BY id ASC',
                ['Active']
            );

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch roles',
                error: error.message
            });
        }
    });

    // GET /api/roles/:id - Get single role
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const result = await pool.query(
                'SELECT id, role, description, status FROM roles WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return reply.status(404).send({
                    success: false,
                    message: 'Role not found'
                });
            }

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch role',
                error: error.message
            });
        }
    });
}
