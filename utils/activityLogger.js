import { db } from '../db/index.js';
import { usersActivities } from '../db/schema.js';

/**
 * Log user activity to the database
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - ID of the user performing the activity
 * @param {string} params.activityType - Type of activity (e.g., 'lead_created', 'user_login')
 * @param {string} params.description - Human-readable description of the activity
 * @param {string} [params.entityType] - Type of entity affected (e.g., 'lead', 'user')
 * @param {number} [params.entityId] - ID of the affected entity
 * @param {string} [params.ipAddress] - IP address of the user
 * @param {string} [params.userAgent] - User agent string
 */
export async function logActivity({
    userId,
    activityType,
    description,
    entityType = null,
    entityId = null,
    ipAddress = null,
    userAgent = null
}) {
    try {
        const userActivity = {
            user_id: userId,
            activity_type: activityType,
            activity_description: description,
            entity_type: entityType,
            entity_id: entityId,
            ip_address: ipAddress,
            user_agent: userAgent,
            status: 'active'
        };

        // console.log(userActivity);

        await db.insert(usersActivities).values(userActivity);
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw error to prevent breaking the main operation
    }
}

/**
 * Activity type constants
 */
export const ACTIVITY_TYPES = {
    // Lead activities
    LEAD_CREATED: 'lead_created',
    LEAD_UPDATED: 'lead_updated',
    LEAD_DELETED: 'lead_deleted',
    LEAD_STATUS_CHANGED: 'lead_status_changed',
    LEAD_ASSIGNED: 'lead_assigned',

    // Comment activities
    COMMENT_ADDED: 'comment_added',
    COMMENT_UPDATED: 'comment_updated',
    COMMENT_DELETED: 'comment_deleted',

    // User activities
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
};
