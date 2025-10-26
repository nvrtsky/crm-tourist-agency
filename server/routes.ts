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
      const tourists = await storage.getTouristsByEntity(entityId);
      res.json(tourists);
    } catch (error) {
      console.error("Error fetching tourists:", error);
      res.status(500).json({ error: "Failed to fetch tourists" });
    }
  });

  // Create tourist (with Bitrix24 integration)
  app.post("/api/tourists", async (req, res) => {
    let createdTourist: any = null;
    let bitrixContactId: string | undefined;

    try {
      // Validate tourist data
      const touristValidation = insertTouristSchema.safeParse(req.body);
      if (!touristValidation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: touristValidation.error.errors,
        });
      }

      const { entityId, entityTypeId, name, email, phone, visits } = touristValidation.data;

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
      };

      // Create contact in Bitrix24 only if service is available
      if (bitrix24) {
        try {
          bitrixContactId = await bitrix24.createContact(touristData);
          await bitrix24.linkContactToEntity(entityId, entityTypeId, bitrixContactId);
        } catch (bitrixError) {
          console.error("Bitrix24 integration failed:", bitrixError);
          return res.status(502).json({
            error: "Failed to create tourist in Bitrix24 CRM",
            details: "Unable to create or link contact in smart process. Please check webhook configuration.",
          });
        }
      }

      // Create tourist in our storage only after Bitrix24 success
      try {
        createdTourist = await storage.createTourist({
          ...touristData,
          bitrixContactId,
        });
      } catch (storageError) {
        // Rollback Bitrix24 contact if storage creation failed
        if (bitrix24 && bitrixContactId) {
          try {
            await bitrix24.deleteContact(bitrixContactId);
            console.log("Cleaned up Bitrix24 contact after storage failure:", bitrixContactId);
          } catch (cleanupError) {
            console.error("Failed to cleanup Bitrix24 contact:", cleanupError);
          }
        }
        throw storageError;
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
            hotelName: visit.hotelName,
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

      // Rollback: delete created tourist (and cleanup Bitrix contact if needed)
      if (createdTourist) {
        try {
          await storage.deleteTourist(createdTourist.id);
          console.log("Rolled back tourist creation:", createdTourist.id);
        } catch (rollbackError) {
          console.error("Failed to rollback tourist creation:", rollbackError);
        }
      }

      // If we created Bitrix contact but never created tourist, clean it up
      if (bitrix24 && bitrixContactId && !createdTourist) {
        try {
          await bitrix24.deleteContact(bitrixContactId);
          console.log("Cleaned up orphaned Bitrix24 contact:", bitrixContactId);
        } catch (cleanupError) {
          console.error("Failed to cleanup Bitrix24 contact:", cleanupError);
        }
      }

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

  // Seed test data from the tour table
  app.post("/api/seed-tourists", async (req, res) => {
    try {
      const { entityId = "dev-entity-123", entityTypeId = "dev-type-1" } = req.body;

      const testTourists = [
        {
          name: "Sadeeva Iuliia",
          phone: "+79151455488",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", hotelName: "Pullman Zhangjiajie" }
          ]
        },
        {
          name: "Sadeeva Emmiia",
          phone: "+79151455488",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", hotelName: "Pullman Zhangjiajie" }
          ]
        },
        {
          name: "Polshchikova Anastasiia",
          phone: "+79119880952",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "13:00", departureDate: "2025-11-05", departureTime: "18:30", transportType: "plane", departureTransportType: "plane", flightNumber: "CA890", hotelName: "Park Plaza Beijing Wangfujing" }
          ]
        },
        {
          name: "Androsova Marfa",
          phone: "+79627323846",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "SU101", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z205", hotelName: "Pullman Zhangjiajie" }
          ]
        },
        {
          name: "Karev Ivan",
          phone: "+79038558094",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", hotelName: "Pullman Zhangjiajie" }
          ]
        },
        {
          name: "Kareva Ekaterina",
          phone: "+79038558094",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", hotelName: "Pullman Zhangjiajie" }
          ]
        },
        {
          name: "Bogdanov Vadim",
          phone: "+79251845075",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "10:15", departureDate: "2025-11-04", departureTime: "11:30", transportType: "train", departureTransportType: "train", flightNumber: "G102", hotelName: "Park Plaza Beijing Wangfujing" }
          ]
        },
        {
          name: "Skachkova Iuliia",
          phone: "+79251845075",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "10:15", departureDate: "2025-11-04", departureTime: "15:20", transportType: "train", departureTransportType: "plane", flightNumber: "G102", hotelName: "Park Plaza Beijing Wangfujing" }
          ]
        },
        {
          name: "Chadova Larisa",
          phone: "+79090227150",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "12:45", departureDate: "2025-11-05", departureTime: "07:30", transportType: "plane", departureTransportType: "train", flightNumber: "HU456", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Luoyang", arrivalDate: "2025-11-05", arrivalTime: "14:00", departureDate: "2025-11-08", departureTime: "08:00", transportType: "train", departureTransportType: "train", flightNumber: "G210", hotelName: "Luoyang Peony Plaza" },
            { city: "Xian", arrivalDate: "2025-11-08", arrivalTime: "15:30", departureDate: "2025-11-12", departureTime: "17:45", transportType: "train", departureTransportType: "plane", flightNumber: "G305", hotelName: "Grand Park Xian" }
          ]
        },
        {
          name: "Chadov Evgenii",
          phone: "+79090227150",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "12:45", departureDate: "2025-11-05", departureTime: "07:30", transportType: "plane", departureTransportType: "train", flightNumber: "HU456", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Luoyang", arrivalDate: "2025-11-05", arrivalTime: "14:00", departureDate: "2025-11-08", departureTime: "08:00", transportType: "train", departureTransportType: "train", flightNumber: "G210", hotelName: "Luoyang Peony Plaza" },
            { city: "Xian", arrivalDate: "2025-11-08", arrivalTime: "15:30", departureDate: "2025-11-12", departureTime: "17:45", transportType: "train", departureTransportType: "plane", flightNumber: "G305", hotelName: "Grand Park Xian" }
          ]
        },
        {
          name: "Smirnov Vitalii",
          phone: "+79697630050",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "11:00", departureDate: "2025-11-04", departureTime: "06:45", transportType: "plane", departureTransportType: "train", flightNumber: "MU567", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Xian", arrivalDate: "2025-11-04", arrivalTime: "13:20", departureDate: "2025-11-08", departureTime: "19:00", transportType: "train", departureTransportType: "plane", flightNumber: "G301", hotelName: "Grand Park Xian" }
          ]
        },
        {
          name: "Meshcheriakova Ekaterina",
          phone: "+79313577015",
          visits: [
            { city: "Beijing", arrivalDate: "2025-10-30", arrivalTime: "16:00", departureDate: "2025-11-03", departureTime: "10:30", transportType: "plane", departureTransportType: "train", flightNumber: "CA789", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Luoyang", arrivalDate: "2025-11-03", arrivalTime: "17:15", departureDate: "2025-11-05", departureTime: "09:00", transportType: "train", departureTransportType: "train", flightNumber: "G208", hotelName: "Luoyang Peony Plaza" },
            { city: "Xian", arrivalDate: "2025-11-05", arrivalTime: "14:45", departureDate: "2025-11-09", departureTime: "16:30", transportType: "train", departureTransportType: "plane", flightNumber: "G302", hotelName: "Grand Park Xian" }
          ]
        },
        {
          name: "Tokarev Aleksei",
          phone: "+79313577015",
          visits: [
            { city: "Beijing", arrivalDate: "2025-10-30", arrivalTime: "16:00", departureDate: "2025-11-03", departureTime: "10:30", transportType: "plane", departureTransportType: "train", flightNumber: "CA789", hotelName: "Park Plaza Beijing Wangfujing" },
            { city: "Luoyang", arrivalDate: "2025-11-03", arrivalTime: "17:15", departureDate: "2025-11-05", departureTime: "09:00", transportType: "train", departureTransportType: "train", flightNumber: "G208", hotelName: "Luoyang Peony Plaza" },
            { city: "Xian", arrivalDate: "2025-11-05", arrivalTime: "14:45", departureDate: "2025-11-09", departureTime: "16:30", transportType: "train", departureTransportType: "plane", flightNumber: "G302", hotelName: "Grand Park Xian" }
          ]
        }
      ];

      const created = [];
      for (const tourist of testTourists) {
        const touristData = {
          entityId,
          entityTypeId,
          name: tourist.name,
          phone: tourist.phone,
        };

        // Create contact in Bitrix24 only if service is available
        let bitrixContactId: string | undefined;
        if (bitrix24) {
          try {
            bitrixContactId = await bitrix24.createContact(touristData);
            await bitrix24.linkContactToEntity(entityId, entityTypeId, bitrixContactId);
          } catch (error) {
            console.error("Bitrix24 integration failed for", tourist.name, error);
          }
        }

        const newTourist = await storage.createTourist({
          ...touristData,
          bitrixContactId,
        });

        // Add visits
        if (tourist.visits && newTourist) {
          for (const visit of tourist.visits) {
            await storage.createCityVisit({
              touristId: newTourist.id,
              city: visit.city as any,
              arrivalDate: visit.arrivalDate,
              arrivalTime: (visit as any).arrivalTime,
              departureDate: (visit as any).departureDate,
              departureTime: (visit as any).departureTime,
              transportType: visit.transportType as any,
              departureTransportType: (visit as any).departureTransportType,
              flightNumber: (visit as any).flightNumber,
              hotelName: visit.hotelName,
            });
          }
        }

        created.push(newTourist);
      }

      res.json({ 
        success: true, 
        count: created.length,
        message: `Создано ${created.length} туристов с тестовыми данными`
      });
    } catch (error) {
      console.error("Error seeding tourists:", error);
      res.status(500).json({ error: "Failed to seed tourists" });
    }
  });

  // Clear all tourists for an entity (useful for testing)
  app.delete("/api/tourists/entity/:entityId", async (req, res) => {
    try {
      const { entityId } = req.params;
      const tourists = await storage.getTouristsByEntity(entityId);

      for (const tourist of tourists) {
        // Delete from Bitrix24 if exists and service is available
        if (bitrix24 && tourist.bitrixContactId) {
          try {
            await bitrix24.deleteContact(tourist.bitrixContactId);
          } catch (error) {
            console.error("Error deleting Bitrix24 contact:", error);
          }
        }

        // Delete from storage
        await storage.deleteTourist(tourist.id);
      }

      res.json({ 
        success: true, 
        count: tourists.length,
        message: `Удалено ${tourists.length} туристов`
      });
    } catch (error) {
      console.error("Error clearing tourists:", error);
      res.status(500).json({ error: "Failed to clear tourists" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
