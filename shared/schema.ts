import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Cities enum (for now, only Chinese cities, but can be extended)
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
export const LEAD_SOURCES = ["manual", "form", "import", "booking", "other"] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

// Client categories
export const CLIENT_CATEGORIES = [
  "category_ab",      // Категория А и В (Даты и бюджет)
  "category_c",       // Категория C (Неопределились)
  "category_d",       // Категория D (Нет бюджета)
  "vip",              // VIP
  "not_segmented",    // Не сегментированный
  "travel_agent"      // Турагент
] as const;
export type ClientCategory = typeof CLIENT_CATEGORIES[number];

// Deal statuses
export const DEAL_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;
export type DealStatus = typeof DEAL_STATUSES[number];

// Tour types
export const TOUR_TYPES = ["group", "individual", "excursion", "adventure", "cultural", "other"] as const;
export type TourType = typeof TOUR_TYPES[number];

// Notification types
export const NOTIFICATION_TYPES = [
  "new_booking",
  "group_filled",
  "event_upcoming",
  "birthday_upcoming"
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

// Form field types
export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "select",
  "textarea",
  "checkbox",
  "date",
  "number",
  "tour"
] as const;
export type FormFieldType = typeof FORM_FIELD_TYPES[number];

// ================= CRM TABLES =================

// Users table - for authentication and authorization
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'admin', 'manager', 'viewer'
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Events table - tours/events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  country: text("country").notNull(), // e.g., "China", "Thailand", etc.
  cities: text("cities").array().notNull(), // Array of city names in the tour route
  tourType: text("tour_type").notNull(), // 'group', 'individual', 'excursion', etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  participantLimit: integer("participant_limit").notNull(), // Maximum number of participants
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Tour price
  isFull: boolean("is_full").notNull().default(false), // Auto-updated when event is full
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contacts table - tourists/clients
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  passport: text("passport"), // Passport number
  birthDate: date("birth_date"), // Date of birth
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: 'set null' }), // Source lead (nullable)
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Groups table - for families and mini-groups
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // Group name (e.g., "Семья Ивановых", "Мини-группа 1")
  type: text("type").notNull(), // 'family' or 'mini-group'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deals table - связь контакт + тур
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'cancelled', 'completed'
  amount: numeric("amount", { precision: 10, scale: 2 }), // Deal amount (может отличаться от базовой цены тура)
  surcharge: text("surcharge"), // Additional charges/notes
  nights: text("nights"), // Number of nights
  groupId: varchar("group_id").references(() => groups.id, { onDelete: 'set null' }), // Group this deal belongs to (optional)
  isPrimaryInGroup: boolean("is_primary_in_group").default(false), // Is this the primary/representative member of the group
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// City visits table - itinerary details for each contact in an event
export const cityVisits = pgTable("city_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: 'cascade' }),
  city: text("city").notNull(),
  arrivalDate: text("arrival_date").notNull(), // ISO date string
  arrivalTime: text("arrival_time"), // Time string HH:MM (optional)
  departureDate: text("departure_date"), // ISO date string (optional)
  departureTime: text("departure_time"), // Time string HH:MM (optional)
  transportType: text("transport_type").notNull(), // 'train' or 'plane' for arrival
  departureTransportType: text("departure_transport_type"), // 'train' or 'plane' for departure
  flightNumber: text("flight_number"), // Flight/train number for arrival
  airport: text("airport"), // Airport/station name for arrival
  transfer: text("transfer"), // Transfer info for arrival
  departureFlightNumber: text("departure_flight_number"), // Flight/train number for departure
  departureAirport: text("departure_airport"), // Airport/station name for departure
  departureTransfer: text("departure_transfer"), // Transfer info for departure
  hotelName: text("hotel_name").notNull(),
  roomType: text("room_type"), // 'twin' or 'double'
});

// Notifications table - system notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'new_booking', 'group_filled', 'event_upcoming', 'birthday_upcoming'
  message: text("message").notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }), // Related event (nullable)
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: 'cascade' }), // Related contact (nullable)
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Forms table - for form builder
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldsConfig: jsonb("fields_config"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Form fields table - individual fields for each form
export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  order: integer("order").notNull().default(0),
  config: jsonb("config"),
});

// Leads table - CRM leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lastName: text("last_name").notNull(), // Фамилия
  firstName: text("first_name").notNull(), // Имя
  middleName: text("middle_name"), // Отчество
  phone: text("phone"), // Телефон
  email: text("email"), // Email
  clientCategory: text("client_category"), // Категория клиента
  status: text("status").notNull().default("new"), // 'new', 'contacted', 'qualified', 'won', 'lost'
  source: text("source").notNull().default("manual"), // 'manual', 'form', 'import', 'other'
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'set null' }), // Выбранный тур
  tourCost: numeric("tour_cost", { precision: 10, scale: 2 }), // Стоимость тура (price * количество туристов)
  advancePayment: numeric("advance_payment", { precision: 10, scale: 2 }), // Аванс
  remainingPayment: numeric("remaining_payment", { precision: 10, scale: 2 }), // Остаток оплаты
  formId: varchar("form_id").references(() => forms.id, { onDelete: 'set null' }),
  notes: text("notes"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: 'set null' }),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Lead status history table - track status changes
export const leadStatusHistory = pgTable("lead_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedByUserId: varchar("changed_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  note: text("note"),
});

