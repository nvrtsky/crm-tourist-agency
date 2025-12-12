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

// Countries
export const COUNTRIES = ["Китай", "Марокко"] as const;
export type Country = typeof COUNTRIES[number];

// User roles
export const USER_ROLES = ["admin", "manager", "viewer"] as const;
export type UserRole = typeof USER_ROLES[number];

// Lead statuses
export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "won", "lost"] as const;
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
export const TOUR_TYPES = ["group", "individual", "excursion", "transfer"] as const;
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

// Participant expense types (individual per participant per city)
export const PARTICIPANT_EXPENSE_TYPES = [
  "accommodation",  // Проживание
  "excursions",     // Экскурсии
  "meals",          // Питание
  "transport",      // Внутренний транспорт
  "tickets",        // Входные билеты
  "other"           // Прочее
] as const;
export type ParticipantExpenseType = typeof PARTICIPANT_EXPENSE_TYPES[number];

// Common expense types (shared for entire tour per city)
export const COMMON_EXPENSE_TYPES = [
  "guide",          // Гид/Сопровождающий
  "bus",            // Аренда автобуса
  "insurance",      // Страховка
  "visa",           // Визовые сборы
  "other"           // Прочее
] as const;
export type CommonExpenseType = typeof COMMON_EXPENSE_TYPES[number];

// ================= CRM TABLES =================

// Users table - for authentication and authorization
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(), // Login username
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position"), // Job position/title (optional)
  role: text("role").notNull(), // 'admin', 'manager', 'viewer'
  email: text("email"), // Email (optional)
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
  priceCurrency: text("price_currency").notNull().default("RUB"), // Валюта базовой цены: RUB, USD, CNY, EUR
  isFull: boolean("is_full").notNull().default(false), // Auto-updated when event is full
  isArchived: boolean("is_archived").notNull().default(false), // Manual or auto-archived when tour ends
  color: text("color"), // Color indicator: 'red', 'blue', 'green', 'yellow', 'purple'
  cityGuides: jsonb("city_guides"), // City to guide mapping: { "cityName": "userId" }
  externalId: text("external_id"), // WordPress post ID for sync tracking
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
  leadTouristId: varchar("lead_tourist_id").references(() => leadTourists.id, { onDelete: 'set null' }), // Link to detailed tourist data (nullable, unique)
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure one-to-one relationship between contact and leadTourist
  uniqueLeadTourist: uniqueIndex("contacts_unique_lead_tourist")
    .on(table.leadTouristId)
    .where(sql`${table.leadTouristId} IS NOT NULL`),
}));

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
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }), // Оплаченная сумма
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
  arrivalDate: text("arrival_date"), // ISO date string (optional - can be filled after departure)
  arrivalTime: text("arrival_time"), // Time string HH:MM (optional)
  departureDate: text("departure_date"), // ISO date string (optional)
  departureTime: text("departure_time"), // Time string HH:MM (optional)
  transportType: text("transport_type"), // 'train', 'plane', or 'bus' for arrival (optional)
  departureTransportType: text("departure_transport_type"), // 'train', 'plane', or 'bus' for departure
  flightNumber: text("flight_number"), // Flight/train number for arrival
  airport: text("airport"), // Airport/station name for arrival
  transfer: text("transfer"), // Transfer info for arrival
  departureFlightNumber: text("departure_flight_number"), // Flight/train number for departure
  departureAirport: text("departure_airport"), // Airport/station name for departure
  departureTransfer: text("departure_transfer"), // Transfer info for departure
  hotelName: text("hotel_name"), // Hotel name (optional - can be filled later)
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
  options: text("options").array(), // Options for select fields
  isMultiple: boolean("is_multiple").notNull().default(false), // Allow multiple selection for select fields
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
  selectedCities: text("selected_cities").array(), // Выбранные города маршрута (по умолчанию все города тура)
  tourCost: numeric("tour_cost", { precision: 10, scale: 2 }), // Стоимость тура
  tourCostCurrency: text("tour_cost_currency").notNull().default("RUB"), // Валюта стоимости тура: RUB, USD, CNY, EUR
  advancePayment: numeric("advance_payment", { precision: 10, scale: 2 }), // Аванс
  advancePaymentCurrency: text("advance_payment_currency").notNull().default("RUB"), // Валюта аванса: RUB, USD, CNY, EUR
  remainingPayment: numeric("remaining_payment", { precision: 10, scale: 2 }), // Остаток оплаты
  remainingPaymentCurrency: text("remaining_payment_currency").notNull().default("RUB"), // Валюта остатка: RUB, USD, CNY, EUR
  roomType: text("room_type"), // Тип номера
  transfers: text("transfers"), // Трансферы
  meals: text("meals"), // Питание
  hotelCategory: text("hotel_category"), // Категория отелей: '3*', '4*', '5*'
  formId: varchar("form_id").references(() => forms.id, { onDelete: 'set null' }),
  color: text("color"), // Color indicator: 'red', 'blue', 'green', 'yellow', 'purple'
  notes: text("notes"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: 'set null' }),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  postponedUntil: timestamp("postponed_until"), // Дата, до которой лид отложен
  postponeReason: text("postpone_reason"), // Причина отложения: 'next_year', 'thinking', 'other_country', 'waiting_passport'
  outcomeType: text("outcome_type"), // Тип исхода: 'postponed' (отложен) или 'failed' (провал)
  failureReason: text("failure_reason"), // Причина провала: 'missing_contact', 'expensive', 'competitor', 'not_target'
  hasBeenContacted: boolean("has_been_contacted").notNull().default(false), // Была ли коммуникация с лидом
  isArchived: boolean("is_archived").notNull().default(false), // Архивирован ли лид
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
  passportScans: text("passport_scans").array(), // URLs файлов сканов загранпаспорта
  guideComment: text("guide_comment"), // Комментарий для гида
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

