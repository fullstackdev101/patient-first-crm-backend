import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

console.log('🔐 JWT Security initialized');
console.log(`   Token expiry: ${JWT_EXPIRES_IN}`);

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT token
 */
export const generateToken = (payload) => {
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
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
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
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
