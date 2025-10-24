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

// Tourist table
export const tourists = pgTable("tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
});

// City visit table - stores each city visit for a tourist
export const cityVisits = pgTable("city_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").notNull(),
  city: text("city").notNull(),
  arrivalDate: text("arrival_date").notNull(), // ISO date string
  transportType: text("transport_type").notNull(), // 'train' or 'plane'
  hotelName: text("hotel_name").notNull(),
});

// Zod schemas
export const insertTouristSchema = createInsertSchema(tourists).omit({ id: true });
export const insertCityVisitSchema = createInsertSchema(cityVisits).omit({ id: true });

// Types
export type Tourist = typeof tourists.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;
export type CityVisit = typeof cityVisits.$inferSelect;
export type InsertCityVisit = z.infer<typeof insertCityVisitSchema>;

// Combined type for tourist with their city visits
export type TouristWithVisits = Tourist & {
  visits: CityVisit[];
};
