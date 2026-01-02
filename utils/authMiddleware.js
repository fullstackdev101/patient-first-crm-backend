import { verifyToken } from './jwt.js';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Authentication middleware that extracts user from JWT token
 * and attaches it to the request object
 */
export async function authenticateUser(request, reply) {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided - set user to null
            request.user = null;
            return;
        }

        const token = authHeader.substring(7);

        // Verify and decode JWT token
        const decoded = verifyToken(token);

        if (decoded) {
            // Fetch user with role from database
            const userResult = await db.select({
                id: users.id,
                username: users.username,
                email: users.email,
                role_id: users.role_id,
                role: roles.role
            })
                .from(users)
                .leftJoin(roles, eq(users.role_id, roles.id))
                .where(eq(users.id, decoded.id))
                .limit(1);

            if (userResult.length > 0) {
                // Attach user info to request with role
                request.user = {
                    id: userResult[0].id,
                    username: userResult[0].username,
                    email: userResult[0].email,
                    role_id: userResult[0].role_id,
                    role: userResult[0].role?.trim() // Trim role to remove padding
                };
                console.log('🔐 Authenticated user:', request.user.id, '-', request.user.username, '(', request.user.role, ')');
            } else {
                request.user = null;
            }
        } else {
            request.user = null;
        }
    } catch (error) {
        console.error('Authentication middleware error:', error);
        request.user = null;
    }
}

/**
 * Middleware that requires authentication
 * Use this for routes that must have a valid user
 */
export async function requireAuth(request, reply) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
            success: false,
            message: 'Authentication required'
        });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
        return reply.code(401).send({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    request.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role_id: decoded.role_id
    };
}