// Settings table - stores application settings (API keys, etc.)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id, { onDelete: 'set null' }),
});

// System dictionaries table - configurable lists for dropdowns
export const systemDictionaries = pgTable("system_dictionaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'lead_source', 'lead_status', 'country', 'room_type', 'currency', 'hotel_category', 'client_category'
  value: text("value").notNull(),
  label: text("label").notNull(), // Display label
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("system_dictionary_unique").on(table.type, table.value)
]);

// Dictionary type configuration - metadata per dictionary type
export const dictionaryTypeConfig = pgTable("dictionary_type_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().unique(), // Matches type from system_dictionaries
  isMultiple: boolean("is_multiple").notNull().default(false), // Allow multiple selection
  displayName: text("display_name").notNull(), // Human-readable name for the type
  description: text("description"), // Optional description
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Event participant expenses - individual expenses per participant per city
export const eventParticipantExpenses = pgTable("event_participant_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: 'cascade' }),
  city: text("city").notNull(),
  expenseType: text("expense_type").notNull(), // PARTICIPANT_EXPENSE_TYPES
  amount: numeric("amount", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("RUB"), // RUB, USD, CNY, EUR
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("event_participant_expense_unique").on(table.eventId, table.dealId, table.city, table.expenseType)
]);

// Event common expenses - shared expenses for entire tour per city
export const eventCommonExpenses = pgTable("event_common_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  city: text("city").notNull(),
  expenseType: text("expense_type").notNull(), // COMMON_EXPENSE_TYPES
  amount: numeric("amount", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("RUB"), // RUB, USD, CNY, EUR
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("event_common_expense_unique").on(table.eventId, table.city, table.expenseType)
]);

// Base expenses catalog - reusable expense templates
export const baseExpenses = pgTable("base_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CNY"), // CNY, EUR, RUB, USD
  category: text("category"), // City or category for grouping (e.g., "Пекин", "Шанхай", "Транспорт")
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ================= ZOD SCHEMAS =================

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const updateUserSchema = insertUserSchema.partial();
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
}).extend({
  // Explicitly define selectedCities to ensure array is properly handled
  selectedCities: z.array(z.string()).nullable().optional(),
  // Explicitly define outcomeType and failureReason for proper validation
  outcomeType: z.enum(["postponed", "failed"]).nullable().optional(),
  failureReason: z.enum(["missing_contact", "expensive", "competitor", "not_target"]).nullable().optional(),
});
export const updateLeadSchema = insertLeadSchema.partial();
export const insertLeadStatusHistorySchema = createInsertSchema(leadStatusHistory).omit({ 
  id: true, 
  changedAt: true 
});

