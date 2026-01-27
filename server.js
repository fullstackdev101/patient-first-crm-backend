import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import usersRoutes from './routes/users.js';
import statusesRoutes from './routes/statuses.js';
import rolesRoutes from './routes/roles.js';
import commentsRoutes from './routes/comments.js';
import statusTrackingRoutes from './routes/statusTracking.js';
import dashboardRoutes from './routes/dashboard.js';
import activitiesRoutes from './routes/activities.js';
import ipAccessRoutes from './routes/ipAccess.js';

// Import database
import { testConnection } from './config/db.js';

// Import middleware
import { authenticateUser } from './utils/authMiddleware.js';

// Load environment variables
dotenv.config();

const fastify = Fastify({
    logger: true
});

// Register plugins
await fastify.register(cors, {
    origin: ['http://localhost:3000', 'https://patient-first-crm-frontend.vercel.app'], // Frontend URLs
    credentials: true
});

await fastify.register(formbody);

// Register authenticateUser as a decorator
fastify.decorate('authenticateUser', authenticateUser);

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(leadsRoutes, { prefix: '/api/leads' });
await fastify.register(usersRoutes, { prefix: '/api/users' });
await fastify.register(statusesRoutes, { prefix: '/api/statuses' });
await fastify.register(rolesRoutes, { prefix: '/api/roles' });
await fastify.register(commentsRoutes, { prefix: '/api/leads' });
await fastify.register(statusTrackingRoutes, { prefix: '/api' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
// Activities: Read-only (GET endpoints only, no creation)
await fastify.register(activitiesRoutes, { prefix: '/api/activities' });
await fastify.register(ipAccessRoutes, { prefix: '/api/ip-access' });

// Health check route
fastify.get('/health', async (request, reply) => {
    return { status: 'ok', message: 'PatientFirst CRM Backend is running' };
});

// Start server
const start = async () => {
    try {
        // Test database connection
        await testConnection();

        const port = process.env.PORT || 3001;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Server running on http://localhost:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
