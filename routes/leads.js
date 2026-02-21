import { db } from "../db/index.js";
import {
  leads,
  leadsStatusTracking,
  leadsAssignedTracking,
  leadsStatuses,
  users,
  roles,
  teams,
} from "../db/schema.js";
import { eq, like, or, and, desc, count, sql } from "drizzle-orm";
import { logActivity, ACTIVITY_TYPES } from "../utils/activityLogger.js";
import { authenticateUser } from "../utils/authMiddleware.js";
import { getNowCentral } from "../utils/datetime.js";

export default async function leadsRoutes(fastify, options) {
  // Add authentication middleware to all routes
  fastify.addHook("onRequest", authenticateUser);
  // Get all leads with optional filtering and pagination
  fastify.get("/", async (request, reply) => {
    try {
      const { status, search, page = 1, limit = 25 } = request.query;

      // Validate and normalize limit to prevent excessively large requests
      const maxLimit = 500;
      const normalizedLimit = Math.min(parseInt(limit) || 25, maxLimit);

      // Debug: Log all query parameters
      console.log("🔍 GET /leads - Query params:", {
        status,
        search,
        created_by: request.query.created_by,
        start_date: request.query.start_date,
        end_date: request.query.end_date,
        page,
        limit,
      });

      // Get authenticated user info
      const currentUser = request.user;
      const userRoleId = currentUser?.role_id;

      // Build query with joins - SELECT ALL FIELDS
      let query = db
        .select({
          // Basic Information
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

          // Medical Information
          height: leads.height,
          weight: leads.weight,
          insurance_provider: leads.insurance_provider,
          policy_number: leads.policy_number,
          medical_notes: leads.medical_notes,

          // Doctor Information
          doctor_name: leads.doctor_name,
          doctor_phone: leads.doctor_phone,
          doctor_address: leads.doctor_address,

          // Beneficiary & Plan Information
          beneficiary_details: leads.beneficiary_details,
          plan_details: leads.plan_details,
          quote_type: leads.quote_type,

          // Health Questionnaire
          hospitalized_nursing_oxygen_cancer_assistance:
            leads.hospitalized_nursing_oxygen_cancer_assistance,
          organ_transplant_terminal_condition:
            leads.organ_transplant_terminal_condition,
          aids_hiv_immune_deficiency: leads.aids_hiv_immune_deficiency,
          diabetes_complications_insulin: leads.diabetes_complications_insulin,
          kidney_disease_multiple_cancers:
            leads.kidney_disease_multiple_cancers,
          pending_tests_surgery_hospitalization:
            leads.pending_tests_surgery_hospitalization,
          angina_stroke_lupus_copd_hepatitis:
            leads.angina_stroke_lupus_copd_hepatitis,
          heart_attack_aneurysm_surgery: leads.heart_attack_aneurysm_surgery,
          cancer_treatment_2years: leads.cancer_treatment_2years,
          substance_abuse_treatment: leads.substance_abuse_treatment,
          cardiovascular_events_3years: leads.cardiovascular_events_3years,
          cancer_respiratory_liver_3years:
            leads.cancer_respiratory_liver_3years,
          neurological_conditions_3years: leads.neurological_conditions_3years,
          covid_question: leads.covid_question,
          health_comments: leads.health_comments,

          // Banking Information
          bank_name: leads.bank_name,
          account_name: leads.account_name,
          account_number: leads.account_number,
          routing_number: leads.routing_number,
          account_type: leads.account_type,
          banking_comments: leads.banking_comments,

          // Draft Fields
          initial_draft: leads.initial_draft,
          future_draft: leads.future_draft,

          // Metadata
          status: leadsStatuses.status_name, // Get status name instead of ID
          status_id: leads.status, // Keep ID for filtering
          // assigned_to: users.username, // Get agent name instead of ID
          // assigned_to_id: leads.assigned_to, // Keep ID for reference
          assigned_to_role: sql`${roles.role}`.as("assigned_to_role"), // Get role from roles table
          team_id: leads.team_id, // Team ID
          team_name: sql`lead_team.team_name`.as("team_name"), // Team name
          created_by_id: leads.created_by,
          created_by_name: sql`creator.name`.as("created_by_name"), // Get creator name
          created_at: leads.created_at,
          updated_at: leads.updated_at,
        })
        .from(leads)
        .leftJoin(leadsStatuses, eq(leads.status, leadsStatuses.id))
        .leftJoin(users, eq(leads.assigned_to, users.id))
        .leftJoin(roles, eq(users.role_id, roles.id))
        .leftJoin(sql`users AS creator`, sql`${leads.created_by} = creator.id`) // Join for creator
        .leftJoin(
          sql`teams AS lead_team`,
          sql`${leads.team_id} = lead_team.id`,
        ); // Join for lead's team

      let countQuery = db
        .select({ count: count() })
        .from(leads)
        .leftJoin(users, eq(leads.assigned_to, users.id)); // Add users join for team_id filter

      // Role-based filtering
      if (userRoleId === 3 && currentUser?.id) {
        // Agents (role_id: 3) see only leads they created
        query = query.where(eq(leads.created_by, currentUser.id));
        countQuery = countQuery.where(eq(leads.created_by, currentUser.id));
      }
      // All other roles see all leads (no filter applied at this stage)

      // Collect all filter conditions
      const conditions = [];
      const countConditions = [];

      // License Agent role-based status filter (must be in conditions array to combine with other filters)
      if (userRoleId === 4 && currentUser?.id) {
        // License Agents (role_id: 4) see all leads with status 8 (License Agent), regardless of assignment
        const licenseAgentStatusCondition = eq(leads.status, 8);
        conditions.push(licenseAgentStatusCondition);
        countConditions.push(licenseAgentStatusCondition);
        console.log(
          "✅ License Agent filter applied: status = 8 (all License Agent leads)",
        );
      }

      // QA Reviewer and QA Manager role-based status filter
      if (userRoleId === 5 && currentUser?.id) {
        // QA roles (role_id: 5) see only leads with status 1 (New) or 3 (QA Review)
        const qaStatusCondition = or(
          eq(leads.status, 1), // New
          eq(leads.status, 3), // QA Review
        );
        conditions.push(qaStatusCondition);
        countConditions.push(qaStatusCondition);
        console.log(
          "✅ QA role filter applied: status = 1 (New) or 3 (QA Review)",
        );
      }

      // User ID 5 restriction - exclude approved and rejected leads
      if (currentUser?.id === 5) {
        // Exclude status 5 (Approved) and status 7 (Rejected)
        const excludeApprovedCondition = sql`${leads.status} != 5`;
        const excludeRejectedCondition = sql`${leads.status} != 7`;
        conditions.push(excludeApprovedCondition);
        conditions.push(excludeRejectedCondition);
        countConditions.push(excludeApprovedCondition);
        countConditions.push(excludeRejectedCondition);
        console.log(
          "✅ User ID 5 filter applied: excluding approved (5) and rejected (7) leads",
        );
      }

      // Apply status filter if provided (now using status ID)
      // Skip this for License Agents (4) since they have hardcoded status filter (8)
      // QA roles (5, 6) CAN use this filter to toggle between New (1) and QA Review (3)
      if (
        status &&
        status !== "All Statuses" &&
        status !== "All" &&
        userRoleId !== 4
      ) {
        const statusId = parseInt(status);
        if (!isNaN(statusId)) {
          conditions.push(eq(leads.status, statusId));
          countConditions.push(eq(leads.status, statusId));
          console.log("✅ Applying status filter with ID:", statusId);
        }
      }

      // Apply search filter if provided (now includes lead ID)
      if (search) {
        const searchCondition = or(
          like(leads.first_name, `%${search}%`),
          like(leads.last_name, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.phone, `%${search}%`),
          sql`CAST(${leads.id} AS TEXT) LIKE ${`%${search}%`}`, // Search by lead ID
        );
        conditions.push(searchCondition);
        countConditions.push(searchCondition);
        console.log("✅ Applying search filter:", search);
      }

      // Apply created_by filter if provided
      // if (request.query.created_by && request.query.created_by !== "All") {
      if (userRoleId === 3 && currentUser?.id) {
        const createdByCondition = eq(
          leads.created_by,
          parseInt(currentUser?.id),
        );
        conditions.push(createdByCondition);
        countConditions.push(createdByCondition);
        console.log("✅ Applying created_by filter:", currentUser?.id);
      }

      // Apply team_id filter if provided (filter by lead's team)
      if (request.query.team_id && request.query.team_id !== "All") {
        const teamId = parseInt(request.query.team_id);
        if (!isNaN(teamId)) {
          // Filter leads by their team_id (not the assigned user's team)
          const teamCondition = eq(leads.team_id, teamId);
          conditions.push(teamCondition);
          countConditions.push(teamCondition);
          console.log("✅ Applying team_id filter:", teamId);
        }
      }

      // Apply date filters if provided
      if (request.query.start_date || request.query.end_date) {
        const startDate = request.query.start_date;
        const endDate = request.query.end_date;

        console.log("📅 Date filter received:", { startDate, endDate });

        if (startDate && endDate) {
          // Date range filter - use sql.raw for proper date casting
          const dateCondition = sql`CAST(${leads.created_at} AS DATE) >= CAST(${startDate} AS DATE) AND CAST(${leads.created_at} AS DATE) <= CAST(${endDate} AS DATE)`;
          conditions.push(dateCondition);
          countConditions.push(dateCondition);
          console.log(
            "📅 Applying date range filter:",
            startDate,
            "to",
            endDate,
          );
        } else if (startDate) {
          // Only start date (from this date onwards)
          const dateCondition = sql`CAST(${leads.created_at} AS DATE) >= CAST(${startDate} AS DATE)`;
          conditions.push(dateCondition);
          countConditions.push(dateCondition);
          console.log("📅 Applying start date filter:", startDate);
        } else if (endDate) {
          // Only end date (up to this date)
          const dateCondition = sql`CAST(${leads.created_at} AS DATE) <= CAST(${endDate} AS DATE)`;
          conditions.push(dateCondition);
          countConditions.push(dateCondition);
          console.log("📅 Applying end date filter:", endDate);
        }
      }

      // Apply all conditions together with AND
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
        console.log(
          `✅ Applied ${conditions.length} filter condition(s) with AND`,
        );
      }
      if (countConditions.length > 0) {
        countQuery = countQuery.where(and(...countConditions));
      }

      // Get total count
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;

      // Apply pagination
      const offset = (parseInt(page) - 1) * normalizedLimit;
      query = query.limit(normalizedLimit).offset(offset);

      // Order by most recent first
      const allLeads = await query.orderBy(desc(leads.created_at));

      // Debug: Log first lead to verify role_id is included
      // if (allLeads.length > 0) {
      //   console.log("Sample lead data:", {
      //     id: allLeads[0].id,
      //     assigned_to: allLeads[0].assigned_to,
      //     assigned_to_id: allLeads[0].assigned_to_id,
      //     assigned_to_role_id: allLeads[0].assigned_to_role_id,
      //   });
      // }

      return {
        success: true,
        data: {
          leads: allLeads,
          total: total,
          pagination: {
            total: total,
            page: parseInt(page),
            limit: normalizedLimit,
            totalPages: Math.ceil(total / normalizedLimit),
          },
        },
      };
    } catch (error) {
      console.error("Error fetching leads:", error);
      return reply.code(500).send({
        success: false,
        message: "Failed to fetch leads",
      });
    }
  });

  // Get single lead by ID
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate ID is a number
      const leadId = parseInt(id);
      if (isNaN(leadId)) {
        return reply.code(400).send({
          success: false,
          message: "Invalid lead ID - must be a number",
        });
      }

      const leadResult = await db
        .select({
          // Lead fields
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
          height: leads.height,
          weight: leads.weight,
          insurance_provider: leads.insurance_provider,
          policy_number: leads.policy_number,
          medical_notes: leads.medical_notes,
          doctor_name: leads.doctor_name,
          doctor_phone: leads.doctor_phone,
          doctor_address: leads.doctor_address,
          beneficiary_details: leads.beneficiary_details,
          plan_details: leads.plan_details,
          quote_type: leads.quote_type,
          bank_name: leads.bank_name,
          account_name: leads.account_name,
          account_number: leads.account_number,
          routing_number: leads.routing_number,
          account_type: leads.account_type,
          banking_comments: leads.banking_comments,
          // Draft Fields
          initial_draft: leads.initial_draft,
          future_draft: leads.future_draft,
          status: leads.status,
          assigned_to: leads.assigned_to,
          created_by: leads.created_by,
          created_at: leads.created_at,
          updated_at: leads.updated_at,
          // Health questionnaire fields
          hospitalized_nursing_oxygen_cancer_assistance:
            leads.hospitalized_nursing_oxygen_cancer_assistance,
          organ_transplant_terminal_condition:
            leads.organ_transplant_terminal_condition,
          aids_hiv_immune_deficiency: leads.aids_hiv_immune_deficiency,
          diabetes_complications_insulin: leads.diabetes_complications_insulin,
          kidney_disease_multiple_cancers:
            leads.kidney_disease_multiple_cancers,
          pending_tests_surgery_hospitalization:
            leads.pending_tests_surgery_hospitalization,
          angina_stroke_lupus_copd_hepatitis:
            leads.angina_stroke_lupus_copd_hepatitis,
          heart_attack_aneurysm_surgery: leads.heart_attack_aneurysm_surgery,
          cancer_treatment_2years: leads.cancer_treatment_2years,
          substance_abuse_treatment: leads.substance_abuse_treatment,
          cardiovascular_events_3years: leads.cardiovascular_events_3years,
          cancer_respiratory_liver_3years:
            leads.cancer_respiratory_liver_3years,
          neurological_conditions_3years: leads.neurological_conditions_3years,
          health_comments: leads.health_comments,
          covid_question: leads.covid_question,
        })
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (leadResult.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Lead not found",
        });
      }

      // Fetch assigned user name separately if assigned_to exists
      let assigned_user_name = null;
      if (leadResult[0].assigned_to) {
        const userResult = await db
          .select({
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, leadResult[0].assigned_to))
          .limit(1);

        if (userResult.length > 0) {
          assigned_user_name = userResult[0].username;
        }
      }

      // Add assigned_user_name to the result
      const leadData = {
        ...leadResult[0],
        assigned_user_name,
      };

      // Role-based access: Agents can only view leads they created
      const currentUser = request.user;
      const userRoleId = currentUser?.role_id;
      if (userRoleId === 3 && leadData.created_by !== currentUser?.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied: You can only view leads you created",
        });
      }

      // User ID 5 cannot view approved or rejected leads
      if (
        currentUser?.id === 5 &&
        (leadData.status === 5 || leadData.status === 7)
      ) {
        return reply.code(403).send({
          success: false,
          message: "Access denied: You cannot view approved or rejected leads",
        });
      }

      return {
        success: true,
        data: leadData,
      };
    } catch (error) {
      console.error("Error fetching lead:", error);
      return reply.code(500).send({
        success: false,
        message: "Failed to fetch lead",
      });
    }
  });

  // Create new lead
  fastify.post("/", async (request, reply) => {
    try {
      const leadData = request.body;

      // Get creator's team_id from their user record
      let creatorTeamId = null;
      if (request.user?.id) {
        const creatorResult = await db
          .select({ team_id: users.team_id })
          .from(users)
          .where(eq(users.id, request.user.id))
          .limit(1);

        if (creatorResult.length > 0) {
          creatorTeamId = creatorResult[0].team_id;
          console.log(
            `✅ Extracted team_id ${creatorTeamId} from creator user ${request.user.id}`,
          );
        }
      }

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
        quote_type: leadData.quote_type || null,

        // Handle health questionnaire - accept both boolean and string values
        // If already boolean, use it; if string 'yes'/'no', convert; otherwise default to false
        hospitalized_nursing_oxygen_cancer_assistance:
          typeof leadData.hospitalized_nursing_oxygen_cancer_assistance ===
            "boolean"
            ? leadData.hospitalized_nursing_oxygen_cancer_assistance
            : leadData.hospitalized_nursing_oxygen_cancer_assistance === "yes"
              ? true
              : false,
        organ_transplant_terminal_condition:
          typeof leadData.organ_transplant_terminal_condition === "boolean"
            ? leadData.organ_transplant_terminal_condition
            : leadData.organ_transplant_terminal_condition === "yes"
              ? true
              : false,
        aids_hiv_immune_deficiency:
          typeof leadData.aids_hiv_immune_deficiency === "boolean"
            ? leadData.aids_hiv_immune_deficiency
            : leadData.aids_hiv_immune_deficiency === "yes"
              ? true
              : false,
        diabetes_complications_insulin:
          typeof leadData.diabetes_complications_insulin === "boolean"
            ? leadData.diabetes_complications_insulin
            : leadData.diabetes_complications_insulin === "yes"
              ? true
              : false,
        kidney_disease_multiple_cancers:
          typeof leadData.kidney_disease_multiple_cancers === "boolean"
            ? leadData.kidney_disease_multiple_cancers
            : leadData.kidney_disease_multiple_cancers === "yes"
              ? true
              : false,
        pending_tests_surgery_hospitalization:
          typeof leadData.pending_tests_surgery_hospitalization === "boolean"
            ? leadData.pending_tests_surgery_hospitalization
            : leadData.pending_tests_surgery_hospitalization === "yes"
              ? true
              : false,
        angina_stroke_lupus_copd_hepatitis:
          typeof leadData.angina_stroke_lupus_copd_hepatitis === "boolean"
            ? leadData.angina_stroke_lupus_copd_hepatitis
            : leadData.angina_stroke_lupus_copd_hepatitis === "yes"
              ? true
              : false,
        heart_attack_aneurysm_surgery:
          typeof leadData.heart_attack_aneurysm_surgery === "boolean"
            ? leadData.heart_attack_aneurysm_surgery
            : leadData.heart_attack_aneurysm_surgery === "yes"
              ? true
              : false,
        cancer_treatment_2years:
          typeof leadData.cancer_treatment_2years === "boolean"
            ? leadData.cancer_treatment_2years
            : leadData.cancer_treatment_2years === "yes"
              ? true
              : false,
        substance_abuse_treatment:
          typeof leadData.substance_abuse_treatment === "boolean"
            ? leadData.substance_abuse_treatment
            : leadData.substance_abuse_treatment === "yes"
              ? true
              : false,
        cardiovascular_events_3years:
          typeof leadData.cardiovascular_events_3years === "boolean"
            ? leadData.cardiovascular_events_3years
            : leadData.cardiovascular_events_3years === "yes"
              ? true
              : false,
        cancer_respiratory_liver_3years:
          typeof leadData.cancer_respiratory_liver_3years === "boolean"
            ? leadData.cancer_respiratory_liver_3years
            : leadData.cancer_respiratory_liver_3years === "yes"
              ? true
              : false,
        neurological_conditions_3years:
          typeof leadData.neurological_conditions_3years === "boolean"
            ? leadData.neurological_conditions_3years
            : leadData.neurological_conditions_3years === "yes"
              ? true
              : false,

        covid_question:
          typeof leadData.covid_question === "boolean"
            ? leadData.covid_question
            : leadData.covid_question === "yes"
              ? true
              : false,

        bank_name: leadData.bank_name,
        account_name: leadData.account_name,
        account_number: leadData.account_number,
        routing_number: leadData.routing_number,
        account_type: leadData.account_type,
        banking_comments: leadData.banking_comments || null,
        // Draft Fields
        initial_draft: leadData.initial_draft || null,
        future_draft: leadData.future_draft || null,
        status: leadData.status ? parseInt(leadData.status) : 6, // Default to 'New' (id: 6)
        assigned_to: leadData.assigned_to
          ? parseInt(leadData.assigned_to)
          : null,
        team_id: creatorTeamId, // Set team_id from creator's team
        created_by: request.user?.id || null, // Set created_by from authenticated user
      };

      console.log(dbLead);

      // Insert new lead
      const newLead = await db.insert(leads).values(dbLead).returning();

      // Log activity
      const userId = request.user?.id || 1; // Use authenticated user ID
      await logActivity({
        userId,
        activityType: ACTIVITY_TYPES.LEAD_CREATED,
        description: `created new lead for ${newLead[0].first_name} ${newLead[0].last_name}`,
        entityType: "lead",
        entityId: newLead[0].id,
      });

      return reply.code(201).send({
        success: true,
        message: "Lead created successfully",
        data: newLead[0],
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      return reply.code(500).send({
        success: false,
        message: "Failed to create lead",
      });
    }
  });

  // Update lead
  fastify.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Debug: Check authentication at start of PUT request
      console.log("🔐 PUT /leads/:id - Auth check:");
      console.log(
        "   Authorization header:",
        request.headers.authorization ? "Present" : "Missing",
      );
      console.log("   request.user:", request.user);
      console.log("   User ID:", request.user?.id);

      // Check if lead exists
      const existingLead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, parseInt(id)))
        .limit(1);

      if (existingLead.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Lead not found",
        });
      }

      // Role-based access control for Agents
      const currentUser = request.user;
      const userRoleId = currentUser?.role_id;

      if (userRoleId === 3) {
        // Agents can only edit leads they created
        if (existingLead[0].created_by !== currentUser?.id) {
          return reply.code(403).send({
            success: false,
            message: "Access denied: You can only edit leads you created",
          });
        }

        // Agents can only edit leads with "New" status (status_id = 6)
        // Get the status name to check
        const leadStatus = await db
          .select({ status_name: leadsStatuses.status_name })
          .from(leadsStatuses)
          .where(eq(leadsStatuses.id, existingLead[0].status))
          .limit(1);

        if (leadStatus[0]?.status_name !== "New") {
          return reply.code(403).send({
            success: false,
            message:
              'Access denied: Agents can only edit leads with "New" status',
          });
        }
      }

      // Store old status for tracking (check if changed AFTER auto-assignment)
      const oldStatus = existingLead[0].status;

      /*  DISABLED agent assingment. Removed frontend agent dropdown assignmentChanged  */
      // const assignmentChanged = 0;  // not assigning anymore
      delete updateData.assigned_to;

      // Check if assignment changed
      // const oldAssignedTo = existingLead[0].assigned_to;
      // const newAssignedTo = updateData.assigned_to;
      // const assignmentChanged = oldAssignedTo !== newAssignedTo;

      // AUTO-ASSIGN STATUS BASED ON ASSIGNED AGENT'S ROLE
      // if (assignmentChanged) {
      //   if (newAssignedTo) {
      //     // Fetch the assigned user's role_id
      //     const assignedUserResult = await db
      //       .select({
      //         role_id: users.role_id,
      //       })
      //       .from(users)
      //       .where(eq(users.id, parseInt(newAssignedTo)))
      //       .limit(1);

      //     if (assignedUserResult.length > 0) {
      //       const assignedUserRoleId = assignedUserResult[0].role_id;

      //       // Role-to-Status mapping
      //       const roleStatusMap = {
      //         2: 2, // Admin → Pending
      //         5: 3, // Manager → Approved
      //         6: 4, // QA Review → Rejected
      //         4: 8, // License Agent → License Agent
      //       };

      //       // Auto-assign status based on role_id
      //       if (roleStatusMap[assignedUserRoleId]) {
      //         updateData.status = roleStatusMap[assignedUserRoleId];
      //         console.log(
      //           `✅ Auto-assigned status ${updateData.status} based on role_id ${assignedUserRoleId}`,
      //         );
      //       }
      //     }
      //   } else {
      //     // If unassigned, keep status at 1 (New) - only if current status is not manually set
      //     // We don't force it to 1, we just don't change it
      //     console.log("ℹ️  Lead unassigned, status remains unchanged");
      //   }
      // }

      //////////////////////////////////////////

      console.log("lead_manual_status: " + updateData.lead_manual_status);
      console.log("role_id: " + request.user?.role_id);
      if (updateData.lead_manual_status === "approved") {
        if (request.user?.role_id === 5) {
          updateData.status = 8; // License Agent status id
        } else {
          updateData.status = 5; // Approved status id
        }
      } else if (updateData.lead_manual_status === "rejected") {
        if (request.user?.role_id === 5) {
          updateData.status = 7; // Rejected status id
        } else {
          updateData.status = 9; // Rejected status id
        }
      }
      console.log("final status: " + updateData.status);

      ////////////////////////////////////

      // NOW check if status changed (AFTER auto-assignment logic)
      const newStatus = updateData.status;

      const statusChanged = oldStatus !== newStatus;

      // Update lead with Central Time timestamp
      updateData.updated_at = getNowCentral();

      const updatedLead = await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, parseInt(id)))
        .returning();

      // Track status change if status was updated
      if (statusChanged && newStatus) {
        try {
          const userId = request.user?.id || 1; // Use authenticated user ID
          await db.insert(leadsStatusTracking).values({
            lead_id: parseInt(id),
            user_id: userId,
            old_status: oldStatus,
            new_status: newStatus,
          });
          console.log(
            `✅ Status tracking logged: ${oldStatus} -> ${newStatus} by user ${userId}`,
          );
        } catch (trackingError) {
          console.error("Error logging status tracking:", trackingError);
          // Don't fail the update if tracking fails
        }
      }

      // Track assignment change if assigned_to was updated
      // if (assignmentChanged && newAssignedTo) {
      //   try {
      //     const userId = request.user?.id || 1; // Use authenticated user ID
      //     await db.insert(leadsAssignedTracking).values({
      //       lead_id: parseInt(id),
      //       assigned_by_user_id: userId,
      //       assigned_to_user_id: parseInt(newAssignedTo),
      //       old_assigned_to: oldAssignedTo ? parseInt(oldAssignedTo) : null,
      //     });
      //     console.log(
      //       `✅ Assignment tracking logged: ${oldAssignedTo} -> ${newAssignedTo} by user ${userId}`,
      //     );
      //   } catch (trackingError) {
      //     console.error("Error logging assignment tracking:", trackingError);
      //     // Don't fail the update if tracking fails
      //   }
      // }

      // Log activity for lead update
      console.log("🔍 DEBUG: Checking activity logging...");
      console.log("🔍 Authenticated user from JWT:", request.user);
      console.log("🔍 statusChanged:", statusChanged);
      // console.log("🔍 assignmentChanged:", assignmentChanged);

      // Get user_id from JWT token (authenticated user)
      const activityUserId = request.user?.id || 1;

      if (!request.user) {
        console.log(
          "⚠️  WARNING: No authenticated user from JWT, using fallback user_id: 1",
        );
      } else {
        console.log(
          "✅ Using authenticated user_id from JWT:",
          activityUserId,
          "-",
          request.user.username,
        );
      }

      // Log general update
      // await logActivity({
      //   userId: activityUserId,
      //   activityType: ACTIVITY_TYPES.LEAD_UPDATED,
      //   description: `updated lead information for ${updatedLead[0].first_name} ${updatedLead[0].last_name}`,
      //   entityType: "lead",
      //   entityId: parseInt(id),
      // });
      // console.log("✅ Lead update activity logged");

      // Log status change specifically
      if (statusChanged) {
        // Resolve status names for human-readable activity log
        const [oldStatusResult, newStatusResult] = await Promise.all([
          oldStatus
            ? db
              .select({ status_name: leadsStatuses.status_name })
              .from(leadsStatuses)
              .where(eq(leadsStatuses.id, oldStatus))
              .limit(1)
            : Promise.resolve([]),
          newStatus
            ? db
              .select({ status_name: leadsStatuses.status_name })
              .from(leadsStatuses)
              .where(eq(leadsStatuses.id, newStatus))
              .limit(1)
            : Promise.resolve([]),
        ]);
        const oldStatusName = oldStatusResult[0]?.status_name ?? oldStatus;
        const newStatusName = newStatusResult[0]?.status_name ?? newStatus;

        await logActivity({
          userId: activityUserId,
          activityType: ACTIVITY_TYPES.LEAD_STATUS_CHANGED,
          description: `Changed ${updatedLead[0].first_name} ${updatedLead[0].last_name} status (${oldStatusName} -> ${newStatusName})`,
          entityType: "lead",
          entityId: parseInt(id),
        });
        console.log("✅ Status change activity logged");
      }

      // Log assignment change specifically
      // if (assignmentChanged) {
      //   await logActivity({
      //     userId: activityUserId,
      //     activityType: ACTIVITY_TYPES.LEAD_ASSIGNED,
      //     description: `assigned lead ${updatedLead[0].first_name} ${updatedLead[0].last_name} to agent`,
      //     entityType: "lead",
      //     entityId: parseInt(id),
      //   });
      //   console.log("✅ Assignment change activity logged");
      // }

      return {
        success: true,
        message: "Lead updated successfully",
        data: updatedLead[0],
      };
    } catch (error) {
      console.error("Error updating lead:", error);
      return reply.code(500).send({
        success: false,
        message: "Failed to update lead",
      });
    }
  });

  // Delete lead
  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const deletedLead = await db
        .delete(leads)
        .where(eq(leads.id, parseInt(id)))
        .returning({ id: leads.id });

      if (deletedLead.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Lead not found",
        });
      }

      return {
        success: true,
        message: "Lead deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting lead:", error);
      return reply.code(500).send({
        success: false,
        message: "Failed to delete lead",
      });
    }
  });
}
