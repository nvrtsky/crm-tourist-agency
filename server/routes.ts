import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getBitrix24Service } from "./bitrix24";
import { z } from "zod";
import { insertTouristSchema, insertCityVisitSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const bitrix24 = getBitrix24Service();

  // Get tourists for a specific deal
  app.get("/api/tourists/:dealId", async (req, res) => {
    try {
      const { dealId } = req.params;
      const tourists = await storage.getTouristsByDeal(dealId);
      res.json(tourists);
    } catch (error) {
      console.error("Error fetching tourists:", error);
      res.status(500).json({ error: "Failed to fetch tourists" });
    }
  });

  // Create tourist (with Bitrix24 integration)
  app.post("/api/tourists", async (req, res) => {
    try {
      // Validate tourist data
      const touristValidation = insertTouristSchema.safeParse(req.body);
      if (!touristValidation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: touristValidation.error.errors,
        });
      }

      const { dealId, name, email, phone, visits } = touristValidation.data;

      const touristData = {
        dealId,
        name,
        email: email || undefined,
        phone: phone || undefined,
      };

      let bitrixContactId: string | undefined;

      // Create contact in Bitrix24 only if service is available
      if (bitrix24) {
        bitrixContactId = await bitrix24.createContact(touristData);
        await bitrix24.linkContactToDeal(dealId, bitrixContactId);
      }

      // Create tourist in our storage
      const tourist = await storage.createTourist({
        ...touristData,
        bitrixContactId,
      });

      // Create city visits with validation
      const createdVisits = [];
      if (visits && Array.isArray(visits) && visits.length > 0) {
        for (const visit of visits) {
          // Validate each visit
          const visitValidation = insertCityVisitSchema.safeParse({
            touristId: tourist.id,
            city: visit.city,
            arrivalDate: visit.arrivalDate,
            transportType: visit.transportType,
            hotelName: visit.hotelName,
          });

          if (!visitValidation.success) {
            console.error("Invalid visit data:", visitValidation.error);
            continue; // Skip invalid visits
          }

          const cityVisit = await storage.createCityVisit(visitValidation.data);
          createdVisits.push(cityVisit);
        }
      }

      // Update deal user fields with route summary (only if Bitrix24 is available)
      if (bitrix24) {
        await bitrix24.updateDealUserFields(dealId, {
          totalTourists: (await storage.getTouristsByDeal(dealId)).length,
          lastUpdated: new Date().toISOString(),
        });
      }

      res.json({
        ...tourist,
        visits: createdVisits,
      });
    } catch (error) {
      console.error("Error creating tourist:", error);
      res.status(500).json({ error: "Failed to create tourist" });
    }
  });

  // Update tourist
  app.patch("/api/tourists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data (partial schema)
      const updateValidation = insertTouristSchema.partial().safeParse(req.body);
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
        await bitrix24.updateContact(tourist.bitrixContactId, updates);
      }

      // Update in storage
      const updated = await storage.updateTourist(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating tourist:", error);
      res.status(500).json({ error: "Failed to update tourist" });
    }
  });

  // Delete tourist
  app.delete("/api/tourists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Delete from Bitrix24 if exists and service is available
      if (bitrix24 && tourist.bitrixContactId) {
        try {
          await bitrix24.deleteContact(tourist.bitrixContactId);
        } catch (error) {
          console.error("Error deleting Bitrix24 contact:", error);
        }
      }

      // Delete from storage
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
