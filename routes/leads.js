import { db } from '../db/index.js';
import { leads, leadsStatusTracking, leadsAssignedTracking, leadsStatuses, users, roles } from '../db/schema.js';
import { eq, like, or, desc, count, sql } from 'drizzle-orm';
import { logActivity, ACTIVITY_TYPES } from '../utils/activityLogger.js';
import { authenticateUser } from '../utils/authMiddleware.js';

export default async function leadsRoutes(fastify, options) {
    // Add authentication middleware to all routes
    fastify.addHook('onRequest', authenticateUser);
    // Get all leads with optional filtering and pagination
    fastify.get('/', async (request, reply) => {
        try {
            const { status, search, page = 1, limit = 5 } = request.query;

            // Get authenticated user info
            const currentUser = request.user;
            const userRole = currentUser?.role?.trim();

            // Build query with joins
            let query = db.select({
                id: leads.id,
                first_name: leads.first_name,
                last_name: leads.last_name,
                middle_initial: leads.middle_initial,
                date_of_birth: leads.date_of_birth,
                phone: leads.phone,
                email: leads.email,
                address: leads.address,
                state_of_birth: leads.state_of_birth,
                ssn: leads.ssn,
                status: leadsStatuses.status_name, // Get status name instead of ID
                status_id: leads.status, // Keep ID for filtering
                assigned_to: users.username, // Get agent name instead of ID
                assigned_to_id: leads.assigned_to, // Keep ID for reference
                assigned_to_role: sql`${roles.role}`.as('assigned_to_role'), // Get role from roles table
                created_at: leads.created_at,
                updated_at: leads.updated_at
            })
                .from(leads)
                .leftJoin(leadsStatuses, eq(leads.status, leadsStatuses.id))
                .leftJoin(users, eq(leads.assigned_to, users.id))
                .leftJoin(roles, eq(users.role_id, roles.id));

            let countQuery = db.select({ count: count() }).from(leads);

            // Role-based filtering: Agents can only see their assigned leads
            if (userRole === 'Agent' && currentUser?.id) {
                query = query.where(eq(leads.assigned_to, currentUser.id));
                countQuery = countQuery.where(eq(leads.assigned_to, currentUser.id));
            }

            // Apply status filter if provided
            if (status && status !== 'All Statuses' && status !== 'All') {
                query = query.where(eq(leadsStatuses.status_name, status));
                countQuery = countQuery
                    .leftJoin(leadsStatuses, eq(leads.status, leadsStatuses.id))
                    .where(eq(leadsStatuses.status_name, status));
            }

            // Apply search filter if provided
            if (search) {
                const searchCondition = or(
                    like(leads.first_name, `%${search}%`),
                    like(leads.last_name, `%${search}%`),
                    like(leads.email, `%${search}%`),
                    like(leads.phone, `%${search}%`)
                );
                query = query.where(searchCondition);
                countQuery = countQuery.where(searchCondition);
            }

            // Get total count
            const totalResult = await countQuery;
            const total = totalResult[0]?.count || 0;

            // Apply pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query = query.limit(parseInt(limit)).offset(offset);

            // Order by most recent first
            const allLeads = await query.orderBy(desc(leads.created_at));

            // Debug: Log first lead to verify role_id is included
            if (allLeads.length > 0) {
                console.log('Sample lead data:', {
                    id: allLeads[0].id,
                    assigned_to: allLeads[0].assigned_to,
                    assigned_to_id: allLeads[0].assigned_to_id,
                    assigned_to_role_id: allLeads[0].assigned_to_role_id
                });
            }

            return {
                success: true,
                data: {
                    leads: allLeads,
                    total: total,
                    pagination: {
                        total: total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            };
        } catch (error) {
            console.error('Error fetching leads:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch leads'
            });
        }
    });

    // Get single lead by ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            // Validate ID is a number
            const leadId = parseInt(id);
            if (isNaN(leadId)) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid lead ID - must be a number'
                });
            }

            const lead = await db.select()
                .from(leads)
                .where(eq(leads.id, leadId))
                .limit(1);

            if (lead.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'Lead not found'
                });
            }

            // Role-based access: Agents can only view their assigned leads
            const currentUser = request.user;
            const userRole = currentUser?.role?.trim();
            if (userRole === 'Agent' && lead[0].assigned_to !== currentUser?.id) {
                return reply.code(403).send({
                    success: false,
                    message: 'Access denied: You can only view leads assigned to you'
                });
            }

            return {
                success: true,
                data: lead[0]
            };
        } catch (error) {
            console.error('Error fetching lead:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch lead'
            });
        }
    });

    // Create new lead
    fastify.post('/', async (request, reply) => {
        try {
            const leadData = request.body;

            // Map directly - expecting snake_case from frontend
            const dbLead = {
                first_name: leadData.first_name,
                last_name: leadData.last_name,
                middle_initial: leadData.middle_initial || null,
                date_of_birth: leadData.date_of_birth,
                phone: leadData.phone,
                email: leadData.email,
                address: leadData.address,
                state_of_birth: leadData.state_of_birth,
                ssn: leadData.ssn,
                height: leadData.height || null,
                weight: leadData.weight || null,
                insurance_provider: leadData.insurance_provider || null,
                policy_number: leadData.policy_number || null,
                medical_notes: leadData.medical_notes || null,
                doctor_name: leadData.doctor_name || null,
                doctor_phone: leadData.doctor_phone || null,
                doctor_address: leadData.doctor_address || null,
                beneficiary_details: leadData.beneficiary_details,
                plan_details: leadData.plan_details,

                // Handle health questionnaire - accept both boolean and string values
                // If already boolean, use it; if string 'yes'/'no', convert; otherwise default to false
                hospitalized_nursing_oxygen_cancer_assistance: typeof leadData.hospitalized_nursing_oxygen_cancer_assistance === 'boolean' ? leadData.hospitalized_nursing_oxygen_cancer_assistance : leadData.hospitalized_nursing_oxygen_cancer_assistance === 'yes' ? true : false,
                organ_transplant_terminal_condition: typeof leadData.organ_transplant_terminal_condition === 'boolean' ? leadData.organ_transplant_terminal_condition : leadData.organ_transplant_terminal_condition === 'yes' ? true : false,
                aids_hiv_immune_deficiency: typeof leadData.aids_hiv_immune_deficiency === 'boolean' ? leadData.aids_hiv_immune_deficiency : leadData.aids_hiv_immune_deficiency === 'yes' ? true : false,
                diabetes_complications_insulin: typeof leadData.diabetes_complications_insulin === 'boolean' ? leadData.diabetes_complications_insulin : leadData.diabetes_complications_insulin === 'yes' ? true : false,
                kidney_disease_multiple_cancers: typeof leadData.kidney_disease_multiple_cancers === 'boolean' ? leadData.kidney_disease_multiple_cancers : leadData.kidney_disease_multiple_cancers === 'yes' ? true : false,
                pending_tests_surgery_hospitalization: typeof leadData.pending_tests_surgery_hospitalization === 'boolean' ? leadData.pending_tests_surgery_hospitalization : leadData.pending_tests_surgery_hospitalization === 'yes' ? true : false,
                angina_stroke_lupus_copd_hepatitis: typeof leadData.angina_stroke_lupus_copd_hepatitis === 'boolean' ? leadData.angina_stroke_lupus_copd_hepatitis : leadData.angina_stroke_lupus_copd_hepatitis === 'yes' ? true : false,
                heart_attack_aneurysm_surgery: typeof leadData.heart_attack_aneurysm_surgery === 'boolean' ? leadData.heart_attack_aneurysm_surgery : leadData.heart_attack_aneurysm_surgery === 'yes' ? true : false,
                cancer_treatment_2years: typeof leadData.cancer_treatment_2years === 'boolean' ? leadData.cancer_treatment_2years : leadData.cancer_treatment_2years === 'yes' ? true : false,
                substance_abuse_treatment: typeof leadData.substance_abuse_treatment === 'boolean' ? leadData.substance_abuse_treatment : leadData.substance_abuse_treatment === 'yes' ? true : false,
                cardiovascular_events_3years: typeof leadData.cardiovascular_events_3years === 'boolean' ? leadData.cardiovascular_events_3years : leadData.cardiovascular_events_3years === 'yes' ? true : false,
                cancer_respiratory_liver_3years: typeof leadData.cancer_respiratory_liver_3years === 'boolean' ? leadData.cancer_respiratory_liver_3years : leadData.cancer_respiratory_liver_3years === 'yes' ? true : false,
                neurological_conditions_3years: typeof leadData.neurological_conditions_3years === 'boolean' ? leadData.neurological_conditions_3years : leadData.neurological_conditions_3years === 'yes' ? true : false,

                covid_question: typeof leadData.covid_question === 'boolean' ? leadData.covid_question : leadData.covid_question === 'yes' ? true : false,

                bank_name: leadData.bank_name,
                account_name: leadData.account_name,
                account_number: leadData.account_number,
                routing_number: leadData.routing_number,
                account_type: leadData.account_type,
                banking_comments: leadData.banking_comments || null,
                status: leadData.status ? parseInt(leadData.status) : 6, // Default to 'New' (id: 6)
                assigned_to: leadData.assigned_to ? parseInt(leadData.assigned_to) : null
            };

            console.log(dbLead);

            // Insert new lead
            const newLead = await db.insert(leads)
                .values(dbLead)
                .returning();

            // Log activity
            const userId = leadData.created_by || 1; // Default to user 1 if not provided
            await logActivity({
                userId,
                activityType: ACTIVITY_TYPES.LEAD_CREATED,
                description: `created new lead for ${newLead[0].first_name} ${newLead[0].last_name}`,
                entityType: 'lead',
                entityId: newLead[0].id
            });

            return reply.code(201).send({
                success: true,
                message: 'Lead created successfully',
                data: newLead[0]
            });
        } catch (error) {
            console.error('Error creating lead:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to create lead'
            });
        }
    });

    // Update lead
    fastify.put('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const updateData = request.body;

            // Debug: Check authentication at start of PUT request
            console.log('🔐 PUT /leads/:id - Auth check:');
            console.log('   Authorization header:', request.headers.authorization ? 'Present' : 'Missing');
            console.log('   request.user:', request.user);
            console.log('   User ID:', request.user?.id);

            // Check if lead exists
            const existingLead = await db.select()
                .from(leads)
                .where(eq(leads.id, parseInt(id)))
                .limit(1);

            if (existingLead.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'Lead not found'
                });
            }

            // Role-based access control for Agents
            const currentUser = request.user;
            const userRole = currentUser?.role?.trim();

            if (userRole === 'Agent') {
                // Agents can only edit leads assigned to them
                if (existingLead[0].assigned_to !== currentUser?.id) {
                    return reply.code(403).send({
                        success: false,
                        message: 'Access denied: You can only edit leads assigned to you'
                    });
                }

                // Agents can only edit leads with "New" status (status_id = 6)
                // Get the status name to check
                const leadStatus = await db.select({ status_name: leadsStatuses.status_name })
                    .from(leadsStatuses)
                    .where(eq(leadsStatuses.id, existingLead[0].status))
                    .limit(1);

                if (leadStatus[0]?.status_name !== 'New') {
                    return reply.code(403).send({
                        success: false,
                        message: 'Access denied: Agents can only edit leads with "New" status'
                    });
                }
            }

            // Check if status changed
            const oldStatus = existingLead[0].status;
            const newStatus = updateData.status;
            const statusChanged = oldStatus !== newStatus;

            // Check if assignment changed
            const oldAssignedTo = existingLead[0].assigned_to;
            const newAssignedTo = updateData.assigned_to;
            const assignmentChanged = oldAssignedTo !== newAssignedTo;

            // Update lead
            updateData.updated_at = new Date();

            const updatedLead = await db.update(leads)
                .set(updateData)
                .where(eq(leads.id, parseInt(id)))
                .returning();

            // Track status change if status was updated
            if (statusChanged && updateData.user_id) {
                try {
                    await db.insert(leadsStatusTracking).values({
                        lead_id: parseInt(id),
                        user_id: parseInt(updateData.user_id),
                        old_status: oldStatus,
                        new_status: newStatus,
                    });
                    console.log(`Status tracking logged: ${oldStatus} -> ${newStatus}`);
                } catch (trackingError) {
                    console.error('Error logging status tracking:', trackingError);
                    // Don't fail the update if tracking fails
                }
            }

            // Track assignment change if assigned_to was updated
            if (assignmentChanged && updateData.user_id && newAssignedTo) {
                try {
                    await db.insert(leadsAssignedTracking).values({
                        lead_id: parseInt(id),
                        assigned_by_user_id: parseInt(updateData.user_id),
                        assigned_to_user_id: parseInt(newAssignedTo),
                        old_assigned_to: oldAssignedTo ? parseInt(oldAssignedTo) : null,
                    });
                    console.log(`Assignment tracking logged: ${oldAssignedTo} -> ${newAssignedTo}`);
                } catch (trackingError) {
                    console.error('Error logging assignment tracking:', trackingError);
                    // Don't fail the update if tracking fails
                }
            }

            // Log activity for lead update
            console.log('🔍 DEBUG: Checking activity logging...');
            console.log('🔍 Authenticated user from JWT:', request.user);
            console.log('🔍 statusChanged:', statusChanged);
            console.log('🔍 assignmentChanged:', assignmentChanged);

            // Get user_id from JWT token (authenticated user)
            const activityUserId = request.user?.id || 1;

            if (!request.user) {
                console.log('⚠️  WARNING: No authenticated user from JWT, using fallback user_id: 1');
            } else {
                console.log('✅ Using authenticated user_id from JWT:', activityUserId, '-', request.user.username);
            }

            // Log general update
            await logActivity({
                userId: activityUserId,
                activityType: ACTIVITY_TYPES.LEAD_UPDATED,
                description: `updated lead information for ${updatedLead[0].first_name} ${updatedLead[0].last_name}`,
                entityType: 'lead',
                entityId: parseInt(id)
            });
            console.log('✅ Lead update activity logged');

            // Log status change specifically
            if (statusChanged) {
                await logActivity({
                    userId: activityUserId,
                    activityType: ACTIVITY_TYPES.LEAD_STATUS_CHANGED,
                    description: `changed status of lead ${updatedLead[0].first_name} ${updatedLead[0].last_name}`,
                    entityType: 'lead',
                    entityId: parseInt(id)
                });
                console.log('✅ Status change activity logged');
            }

            // Log assignment change specifically
            if (assignmentChanged) {
                await logActivity({
                    userId: activityUserId,
                    activityType: ACTIVITY_TYPES.LEAD_ASSIGNED,
                    description: `assigned lead ${updatedLead[0].first_name} ${updatedLead[0].last_name} to agent`,
                    entityType: 'lead',
                    entityId: parseInt(id)
                });
                console.log('✅ Assignment change activity logged');
            }

            return {
                success: true,
                message: 'Lead updated successfully',
                data: updatedLead[0]
            };
        } catch (error) {
            console.error('Error updating lead:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to update lead'
            });
        }
    });

    // Delete lead
    fastify.delete('/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            const deletedLead = await db.delete(leads)
                .where(eq(leads.id, parseInt(id)))
                .returning({ id: leads.id });

            if (deletedLead.length === 0) {
                return reply.code(404).send({
                    success: false,
                    message: 'Lead not found'
                });
            }

            return {
                success: true,
                message: 'Lead deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting lead:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to delete lead'
            });
        }
    });
}
