import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export default async function usersRoutes(fastify, options) {
    // Get all users
    fastify.get('/', async (request, reply) => {
        try {
            // Using raw SQL to join with roles table
            const result = await db.execute(`
                SELECT 
                    u.id,
                    u.name,
                    u.username,
                    u.email,
                    u.status,
                    u.role_id,
                    TRIM(r.role) as role,
                    u.assigned_ip,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.id
            `);

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            console.error('Error fetching users:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    });

    // Get single user by ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const user = await db.select({
                id: users.id,
                name: users.name,
                username: users.username,
                email: users.email,
                status: users.status,
                role_id: users.role_id,
                assigned_ip: users.assigned_ip,
                created_at: users.created_at,
                updated_at: users.updated_at,
            }).from(users).where(eq(users.id, parseInt(id)));

            if (user.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'User not found'
                });
            }

            return {
                success: true,
                data: user[0]
            };
        } catch (error) {
            console.error('Error fetching user:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch user'
            });
        }
    });

    // Create new user
    fastify.post('/', async (request, reply) => {
        try {
            const { name, username, email, password, status, role_id } = request.body;

            // Check if username or email already exists
            const existingUser = await db.select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            const existingEmail = await db.select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            if (existingUser.length > 0 || existingEmail.length > 0) {
                return reply.code(400).send({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const passwordToHash = password || 'password123';
            const hashedPassword = await bcrypt.hash(passwordToHash, 10);

            // Insert new user
            const newUser = await db.insert(users).values({
                name,
                username,
                email,
                password: hashedPassword,
                status: status || 'Active',
                role_id: role_id || 3,
            }).returning({
                id: users.id,
                name: users.name,
                username: users.username,
                email: users.email,
                status: users.status,
                role_id: users.role_id,
                created_at: users.created_at,
                updated_at: users.updated_at,
            });

            return reply.code(201).send({
                success: true,
                message: 'User created successfully',
                data: newUser[0]
            });
        } catch (error) {
            console.error('Error creating user:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to create user'
            });
        }
    });

    // Update user
    fastify.put('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { name, username, email, password, status, role_id } = request.body;

            // Check if user exists
            const existingUser = await db.select()
                .from(users)
                .where(eq(users.id, parseInt(id)))
                .limit(1);

            if (existingUser.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'User not found'
                });
            }

            // Build update object
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (username !== undefined) updateData.username = username;
            if (email !== undefined) updateData.email = email;
            if (status !== undefined) updateData.status = status;
            if (role_id !== undefined) updateData.role_id = role_id;
            if (request.body.assigned_ip !== undefined) updateData.assigned_ip = request.body.assigned_ip;

            // Hash password if provided
            if (password !== undefined && password !== '') {
                updateData.password = await bcrypt.hash(password, 10);
            }

            updateData.updated_at = new Date();

            // Update user
            const updatedUser = await db.update(users)
                .set(updateData)
                .where(eq(users.id, parseInt(id)))
                .returning({
                    id: users.id,
                    name: users.name,
                    username: users.username,
                    email: users.email,
                    status: users.status,
                    role_id: users.role_id,
                    created_at: users.created_at,
                    updated_at: users.updated_at,
                });

            return {
                success: true,
                message: 'User updated successfully',
                data: updatedUser[0]
            };
        } catch (error) {
            console.error('Error updating user:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to update user'
            });
        }
    });

    // Delete user
    fastify.delete('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const deletedUser = await db.delete(users)
                .where(eq(users.id, parseInt(id)))
                .returning({ id: users.id });

            if (deletedUser.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'User not found'
                });
            }

            return {
                success: true,
                message: 'User deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting user:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to delete user'
            });
        }
    });
}