// Form submissions table - stores form submissions
export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: 'set null' }),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  data: jsonb("data").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Lead tourists table - stores multiple tourists for a lead
export const leadTourists = pgTable("lead_tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  lastName: text("last_name").notNull(), // Фамилия
  firstName: text("first_name").notNull(), // Имя
  middleName: text("middle_name"), // Отчество
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"), // Дата рождения
  passportSeries: text("passport_series"), // Серия и номер (национальный паспорт)
  passportIssuedBy: text("passport_issued_by"), // Кем выдан (нац паспорт)
  registrationAddress: text("registration_address"), // Адрес регистрации
  foreignPassportName: text("foreign_passport_name"), // ФИО Загранпаспорт (Латиница)
  foreignPassportNumber: text("foreign_passport_number"), // Номер загранпаспорта
  foreignPassportValidUntil: date("foreign_passport_valid_until"), // Годен до (загран)
  touristType: text("tourist_type").notNull().default("adult"), // 'adult', 'child', or 'infant'
  isPrimary: boolean("is_primary").notNull().default(false), // One tourist must be primary
  isAutoCreated: boolean("is_auto_created").notNull().default(false), // Created automatically from lead data
  notes: text("notes"),
  order: integer("order").notNull().default(0), // Display order
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Partial unique index: only one primary tourist per lead
  uniquePrimaryPerLead: uniqueIndex("lead_tourists_unique_primary_per_lead")
    .on(table.leadId)
    .where(sql`${table.isPrimary} = true`),
}));

// ================= ZOD SCHEMAS =================

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Event schemas
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEventSchema = insertEventSchema.partial();

// Contact schemas
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const updateContactSchema = insertContactSchema.partial();

// Deal schemas
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });
export const updateDealSchema = insertDealSchema.partial();

// City visit schemas
export const insertCityVisitSchema = createInsertSchema(cityVisits).omit({ id: true });
export const insertCityVisitWithoutDealSchema = insertCityVisitSchema.omit({ dealId: true });

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const updateNotificationSchema = insertNotificationSchema.partial();

// Form schemas
export const insertFormSchema = createInsertSchema(forms).omit({ id: true, createdAt: true });
export const insertFormFieldSchema = createInsertSchema(formFields).omit({ id: true });

// Lead schemas
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

// Form submission schemas
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({ 
  id: true, 
  submittedAt: true 
});

// Lead tourist schemas
export const insertLeadTouristSchema = createInsertSchema(leadTourists).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const updateLeadTouristSchema = insertLeadTouristSchema.partial();

// Group schemas
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export const updateGroupSchema = insertGroupSchema.partial();

// ================= TYPES =================

// User types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Event types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;

// Contact types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

// Deal types
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type UpdateDeal = z.infer<typeof updateDealSchema>;

// City visit types
export type CityVisit = typeof cityVisits.$inferSelect;
export type InsertCityVisit = z.infer<typeof insertCityVisitSchema>;

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;

// Form types
export type Form = typeof forms.$inferSelect;

// Group types
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;

// Lead types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type LeadWithTouristCount = Lead & {
  touristCount?: number;
};
export type LeadStatusHistoryEntry = typeof leadStatusHistory.$inferSelect;
export type InsertLeadStatusHistory = z.infer<typeof insertLeadStatusHistorySchema>;

// Form submission types
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

// Lead tourist types
export type LeadTourist = typeof leadTourists.$inferSelect;
export type InsertLeadTourist = z.infer<typeof insertLeadTouristSchema>;
export type UpdateLeadTourist = z.infer<typeof updateLeadTouristSchema>;

// Complex types with relations
export type EventWithStats = Event & {
  bookedCount: number;
  availableSpots: number;
};

export type DealWithDetails = Deal & {
  contact: Contact;
  event: Event;
  visits: CityVisit[];
};

export type ContactWithDeals = Contact & {
  deals: DealWithDetails[];
};

// ================= DRIZZLE RELATIONS =================

export const usersRelations = relations(users, ({ many }) => ({
  createdForms: many(forms),
  createdLeads: many(leads, { relationName: "createdLeads" }),
  assignedLeads: many(leads, { relationName: "assignedLeads" }),
  statusChanges: many(leadStatusHistory),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  deals: many(deals),
  notifications: many(notifications),
  groups: many(groups),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  sourceLead: one(leads, {
    fields: [contacts.leadId],
    references: [leads.id],
  }),
  deals: many(deals),
  notifications: many(notifications),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  event: one(events, {
    fields: [deals.eventId],
    references: [events.id],
  }),
  group: one(groups, {
    fields: [deals.groupId],
    references: [groups.id],
  }),
  cityVisits: many(cityVisits),
}));

export const cityVisitsRelations = relations(cityVisits, ({ one }) => ({
  deal: one(deals, {
    fields: [cityVisits.dealId],
    references: [deals.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  event: one(events, {
    fields: [notifications.eventId],
    references: [events.id],
  }),
  contact: one(contacts, {
    fields: [notifications.contactId],
    references: [contacts.id],
  }),
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
  convertedContacts: many(contacts),
  tourists: many(leadTourists),
}));

export const leadTouristsRelations = relations(leadTourists, ({ one }) => ({
  lead: one(leads, {
    fields: [leadTourists.leadId],
    references: [leads.id],
  }),
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

export const groupsRelations = relations(groups, ({ one, many }) => ({
  event: one(events, {
    fields: [groups.eventId],
    references: [events.id],
  }),
  deals: many(deals),
}));
