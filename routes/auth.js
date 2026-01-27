import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from '../utils/jwt.js';

export default async function authRoutes(fastify, options) {
    // Login endpoint
    fastify.post('/login', async (request, reply) => {
        try {
            const { username, password } = request.body;

            if (!username || !password) {
                return reply.code(400).send({
                    success: false,
                    message: 'Username and password are required'
                });
            }

            // Get client IP address
            const clientIP = request.headers['x-forwarded-for']?.split(',')[0].trim() ||
                request.headers['x-real-ip'] ||
                request.ip ||
                request.socket.remoteAddress;

            console.log('═══════════════════════════════════════════════════════');
            console.log('🔐 LOGIN ATTEMPT');
            console.log('📅 Timestamp:', new Date().toISOString());
            console.log('👤 Username:', username);
            console.log('🌐 IP Address:', clientIP);
            console.log('═══════════════════════════════════════════════════════');

            // Find user by username with role using Drizzle ORM
            const userResult = await db.select({
                id: users.id,
                name: users.name,
                username: users.username,
                email: users.email,
                password: users.password,
                status: users.status,
                role_id: users.role_id,
                role: sql`TRIM(${roles.role})`.as('role'),
                assigned_ip: users.assigned_ip
            })
                .from(users)
                .leftJoin(roles, eq(users.role_id, roles.id))
                .where(eq(users.username, username))
                .limit(1);

            if (userResult.length === 0) {
                console.log('❌ LOGIN FAILED - Invalid username');
                console.log('🌐 IP Address:', clientIP);
                console.log('═══════════════════════════════════════════════════════');
                return reply.code(401).send({
                    success: false,
                    message: 'Invalid credentials',
                    errorType: 'INVALID_CREDENTIALS'
                });
            }

            const user = userResult[0];

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                console.log('❌ LOGIN FAILED - Invalid password');
                console.log('🌐 IP Address:', clientIP);
                console.log('═══════════════════════════════════════════════════════');
                return reply.code(401).send({
                    success: false,
                    message: 'Invalid credentials',
                    errorType: 'INVALID_CREDENTIALS'
                });
            }

            // Check user status (trim whitespace)
            const userStatus = user.status?.trim();
            if (userStatus !== 'Active' && userStatus !== 'A') {
                console.log('❌ LOGIN FAILED - Account inactive');
                console.log('🌐 IP Address:', clientIP);
                console.log('📊 Account Status:', userStatus);
                console.log('═══════════════════════════════════════════════════════');
                return reply.code(403).send({
                    success: false,
                    message: 'Account is not active',
                    errorType: 'ACCOUNT_INACTIVE'
                });
            }

            // IP Access Control Check - Role-Based Enforcement
            const AGENT_ROLE_ID = 3; // Agent role
            const QA_REVIEW_ROLE_ID = 5; // QA Review role (was incorrectly set to 8)
            const isAgent = user.role_id === AGENT_ROLE_ID;
            const isQAReview = user.role_id === QA_REVIEW_ROLE_ID;
            const requiresIPCheck = isAgent || isQAReview;

            console.log('🔍 IP Check Debug:');
            console.log('   User role_id:', user.role_id);
            console.log('   User role:', user.role?.trim());
            console.log('   isAgent:', isAgent);
            console.log('   isQAReview:', isQAReview);
            console.log('   requiresIPCheck:', requiresIPCheck);
            console.log('   assigned_ip:', user.assigned_ip || 'NOT SET');

            // Normalize IPs for comparison (handle IPv4 and IPv6)
            const normalizeIP = (ip) => {
                // Remove IPv6 prefix if present (::ffff:)
                if (ip.startsWith('::ffff:')) {
                    return ip.substring(7);
                }
                // Handle localhost variations
                if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
                    return '127.0.0.1';
                }
                return ip;
            };

            // AGENT & QA REVIEW ROLES: Must have assigned IP and it must match
            if (requiresIPCheck) {
                const roleName = isAgent ? 'Agent' : 'QA Review';

                if (!user.assigned_ip) {
                    console.log(`❌ LOGIN FAILED - ${roleName} without assigned IP`);
                    console.log('👤 Username:', username);
                    console.log('🌐 Login IP:', clientIP);
                    console.log(`⚠️  Reason: ${roleName} accounts require an assigned IP address`);
                    console.log('═══════════════════════════════════════════════════════');
                    return reply.code(403).send({
                        success: false,
                        message: `${roleName} accounts require an assigned IP address. Please contact your administrator.`,
                        errorType: 'IP_NOT_ASSIGNED'
                    });
                }

                // Role has assigned IP - validate it matches
                const normalizedClientIP = normalizeIP(clientIP);
                const normalizedAssignedIP = normalizeIP(user.assigned_ip);

                console.log(`🔍 ${roleName} IP Validation - Client:`, normalizedClientIP, 'Assigned:', normalizedAssignedIP);

                if (normalizedClientIP !== normalizedAssignedIP) {
                    console.log(`❌ LOGIN FAILED - ${roleName} IP Mismatch`);
                    console.log('👤 Username:', username);
                    console.log('🌐 Client IP:', normalizedClientIP);
                    console.log('🔒 Assigned IP:', normalizedAssignedIP);
                    console.log('═══════════════════════════════════════════════════════');
                    return reply.code(403).send({
                        success: false,
                        message: `Access denied: IP address not authorized for this ${roleName} account`,
                        errorType: 'IP_RESTRICTED',
                        details: {
                            clientIP: normalizedClientIP,
                            assignedIP: normalizedAssignedIP
                        }
                    });
                }

                console.log(`✅ ${roleName} IP Validated Successfully`);
            }
            // NON-AGENT ROLES: Only check IP if assigned_ip exists
            else if (user.assigned_ip) {
                const normalizedClientIP = normalizeIP(clientIP);
                const normalizedAssignedIP = normalizeIP(user.assigned_ip);

                console.log('🔍 IP Validation - Client:', normalizedClientIP, 'Assigned:', normalizedAssignedIP);

                if (normalizedClientIP !== normalizedAssignedIP) {
                    console.log('❌ LOGIN FAILED - IP Restricted');
                    console.log('🌐 Client IP:', normalizedClientIP);
                    console.log('🔒 Assigned IP:', normalizedAssignedIP);
                    console.log('═══════════════════════════════════════════════════════');
                    return reply.code(403).send({
                        success: false,
                        message: 'Access denied: IP address not authorized',
                        errorType: 'IP_RESTRICTED',
                        details: {
                            clientIP: normalizedClientIP,
                            assignedIP: normalizedAssignedIP
                        }
                    });
                }
            }

            // Generate JWT token
            const token = generateToken({
                id: user.id,
                username: user.username,
                email: user.email,
                role_id: user.role_id
            });

            console.log('✅ LOGIN SUCCESSFUL');
            console.log('👤 User:', user.name);
            console.log('📧 Email:', user.email);
            console.log('🌐 IP Address:', clientIP);
            console.log('═══════════════════════════════════════════════════════');

            return {
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email,
                        role_id: user.role_id,
                        role: user.role, // Include role name
                        status: user.status
                    },
                    token
                }
            };
        } catch (error) {
            console.error('Login error:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error',
                errorType: 'SERVER_ERROR'
            });
        }
    });

    // Verify token endpoint
    fastify.post('/verify', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.code(401).send({
                    success: false,
                    message: 'No token provided'
                });
            }

            const token = authHeader.substring(7);

            // Verify JWT token
            const decoded = verifyToken(token);

            if (!decoded) {
                return reply.code(401).send({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Fetch user from database with role using Drizzle
            const userResult = await db.select({
                id: users.id,
                name: users.name,
                username: users.username,
                email: users.email,
                role_id: users.role_id,
                role: sql`TRIM(${roles.role})`.as('role'),
                status: users.status,
            }).from(users)
                .leftJoin(roles, eq(users.role_id, roles.id))
                .where(eq(users.id, decoded.id))
                .limit(1);

            if (userResult.length === 0) {
                return reply.code(401).send({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = userResult[0];

            // Check if user is still active
            const userStatus = user.status?.trim();
            if (userStatus !== 'Active' && userStatus !== 'A') {
                return reply.code(403).send({
                    success: false,
                    message: 'Account is not active'
                });
            }

            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email,
                        role_id: user.role_id,
                        role: user.role, // Include role name
                        status: user.status
                    }
                }
            };
        } catch (error) {
            console.error('Token verification error:', error);
            return reply.code(401).send({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    });
}
