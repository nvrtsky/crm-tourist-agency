import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Cities enum
export const CITIES = ["Beijing", "Luoyang", "Xian", "Zhangjiajie"] as const;
export type City = typeof CITIES[number];

// Transport types
export const TRANSPORT_TYPES = ["train", "plane"] as const;
export type TransportType = typeof TRANSPORT_TYPES[number];

// Room types
export const ROOM_TYPES = ["twin", "double"] as const;
export type RoomType = typeof ROOM_TYPES[number];

// Currency types
export const CURRENCIES = ["RUB", "CNY"] as const;
export type Currency = typeof CURRENCIES[number];

// Tourist table - now includes Bitrix24 integration fields
export const tourists = pgTable("tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(), // Bitrix24 Smart Process Element ID
  entityTypeId: text("entity_type_id").notNull(), // Bitrix24 Smart Process Entity Type ID
  bitrixContactId: text("bitrix_contact_id"), // Bitrix24 Contact ID
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  passport: text("passport"), // Passport number
  birthDate: text("birth_date"), // ISO date string
  amount: text("amount"), // Amount as string to preserve precision
  currency: text("currency"), // 'RUB' or 'CNY'
  nights: text("nights"), // Number of nights as string
});

// City visit table - stores each city visit for a tourist
export const cityVisits = pgTable("city_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").notNull(),
  city: text("city").notNull(),
  arrivalDate: text("arrival_date").notNull(), // ISO date string
  arrivalTime: text("arrival_time"), // Time string HH:MM (optional)
  departureDate: text("departure_date"), // ISO date string (optional - tourist may still be in city)
  departureTime: text("departure_time"), // Time string HH:MM (optional)
  transportType: text("transport_type").notNull(), // 'train' or 'plane' for arrival
  departureTransportType: text("departure_transport_type"), // 'train' or 'plane' for departure (optional)
  flightNumber: text("flight_number"), // Flight/train number (optional)
  hotelName: text("hotel_name").notNull(),
  roomType: text("room_type"), // 'twin' or 'double' (optional)
});

// Zod schemas
export const insertCityVisitSchema = createInsertSchema(cityVisits).omit({ id: true });

// Schema for city visits when creating a tourist (without touristId since it's not known yet)
export const insertCityVisitWithoutTouristSchema = insertCityVisitSchema.omit({ touristId: true });

export const insertTouristSchema = createInsertSchema(tourists).omit({ id: true }).extend({
  bitrixContactId: z.string().optional(),
  visits: z.array(insertCityVisitWithoutTouristSchema).optional(),
});

// Types
export type Tourist = typeof tourists.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;
export type CityVisit = typeof cityVisits.$inferSelect;
export type InsertCityVisit = z.infer<typeof insertCityVisitSchema>;

// Combined type for tourist with their city visits
export type TouristWithVisits = Tourist & {
  visits: CityVisit[];
};
