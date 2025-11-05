import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Cities enum
export const CITIES = ["Beijing", "Luoyang", "Xian", "Zhangjiajie", "Shanghai"] as const;
export type City = typeof CITIES[number];

// Transport types
export const TRANSPORT_TYPES = ["train", "plane"] as const;
export type TransportType = typeof TRANSPORT_TYPES[number];

// Room types
export const ROOM_TYPES = ["twin", "double"] as const;
export type RoomType = typeof ROOM_TYPES[number];

// User roles
export const USER_ROLES = ["admin", "manager", "viewer"] as const;
export type UserRole = typeof USER_ROLES[number];

// Lead statuses
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

// Lead sources
export const LEAD_SOURCES = ["manual", "bitrix24", "form", "import", "other"] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

// Form field types
export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "select",
  "textarea",
  "checkbox",
  "date",
  "number"
] as const;
export type FormFieldType = typeof FORM_FIELD_TYPES[number];

// Tourist table - now includes Bitrix24 integration fields
export const tourists = pgTable("tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(), // Bitrix24 Smart Process Element ID
  entityTypeId: text("entity_type_id").notNull(), // Bitrix24 Smart Process Entity Type ID
  bitrixContactId: text("bitrix_contact_id"), // Bitrix24 Contact ID
  bitrixDealId: text("bitrix_deal_id"), // Bitrix24 Deal ID from UF_CRM_9_1711887457
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  passport: text("passport"), // Passport number
  birthDate: text("birth_date"), // ISO date string
  surcharge: text("surcharge"), // Surcharge/additional payment from Deal UF_CRM_1715027519285
  nights: text("nights"), // Number of nights as string from Deal UF_CRM_1695942299984
});

// City visit table - stores each city visit for a tourist
export const cityVisits = pgTable("city_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").notNull().references(() => tourists.id, { onDelete: 'cascade' }),
  city: text("city").notNull(),
  arrivalDate: text("arrival_date").notNull(), // ISO date string
  arrivalTime: text("arrival_time"), // Time string HH:MM (optional)
  departureDate: text("departure_date"), // ISO date string (optional - tourist may still be in city)
  departureTime: text("departure_time"), // Time string HH:MM (optional)
  transportType: text("transport_type").notNull(), // 'train' or 'plane' for arrival
  departureTransportType: text("departure_transport_type"), // 'train' or 'plane' for departure (optional)
  flightNumber: text("flight_number"), // Flight/train number for arrival (optional)
  airport: text("airport"), // Airport name for arrival (optional)
  transfer: text("transfer"), // Transfer info for arrival (optional)
  departureFlightNumber: text("departure_flight_number"), // Flight/train number for departure (optional)
  departureAirport: text("departure_airport"), // Airport name for departure (optional)
  departureTransfer: text("departure_transfer"), // Transfer info for departure (optional)
  hotelName: text("hotel_name").notNull(),
  roomType: text("room_type"), // 'twin' or 'double' (optional)
});

// ================= NEW CRM TABLES =================

// Users table - for authentication and authorization
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'admin', 'manager', 'viewer'
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Forms table - for form builder
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // FK to users (form creator)
  fieldsConfig: jsonb("fields_config"), // JSON snapshot of form layout/fields metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Form fields table - individual fields for each form
export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }), // FK to forms
  key: text("key").notNull(), // Unique field key within form (e.g., "email", "phone")
  label: text("label").notNull(), // Display label
  type: text("type").notNull(), // 'text', 'email', 'phone', 'select', 'textarea', 'checkbox', 'date', 'number'
  isRequired: boolean("is_required").notNull().default(false),
  order: integer("order").notNull().default(0), // Display order
  config: jsonb("config"), // Field-specific config (options for select, validation rules, etc.)
});

