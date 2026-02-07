import { db, pool } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getNowCentral } from '../utils/datetime.js';

export default async function usersRoutes(fastify, options) {
    // Get all users with search and pagination
    fastify.get('/', async (request, reply) => {
        try {
            const { search, role_id, exclude_role, page = 1, limit = 10 } = request.query;

            // Get logged-in user's role from JWT token
            const authHeader = request.headers.authorization;
            let loggedInUserRoleId = null;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    const { verifyToken } = await import('../utils/jwt.js');
                    const decoded = verifyToken(token);

                    if (decoded && decoded.id) {
                        // Get user's role_id from database
                        const userResult = await db.select({
                            role_id: users.role_id
                        }).from(users).where(eq(users.id, decoded.id)).limit(1);

                        if (userResult.length > 0) {
                            loggedInUserRoleId = userResult[0].role_id;
                        }
                    }
                } catch (error) {
                    console.error('Error verifying token:', error);
                }
            }

            // Calculate offset for pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Build WHERE clause for search
            let whereClause = '';
            const params = [];
            let paramIndex = 1;

            if (search) {
                whereClause = `WHERE (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (role_id) {
                if (whereClause) {
                    whereClause += ` AND u.role_id = $${paramIndex}`;
                } else {
                    whereClause = `WHERE u.role_id = $${paramIndex}`;
                }
                params.push(parseInt(role_id));
                paramIndex++;
            }

            // Filter by team_id if provided
            if (request.query.team_id) {
                if (whereClause) {
                    whereClause += ` AND u.team_id = $${paramIndex}`;
                } else {
                    whereClause = `WHERE u.team_id = $${paramIndex}`;
                }
                params.push(parseInt(request.query.team_id));
                paramIndex++;
            }

            // Filter out users with excluded role
            if (exclude_role) {
                if (whereClause) {
                    whereClause += ` AND TRIM(r.role) != $${paramIndex}`;
                } else {
                    whereClause = `WHERE TRIM(r.role) != $${paramIndex}`;
                }
                params.push(exclude_role);
                paramIndex++;
            }

            // Filter out superadmin users (role_id = 1) if logged-in user is not superadmin
            if (loggedInUserRoleId !== 1) {
                if (whereClause) {
                    whereClause += ` AND u.role_id != 1`;
                } else {
                    whereClause = `WHERE u.role_id != 1`;
                }
            }

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ${whereClause}
            `;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            // Get paginated users
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.username,
                    u.email,
                    u.status,
                    u.role_id,
                    TRIM(r.role) as role,
                    u.team_id,
                    t.team_name,
                    u.assigned_ip,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN teams t ON u.team_id = t.id
                ${whereClause}
                ORDER BY u.id
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            return {
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            console.error('Error fetching users:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    });

    // Get all users without pagination (for dropdowns)
    fastify.get('/all', async (request, reply) => {
        try {
            // Get all users with their roles
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    TRIM(r.role) as role,
                    u.role_id
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.status = 'Active'
                ORDER BY u.name ASC
            `;

            const result = await pool.query(query);

            return {
                success: true,
                data: result.rows
            };
        } catch (error) {
            console.error('Error fetching all users:', error);
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
                team_id: users.team_id,
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
            const { name, username, email, password, status, role_id, team_id } = request.body;

            // Get logged-in user's ID from JWT token
            let createdByUserId = null;
            const authHeader = request.headers.authorization;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    const { verifyToken } = await import('../utils/jwt.js');
                    const decoded = verifyToken(token);

                    if (decoded && decoded.id) {
                        createdByUserId = decoded.id;
                    }
                } catch (error) {
                    console.error('Error verifying token:', error);
                }
            }

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
                team_id: team_id || null,
                created_by: createdByUserId,
            }).returning({
                id: users.id,
                name: users.name,
                username: users.username,
                email: users.email,
                status: users.status,
                role_id: users.role_id,
                team_id: users.team_id,
                created_by: users.created_by,
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
            const { name, username, email, password, status, role_id, team_id } = request.body;

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
            if (team_id !== undefined) updateData.team_id = team_id;
            if (request.body.assigned_ip !== undefined) updateData.assigned_ip = request.body.assigned_ip;

            // Hash password if provided
            if (password !== undefined && password !== '') {
                updateData.password = await bcrypt.hash(password, 10);
            }

            // Set Central Time timestamp
            updateData.updated_at = getNowCentral();

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

    // Change password for authenticated user
    fastify.put('/change-password', async (request, reply) => {
        try {
            const { newPassword } = request.body;

            // Get user from JWT token
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.code(401).send({
                    success: false,
                    message: 'No token provided'
                });
            }

            const token = authHeader.substring(7);
            const { verifyToken } = await import('../utils/jwt.js');
            const decoded = verifyToken(token);

            if (!decoded || !decoded.id) {
                return reply.code(401).send({
                    success: false,
                    message: 'Invalid token'
                });
            }

            // Validate input
            if (!newPassword) {
                return reply.code(400).send({
                    success: false,
                    message: 'New password is required'
                });
            }

            // Validate password strength
            if (newPassword.length < 6) {
                return reply.code(400).send({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }

            // Check for at least 1 special character
            const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
            if (!specialCharRegex.test(newPassword)) {
                return reply.code(400).send({
                    success: false,
                    message: 'Password must contain at least 1 special character'
                });
            }

            // Check for at least 1 number OR 1 letter
            const hasNumber = /\d/.test(newPassword);
            const hasLetter = /[a-zA-Z]/.test(newPassword);
            if (!hasNumber && !hasLetter) {
                return reply.code(400).send({
                    success: false,
                    message: 'Password must contain at least 1 number or letter'
                });
            }

            // Get user from database
            const userResult = await db.select({
                id: users.id
            }).from(users).where(eq(users.id, decoded.id)).limit(1);

            if (userResult.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'User not found'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password with Central Time timestamp
            await db.update(users)
                .set({
                    password: hashedPassword,
                    updated_at: getNowCentral()
                })
                .where(eq(users.id, decoded.id));

            return {
                success: true,
                message: 'Password changed successfully'
            };
        } catch (error) {
            console.error('Error changing password:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to change password'
            });
        }
    });
}
