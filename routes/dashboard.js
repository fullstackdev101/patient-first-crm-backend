import { db } from '../db/index.js';
import { leads, leadsStatuses } from '../db/schema.js';
import { eq, sql, and, gte } from 'drizzle-orm';

export default async function dashboardRoutes(fastify, options) {
    // Get dashboard statistics
    fastify.get('/stats', async (request, reply) => {
        try {
            // Get total leads count
            const totalLeadsResult = await db
                .select({ count: sql`count(*)::int` })
                .from(leads);
            const totalLeads = totalLeadsResult[0]?.count || 0;

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

            // Get counts by status
            const pendingCount = await db
                .select({ count: sql`count(*)::int` })
                .from(leads)
                .where(eq(leads.status, statusMap['Pending'] || 5));

            const qaCount = await db
                .select({ count: sql`count(*)::int` })
                .from(leads)
                .where(eq(leads.status, statusMap['QA Review'] || 3));

            const rejectedCount = await db
                .select({ count: sql`count(*)::int` })
                .from(leads)
                .where(eq(leads.status, statusMap['Rejected'] || 7));

            const approvedCount = await db
                .select({ count: sql`count(*)::int` })
                .from(leads)
                .where(eq(leads.status, statusMap['Approved'] || 4));

            // Get monthly approved leads for the last 12 months
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const monthlyApprovedResult = await db.execute(sql`
                SELECT 
                    TO_CHAR(created_at, 'Mon') as month,
                    EXTRACT(MONTH FROM created_at)::int as month_num,
                    COUNT(*)::int as count
                FROM leads
                WHERE status = ${statusMap['Approved'] || 4}
                    AND created_at >= ${twelveMonthsAgo.toISOString()}
                GROUP BY month, month_num
                ORDER BY month_num
            `);

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
