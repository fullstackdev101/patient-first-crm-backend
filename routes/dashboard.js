import { db } from '../db/index.js';
import { leads, leadsStatuses } from '../db/schema.js';
import { eq, sql, and, gte } from 'drizzle-orm';

export default async function dashboardRoutes(fastify, options) {
    // Get dashboard statistics
    fastify.get('/stats', {
        preHandler: fastify.authenticateUser
    }, async (request, reply) => {
        try {
            const currentUser = request.user;
            const userRole = currentUser?.role?.trim();

            console.log('🔍 Dashboard Stats - Current User:', currentUser);
            console.log('🔍 Dashboard Stats - User Role:', userRole);
            console.log('🔍 Dashboard Stats - User ID:', currentUser?.id);

            // Base query conditions
            let whereCondition = null;

            // If user is an Agent, filter by created_by
            if (userRole === 'Agent' && currentUser?.id) {
                whereCondition = eq(leads.created_by, currentUser.id);
                console.log('✅ Dashboard Stats - Agent detected, filtering by created_by:', currentUser.id);
            } else {
                console.log('ℹ️ Dashboard Stats - Not an Agent or no user ID, showing all leads');
            }

            // Get total leads count
            let totalLeadsQuery = db
                .select({ count: sql`count(*)::int` })
                .from(leads);

            if (whereCondition) {
                totalLeadsQuery = totalLeadsQuery.where(whereCondition);
                console.log('✅ Applied whereCondition to totalLeadsQuery');
            }

            const totalLeadsResult = await totalLeadsQuery;
            const totalLeads = totalLeadsResult[0]?.count || 0;
            console.log('📊 Total Leads Result:', totalLeadsResult);
            console.log('📊 Total Leads Count:', totalLeads);

            // Get status IDs for specific statuses
            const statusesData = await db
                .select()
                .from(leadsStatuses)
                .where(eq(leadsStatuses.status, 'active'));

            // Create status name to ID mapping
            const statusMap = {};
            statusesData.forEach(status => {
                statusMap[status.status_name] = status.id;
            });

            // Get counts by status with role-based filtering
            const buildStatusQuery = (statusId) => {
                let query = db
                    .select({ count: sql`count(*)::int` })
                    .from(leads);

                if (whereCondition) {
                    // Combine status filter AND whereCondition
                    query = query.where(and(eq(leads.status, statusId), whereCondition));
                } else {
                    // Only status filter
                    query = query.where(eq(leads.status, statusId));
                }
                return query;
            };

            const pendingCount = await buildStatusQuery(statusMap['Pending'] || 5);
            const qaCount = await buildStatusQuery(statusMap['QA Review'] || 3);
            const rejectedCount = await buildStatusQuery(statusMap['Rejected'] || 7);
            const approvedCount = await buildStatusQuery(statusMap['Approved'] || 4);

            // Get monthly approved leads for the last 12 months
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            let monthlyQuery = sql`
                SELECT 
                    TO_CHAR(created_at, 'Mon') as month,
                    EXTRACT(MONTH FROM created_at)::int as month_num,
                    COUNT(*)::int as count
                FROM leads
                WHERE status = ${statusMap['Approved'] || 4}
                    AND created_at >= ${twelveMonthsAgo.toISOString()}`;

            if (whereCondition && userRole === 'Agent') {
                monthlyQuery = sql`${monthlyQuery} AND created_by = ${currentUser.id}`;
            }

            monthlyQuery = sql`${monthlyQuery}
                GROUP BY month, month_num
                ORDER BY month_num`;

            const monthlyApprovedResult = await db.execute(monthlyQuery);

            // Create array for all 12 months with counts
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            const monthlyData = [];

            for (let i = 0; i < 12; i++) {
                const monthIndex = (currentMonth - 11 + i + 12) % 12;
                const monthName = monthNames[monthIndex];

                // Find count for this month
                const monthData = monthlyApprovedResult.rows.find(row => row.month === monthName);
                monthlyData.push({
                    month: monthName,
                    count: monthData?.count || 0
                });
            }

            return {
                success: true,
                data: {
                    totalLeads,
                    pending: pendingCount[0]?.count || 0,
                    qaReview: qaCount[0]?.count || 0,
                    rejected: rejectedCount[0]?.count || 0,
                    approved: approvedCount[0]?.count || 0,
                    monthlyApproved: monthlyData
                }
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch dashboard statistics',
                error: error.message
            });
        }
    });
}