// Form submission schemas - extend to explicitly allow arrays in data field
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({ 
  id: true, 
  submittedAt: true 
}).extend({
  // Explicitly allow string arrays for multi-select form fields
  data: z.record(z.union([z.string(), z.boolean(), z.array(z.string())])),
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

// Settings schemas
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const updateSettingSchema = insertSettingSchema.partial();

// System dictionary schemas
export const insertSystemDictionarySchema = createInsertSchema(systemDictionaries).omit({ id: true, createdAt: true, updatedAt: true });
export const updateSystemDictionarySchema = insertSystemDictionarySchema.partial();

// Dictionary type config schemas
export const insertDictionaryTypeConfigSchema = createInsertSchema(dictionaryTypeConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const updateDictionaryTypeConfigSchema = insertDictionaryTypeConfigSchema.partial();

// Event expense schemas
export const insertParticipantExpenseSchema = createInsertSchema(eventParticipantExpenses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const updateParticipantExpenseSchema = insertParticipantExpenseSchema.partial();

export const insertCommonExpenseSchema = createInsertSchema(eventCommonExpenses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const updateCommonExpenseSchema = insertCommonExpenseSchema.partial();

// Base expense schemas
export const insertBaseExpenseSchema = createInsertSchema(baseExpenses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const updateBaseExpenseSchema = insertBaseExpenseSchema.partial();

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

// Settings types
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;

// System dictionary types
export type SystemDictionary = typeof systemDictionaries.$inferSelect;
export type InsertSystemDictionary = z.infer<typeof insertSystemDictionarySchema>;
export type UpdateSystemDictionary = z.infer<typeof updateSystemDictionarySchema>;

export type DictionaryTypeConfig = typeof dictionaryTypeConfig.$inferSelect;
export type InsertDictionaryTypeConfig = z.infer<typeof insertDictionaryTypeConfigSchema>;
export type UpdateDictionaryTypeConfig = z.infer<typeof updateDictionaryTypeConfigSchema>;

// Dictionary types enum
export const DICTIONARY_TYPES = [
  'lead_source',
  'lead_status', 
  'country',
  'room_type',
  'currency',
  'hotel_category',
  'client_category',
] as const;
export type DictionaryType = typeof DICTIONARY_TYPES[number];

// Event expense types
export type EventParticipantExpense = typeof eventParticipantExpenses.$inferSelect;
export type InsertParticipantExpense = z.infer<typeof insertParticipantExpenseSchema>;
export type UpdateParticipantExpense = z.infer<typeof updateParticipantExpenseSchema>;

export type EventCommonExpense = typeof eventCommonExpenses.$inferSelect;
export type InsertCommonExpense = z.infer<typeof insertCommonExpenseSchema>;
export type UpdateCommonExpense = z.infer<typeof updateCommonExpenseSchema>;

// Base expense types
export type BaseExpense = typeof baseExpenses.$inferSelect;
export type InsertBaseExpense = z.infer<typeof insertBaseExpenseSchema>;
export type UpdateBaseExpense = z.infer<typeof updateBaseExpenseSchema>;

// Complex types with relations
export type EventWithStats = Event & {
  bookedCount: number;
  availableSpots: number;
  statusCounts: {
    pending: number;      // Ожидание (все кроме converted и lost)
    confirmed: number;    // Подтверждено (converted)
    cancelled: number;    // Отменён (lost)
  };
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

// ================= SYNC TABLES =================

// Sync logs table - for tracking WordPress sync operations
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operation: text("operation").notNull(), // 'create', 'update', 'archive', 'error', 'sync_complete'
  entityType: text("entity_type").notNull(), // 'event', 'lead'
  entityId: varchar("entity_id"), // ID of the affected entity
  externalId: text("external_id"), // External ID (WordPress post ID, booking ID)
  details: jsonb("details"), // Additional details about the operation
  status: text("status").notNull().default("success"), // 'success', 'error', 'partial'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sync log schemas
export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({ id: true, createdAt: true });
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

// Sync settings table - for configuring automatic sync
export const syncSettings = pgTable("sync_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // 'tour_sync'
  enabled: boolean("enabled").notNull().default(false),
  intervalHours: integer("interval_hours").notNull().default(24), // 1, 6, 12, 24, 48
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // 'success', 'error'
  lastSyncMessage: text("last_sync_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSyncSettingsSchema = createInsertSchema(syncSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSyncSettings = z.infer<typeof insertSyncSettingsSchema>;
export type SyncSettings = typeof syncSettings.$inferSelect;
