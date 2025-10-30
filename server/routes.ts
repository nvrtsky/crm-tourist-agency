import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getBitrix24Service } from "./bitrix24";
import { z } from "zod";
import { insertTouristSchema, insertCityVisitSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const bitrix24 = getBitrix24Service();

  // Get tourists for a specific entity (smart process element)
  app.get("/api/tourists/:entityId", async (req, res) => {
    try {
      const { entityId } = req.params;
      const entityTypeId = req.query.entityTypeId as string || "176"; // Default to Event entity type
      
      // Check if we have data in storage
      let tourists = await storage.getTouristsByEntity(entityId);
      
      // If no data and Bitrix24 is available, try to load from Bitrix24
      if (tourists.length === 0 && bitrix24) {
        try {
          console.log(`No tourists in storage for entity ${entityId}, attempting to load from Bitrix24...`);
          const bitrixTourists = await bitrix24.loadTouristsFromEvent(entityId, entityTypeId);
          
          // Save loaded tourists to storage
          for (const bitrixTourist of bitrixTourists) {
            const created = await storage.createTourist({
              entityId,
              entityTypeId,
              name: bitrixTourist.name,
              email: bitrixTourist.email || undefined,
              phone: bitrixTourist.phone || undefined,
              passport: bitrixTourist.passport || undefined,
              bitrixContactId: bitrixTourist.bitrixContactId,
              bitrixDealId: bitrixTourist.bitrixDealId,
            });
            console.log(`Imported tourist from Bitrix24: ${created.name} (${created.id})`);
          }
          
          // Reload from storage to get the full data
          tourists = await storage.getTouristsByEntity(entityId);
          console.log(`Loaded ${tourists.length} tourists from Bitrix24`);
        } catch (bitrixError) {
          console.error("Failed to load from Bitrix24, using empty data:", bitrixError);
          // Continue with empty array - not critical error
        }
      }
      
      res.json(tourists);
    } catch (error) {
      console.error("Error fetching tourists:", error);
      res.status(500).json({ error: "Failed to fetch tourists" });
    }
  });

  // Create tourist (updates existing Bitrix24 contacts if bitrixContactId provided, does not create new contacts)
  app.post("/api/tourists", async (req, res) => {
    let createdTourist: any = null;

    try {
      // Validate tourist data
      const touristValidation = insertTouristSchema.safeParse(req.body);
      if (!touristValidation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: touristValidation.error.errors,
        });
      }

      const { entityId, entityTypeId, name, email, phone, passport, birthDate, amount, currency, nights, visits } = touristValidation.data;

      // Pre-validate all visits before creating anything
      if (visits && Array.isArray(visits) && visits.length > 0) {
        for (const visit of visits) {
          const visitValidation = insertCityVisitSchema.omit({ touristId: true }).safeParse(visit);
          if (!visitValidation.success) {
            return res.status(400).json({
              error: "Visit validation error",
              details: visitValidation.error.errors,
            });
          }
        }
      }

      const touristData = {
        entityId,
        entityTypeId,
        name,
        email: email || undefined,
        phone: phone || undefined,
        passport: passport || undefined,
        birthDate: birthDate || undefined,
        amount: amount || undefined,
        currency: currency || undefined,
        nights: nights || undefined,
      };

      // Create tourist in storage
      // Note: bitrixContactId can be provided from frontend if linking to existing contact
      createdTourist = await storage.createTourist({
        ...touristData,
        bitrixContactId: touristValidation.data.bitrixContactId,
      });

      // Update existing Bitrix24 contact if bitrixContactId was provided
      if (bitrix24 && createdTourist.bitrixContactId) {
        try {
          await bitrix24.saveTouristToContact(createdTourist.bitrixContactId, {
            name: createdTourist.name,
            email: createdTourist.email,
            phone: createdTourist.phone,
            passport: createdTourist.passport,
          });
          console.log(`Updated existing Bitrix24 contact ${createdTourist.bitrixContactId}`);
        } catch (bitrixError) {
          console.error("Failed to update Bitrix24 contact (non-critical):", bitrixError);
          // Non-critical error - tourist is already created locally
        }
      }

      // Create city visits
      const createdVisits = [];
      if (visits && Array.isArray(visits) && visits.length > 0) {
        for (const visit of visits) {
          const cityVisit = await storage.createCityVisit({
            touristId: createdTourist.id,
            city: visit.city,
            arrivalDate: visit.arrivalDate,
            arrivalTime: visit.arrivalTime,
            departureDate: visit.departureDate,
            departureTime: visit.departureTime,
            transportType: visit.transportType,
            departureTransportType: visit.departureTransportType,
            flightNumber: visit.flightNumber,
            airport: visit.airport,
            transfer: visit.transfer,
            departureFlightNumber: visit.departureFlightNumber,
            departureAirport: visit.departureAirport,
            departureTransfer: visit.departureTransfer,
            hotelName: visit.hotelName,
            roomType: visit.roomType,
          });
          createdVisits.push(cityVisit);
        }
      }

      // Update entity user fields with route summary (only if Bitrix24 is available)
      if (bitrix24) {
        try {
          await bitrix24.updateEntityUserFields(entityId, entityTypeId, {
            totalTourists: (await storage.getTouristsByEntity(entityId)).length,
            lastUpdated: new Date().toISOString(),
          });
        } catch (updateError) {
          console.error("Failed to update entity fields, but tourist was created:", updateError);
          // Non-critical error - tourist is already created, just log it
        }
      }

      res.json({
        ...createdTourist,
        visits: createdVisits,
      });
    } catch (error) {
      console.error("Error creating tourist:", error);

      // Rollback: delete created tourist from storage
      if (createdTourist) {
        try {
          await storage.deleteTourist(createdTourist.id);
          console.log("Rolled back tourist creation:", createdTourist.id);
        } catch (rollbackError) {
          console.error("Failed to rollback tourist creation:", rollbackError);
        }
      }

      res.status(500).json({ error: "Failed to create tourist" });
    }
  });

  // Update tourist
  app.patch("/api/tourists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { visits, ...touristData } = req.body;
      
      // Validate update data (partial schema)
      const updateValidation = insertTouristSchema.partial().safeParse(touristData);
      if (!updateValidation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: updateValidation.error.errors,
        });
      }

      const updates = updateValidation.data;

      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Update contact in Bitrix24 if exists and service is available
      if (bitrix24 && tourist.bitrixContactId) {
        try {
          await bitrix24.saveTouristToContact(tourist.bitrixContactId, {
            name: updates.name || tourist.name,
            email: updates.email !== undefined ? updates.email : tourist.email,
            phone: updates.phone !== undefined ? updates.phone : tourist.phone,
            passport: updates.passport !== undefined ? updates.passport : tourist.passport,
          });
        } catch (bitrixError) {
          console.error("Failed to sync tourist update to Bitrix24:", bitrixError);
          // Continue - not critical, data is saved locally
        }
      }

      // Update in storage
      const updated = await storage.updateTourist(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Update visits if provided
      if (visits && Array.isArray(visits)) {
        // Delete existing visits
        const existingVisits = await storage.getCityVisitsByTourist(id);
        for (const visit of existingVisits) {
          await storage.deleteCityVisit(visit.id);
        }

        // Create new visits
        for (const visit of visits) {
          await storage.createCityVisit({
            touristId: id,
            city: visit.city,
            arrivalDate: visit.arrivalDate,
            arrivalTime: visit.arrivalTime,
            departureDate: visit.departureDate,
            departureTime: visit.departureTime,
            transportType: visit.transportType,
            departureTransportType: visit.departureTransportType,
            flightNumber: visit.flightNumber,
            airport: visit.airport,
            transfer: visit.transfer,
            departureFlightNumber: visit.departureFlightNumber,
            departureAirport: visit.departureAirport,
            departureTransfer: visit.departureTransfer,
            hotelName: visit.hotelName,
            roomType: visit.roomType,
          });
        }
      }

      // Get updated tourist with visits
      const updatedWithVisits = await storage.getTourist(id);
      res.json(updatedWithVisits);
    } catch (error) {
      console.error("Error updating tourist:", error);
      res.status(500).json({ error: "Failed to update tourist" });
    }
  });

  // Delete tourist (only removes from local storage, does not delete Bitrix24 contacts)
  app.delete("/api/tourists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Delete from storage only (Bitrix24 contacts are not deleted)
      await storage.deleteTourist(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tourist:", error);
      res.status(500).json({ error: "Failed to delete tourist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}