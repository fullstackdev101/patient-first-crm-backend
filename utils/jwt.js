import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate a unique server instance ID on startup
// This will invalidate all existing tokens when the server restarts
const SERVER_INSTANCE_ID = crypto.randomBytes(16).toString('hex');

console.log('🔐 JWT Security initialized');
console.log(`   Token expiry: ${JWT_EXPIRES_IN}`);
console.log(`   Server instance ID: ${SERVER_INSTANCE_ID.substring(0, 8)}...`);

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT token
 */
export const generateToken = (payload) => {
    try {
        // Include server instance ID in token
        const tokenPayload = {
            ...payload,
            instanceId: SERVER_INSTANCE_ID
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
        return token;
    } catch (error) {
        console.error('Error generating JWT token:', error);
        throw new Error('Token generation failed');
    }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify server instance ID
        if (decoded.instanceId !== SERVER_INSTANCE_ID) {
            throw new Error('Token invalid: server restarted');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else if (error.message === 'Token invalid: server restarted') {
            throw new Error('Token invalid: server restarted. Please login again.');
        }
        throw new Error('Token verification failed');
    }
};

/**
 * Fastify middleware to verify JWT token
 */
export const authMiddleware = async (request, reply) => {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);

        // Attach user info to request
        request.user = decoded;

    } catch (error) {
        return reply.code(401).send({
            success: false,
            message: error.message || 'Invalid token'
        });
    }
};