// Leads table - CRM leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("new"), // 'new', 'contacted', 'qualified', 'won', 'lost'
  source: text("source").notNull().default("manual"), // 'manual', 'bitrix24', 'form', 'import', 'other'
  formId: varchar("form_id").references(() => forms.id, { onDelete: 'set null' }), // FK to forms (nullable - if lead came from form)
  notes: text("notes"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: 'set null' }), // FK to users (nullable - who is working on this lead)
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }), // FK to users (who created this lead) - nullable to allow user deletion
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Lead status history table - track status changes
export const leadStatusHistory = pgTable("lead_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }), // FK to leads
  oldStatus: text("old_status"), // Previous status (nullable for first entry)
  newStatus: text("new_status").notNull(), // New status
  changedByUserId: varchar("changed_by_user_id").references(() => users.id, { onDelete: 'set null' }), // FK to users - nullable to allow user deletion
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  note: text("note"), // Optional note about the change
});

// Form submissions table - stores form submissions
export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }), // FK to forms
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: 'set null' }), // FK to leads (created from this submission)
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  data: jsonb("data").notNull(), // JSON object with field keys and values
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// ================= ZOD SCHEMAS =================

// Tourist schemas (existing)
export const insertCityVisitSchema = createInsertSchema(cityVisits).omit({ id: true });
export const insertCityVisitWithoutTouristSchema = insertCityVisitSchema.omit({ touristId: true });
export const insertTouristSchema = createInsertSchema(tourists).omit({ id: true }).extend({
  bitrixContactId: z.string().optional(),
  bitrixDealId: z.string().optional(),
  visits: z.array(insertCityVisitWithoutTouristSchema).optional(),
});

// User schemas (new)
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Form schemas (new)
export const insertFormSchema = createInsertSchema(forms).omit({ id: true, createdAt: true });
export const insertFormFieldSchema = createInsertSchema(formFields).omit({ id: true });

// Lead schemas (new)
export const insertLeadSchema = createInsertSchema(leads).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const updateLeadSchema = insertLeadSchema.partial();
export const insertLeadStatusHistorySchema = createInsertSchema(leadStatusHistory).omit({ 
  id: true, 
  changedAt: true 
});

// Form submission schemas (new)
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({ 
  id: true, 
  submittedAt: true 
});

// ================= TYPES =================

// Tourist types (existing)
export type Tourist = typeof tourists.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;
export type CityVisit = typeof cityVisits.$inferSelect;
export type InsertCityVisit = z.infer<typeof insertCityVisitSchema>;
export type TouristWithVisits = Tourist & {
  visits: CityVisit[];
};

// User types (new)
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Form types (new)
export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;

// Lead types (new)
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type LeadStatusHistoryEntry = typeof leadStatusHistory.$inferSelect;
export type InsertLeadStatusHistory = z.infer<typeof insertLeadStatusHistorySchema>;

// Form submission types (new)
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

// ================= DRIZZLE RELATIONS =================
// Reference: blueprint:javascript_database

export const usersRelations = relations(users, ({ many }) => ({
  createdForms: many(forms),
  createdLeads: many(leads, { relationName: "createdLeads" }),
  assignedLeads: many(leads, { relationName: "assignedLeads" }),
  statusChanges: many(leadStatusHistory),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  creator: one(users, {
    fields: [forms.userId],
    references: [users.id],
  }),
  fields: many(formFields),
  submissions: many(formSubmissions),
  leads: many(leads),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, {
    fields: [formFields.formId],
    references: [forms.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [leads.createdByUserId],
    references: [users.id],
    relationName: "createdLeads",
  }),
  assignedTo: one(users, {
    fields: [leads.assignedUserId],
    references: [users.id],
    relationName: "assignedLeads",
  }),
  form: one(forms, {
    fields: [leads.formId],
    references: [forms.id],
  }),
  statusHistory: many(leadStatusHistory),
}));

export const leadStatusHistoryRelations = relations(leadStatusHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadStatusHistory.leadId],
    references: [leads.id],
  }),
  changedBy: one(users, {
    fields: [leadStatusHistory.changedByUserId],
    references: [users.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
  lead: one(leads, {
    fields: [formSubmissions.leadId],
    references: [leads.id],
  }),
}));
