import { db } from '../db/index.js';
import { leads, leadsStatuses, users, teams } from '../db/schema.js';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { authenticateUser } from '../utils/authMiddleware.js';

export default async function reportsRoutes(fastify, options) {
    // Add authentication middleware to all routes
    fastify.addHook('onRequest', authenticateUser);

    // Role-based access control middleware for reports
    const checkReportsAccess = async (request, reply) => {
        console.log('🔍 Reports Access Check - request.user:', request.user);
        console.log('🔍 Reports Access Check - role_id:', request.user?.role_id);

        // Check if user is authenticated
        if (!request.user) {
            console.log('❌ Access denied - User not authenticated (token invalid or expired)');
            return reply.code(401).send({
                success: false,
                message: 'Authentication required. Please log out and log back in.'
            });
        }

        const userRoleId = request.user.role_id;
        // Only Super Admin (1), Admin (2), and QA Manager (6) can access reports
        if (![1, 2, 6].includes(userRoleId)) {
            console.log('❌ Access denied - role_id:', userRoleId, 'is not in allowed roles [1, 2, 6]');
            return reply.code(403).send({
                success: false,
                message: 'Access denied: You do not have permission to view reports'
            });
        }
        console.log('✅ Access granted - role_id:', userRoleId);
    };

    // Daily Report - Last 10 days performance
    fastify.get('/daily', async (request, reply) => {
        try {
            // Check access
            await checkReportsAccess(request, reply);
            if (reply.sent) return;

            // Calculate date 10 days ago
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];

            // Get status IDs dynamically from database (like dashboard does)
            const statusesData = await db
                .select()
                .from(leadsStatuses)
                .where(eq(leadsStatuses.status, 'active'));

            // Create status name to ID mapping
            const statusMap = {};
            statusesData.forEach(status => {
                statusMap[status.status_name] = status.id;
            });

            const approvedStatusId = statusMap['Approved'] || 4;
            const rejectedStatusId = statusMap['Reject'] || statusMap['Rejected'] || 7;

            console.log('🔍 Status Map:', statusMap);
            console.log('✅ Approved Status ID:', approvedStatusId);
            console.log('✅ Rejected Status ID:', rejectedStatusId);

            // DIAGNOSTIC: Check what status values exist in the database
            const statusCheck = await db.select({
                status: leads.status,
                count: sql`COUNT(*)::int`.as('count')
            })
                .from(leads)
                .groupBy(leads.status)
                .orderBy(leads.status);

            console.log('🔍 DIAGNOSTIC - All status values in leads table:', JSON.stringify(statusCheck, null, 2));

            // Query to get daily aggregated data
            const dailyData = await db.select({
                date: sql`CAST(${leads.created_at} AS DATE)`.as('date'),
                totalLeads: sql`COUNT(*)::int`.as('totalLeads'),
                approved: sql`COUNT(CASE WHEN ${leads.status} = ${approvedStatusId} THEN 1 END)::int`.as('approved'),
                rejected: sql`COUNT(CASE WHEN ${leads.status} = ${rejectedStatusId} THEN 1 END)::int`.as('rejected'),
                other: sql`COUNT(CASE WHEN ${leads.status} NOT IN (${approvedStatusId}, ${rejectedStatusId}) THEN 1 END)::int`.as('other')
            })
                .from(leads)
                .where(sql`CAST(${leads.created_at} AS DATE) >= CAST(${tenDaysAgoStr} AS DATE)`)
                .groupBy(sql`CAST(${leads.created_at} AS DATE)`)
                .orderBy(desc(sql`CAST(${leads.created_at} AS DATE)`));

            console.log('🔍 Raw Daily Data from DB:', JSON.stringify(dailyData, null, 2));

            // Calculate conversion rates
            const reportData = dailyData.map(row => ({
                date: row.date,
                totalLeads: row.totalLeads,
                approved: row.approved,
                rejected: row.rejected,
                other: row.other,
                conversionRate: row.totalLeads > 0
                    ? ((row.approved / row.totalLeads) * 100).toFixed(1)
                    : '0.0'
            }));

            console.log('📊 Daily Report Data:', JSON.stringify(reportData, null, 2));

            return {
                success: true,
                data: reportData
            };
        } catch (error) {
            console.error('Error fetching daily report:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch daily report'
            });
        }
    });

    // Agent-wise Report - Performance by agent
    fastify.get('/agent-wise', async (request, reply) => {
        try {
            // Check access
            await checkReportsAccess(request, reply);
            if (reply.sent) return;

            // Get status IDs dynamically from database
            const statusesData = await db
                .select()
                .from(leadsStatuses)
                .where(eq(leadsStatuses.status, 'active'));

            const statusMap = {};
            statusesData.forEach(status => {
                statusMap[status.status_name] = status.id;
            });

            const approvedStatusId = statusMap['Approved'] || 4;
            const rejectedStatusId = statusMap['Reject'] || statusMap['Rejected'] || 7;

            // Query to get agent-wise aggregated data
            const agentData = await db.select({
                agentId: users.id,
                agentName: users.name,
                totalLeads: sql`COUNT(${leads.id})::int`.as('totalLeads'),
                approved: sql`COUNT(CASE WHEN ${leads.status} = ${approvedStatusId} THEN 1 END)::int`.as('approved'),
                rejected: sql`COUNT(CASE WHEN ${leads.status} = ${rejectedStatusId} THEN 1 END)::int`.as('rejected'),
                other: sql`COUNT(CASE WHEN ${leads.status} NOT IN (${approvedStatusId}, ${rejectedStatusId}) THEN 1 END)::int`.as('other')
            })
                .from(leads)
                .innerJoin(users, eq(leads.assigned_to, users.id))
                .groupBy(users.id, users.name)
                .orderBy(desc(sql`COUNT(${leads.id})`));

            // Calculate conversion rates
            const reportData = agentData.map(row => ({
                agentName: row.agentName,
                totalLeads: row.totalLeads,
                approved: row.approved,
                rejected: row.rejected,
                other: row.other,
                conversionRate: row.totalLeads > 0
                    ? ((row.approved / row.totalLeads) * 100).toFixed(1)
                    : '0.0'
            }));

            return {
                success: true,
                data: reportData
            };
        } catch (error) {
            console.error('Error fetching agent-wise report:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch agent-wise report'
            });
        }
    });

    // Team-wise Report - Performance by team
    fastify.get('/team-wise', async (request, reply) => {
        try {
            // Check access
            await checkReportsAccess(request, reply);
            if (reply.sent) return;

            // Get status IDs dynamically from database
            const statusesData = await db
                .select()
                .from(leadsStatuses)
                .where(eq(leadsStatuses.status, 'active'));

            const statusMap = {};
            statusesData.forEach(status => {
                statusMap[status.status_name] = status.id;
            });

            const approvedStatusId = statusMap['Approved'] || 4;
            const rejectedStatusId = statusMap['Reject'] || statusMap['Rejected'] || 7;

            // Query to get team-wise aggregated data
            const teamData = await db.select({
                teamId: teams.id,
                teamName: teams.team_name,
                totalLeads: sql`COUNT(${leads.id})::int`.as('totalLeads'),
                approved: sql`COUNT(CASE WHEN ${leads.status} = ${approvedStatusId} THEN 1 END)::int`.as('approved'),
                rejected: sql`COUNT(CASE WHEN ${leads.status} = ${rejectedStatusId} THEN 1 END)::int`.as('rejected'),
                other: sql`COUNT(CASE WHEN ${leads.status} NOT IN (${approvedStatusId}, ${rejectedStatusId}) THEN 1 END)::int`.as('other')
            })
                .from(leads)
                .innerJoin(teams, eq(leads.team_id, teams.id))
                .groupBy(teams.id, teams.team_name)
                .orderBy(desc(sql`COUNT(${leads.id})`));

            // Calculate conversion rates
            const reportData = teamData.map(row => ({
                teamName: row.teamName,
                totalLeads: row.totalLeads,
                approved: row.approved,
                rejected: row.rejected,
                other: row.other,
                conversionRate: row.totalLeads > 0
                    ? ((row.approved / row.totalLeads) * 100).toFixed(1)
                    : '0.0'
            }));

            return {
                success: true,
                data: reportData
            };
        } catch (error) {
            console.error('Error fetching team-wise report:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch team-wise report'
            });
        }
    });
}
