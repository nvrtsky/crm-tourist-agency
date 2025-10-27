import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getBitrix24Service } from "./bitrix24";
import { z } from "zod";
import { insertTouristSchema, insertCityVisitSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const bitrix24 = getBitrix24Service();

  // Server-side placement registration (bypass client SDK requirement)
  app.post("/api/placement/register", async (req, res) => {
    try {
      if (!bitrix24) {
        return res.status(503).json({
          error: "Bitrix24 service not configured",
          message: "BITRIX24_WEBHOOK_URL not set"
        });
      }

      const result = await bitrix24.bindPlacement({
        PLACEMENT: "CRM_DYNAMIC_176_DETAIL_TAB",
        HANDLER: "https://travel-group-manager-ndt72.replit.app/",
        TITLE: "Управление группой",
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Placement registration error:", error);
      console.error("Error message:", error.message);
      console.error("Error string:", String(error));
      
      // Check if already binded - check both message and stringified error
      const errorStr = String(error.message || error).toLowerCase();
      if (errorStr.includes("already bind") || errorStr.includes("handler already")) {
        console.log("✅ Detected 'already binded' error - returning 409");
        return res.status(409).json({
          error: "already_exists",
          message: "Placement уже зарегистрирован"
        });
      }

      // Check for permission errors
      if (errorStr.includes("forbidden") || errorStr.includes("access denied")) {
        return res.status(403).json({
          error: "permission_denied",
          message: "Недостаточно прав для регистрации placement. Методы placement.* требуют OAuth-приложения с правами на управление интерфейсом. Вебхуки (incoming webhook) не имеют доступа к этим методам."
        });
      }

      res.status(500).json({
        error: "registration_failed",
        message: error.message || "Failed to register placement"
      });
    }
  });

  // Server-side placement check
  app.get("/api/placement/check", async (req, res) => {
    try {
      if (!bitrix24) {
        return res.status(503).json({
          error: "Bitrix24 service not configured"
        });
      }

      const placements = await bitrix24.getPlacementsAsync();
      const targetPlacement = placements.find(
        (p: any) => p.placement === "CRM_DYNAMIC_176_DETAIL_TAB"
      );

      res.json({
        exists: !!targetPlacement,
        placement: targetPlacement || null
      });
    } catch (error: any) {
      console.error("Placement check error:", error);
      
      // Check for permission errors
      const errorStr = String(error.message || error).toLowerCase();
      if (errorStr.includes("forbidden") || errorStr.includes("access denied")) {
        return res.status(403).json({
          error: "permission_denied",
          message: "Недостаточно прав для проверки placements. Методы placement.* требуют OAuth-приложения."
        });
      }
      
      res.status(500).json({
        error: "check_failed",
        message: error.message || "Failed to check placements"
      });
    }
  });

  // Server-side placement removal
  app.post("/api/placement/unbind", async (req, res) => {
    try {
      if (!bitrix24) {
        return res.status(503).json({
          error: "Bitrix24 service not configured"
        });
      }

      await bitrix24.unbindPlacement("CRM_DYNAMIC_176_DETAIL_TAB");

      res.json({
        success: true,
        message: "Placement удалён"
      });
    } catch (error: any) {
      console.error("Placement unbind error:", error);
      
      // Check for permission errors
      const errorStr = String(error.message || error).toLowerCase();
      if (errorStr.includes("forbidden") || errorStr.includes("access denied")) {
        return res.status(403).json({
          error: "permission_denied",
          message: "Недостаточно прав для удаления placement. Методы placement.* требуют OAuth-приложения."
        });
      }
      
      res.status(500).json({
        error: "unbind_failed",
        message: error.message || "Failed to unbind placement"
      });
    }
  });

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
        await bitrix24.updateContact(tourist.bitrixContactId, updates);
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
          passport: "769699508",
          birthDate: "1985-03-15",
          amount: "65000",
          currency: "RUB" as const,
          nights: "5",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", airport: "Sheremetyevo SVO", transfer: "Встреча в аэропорту", departureFlightNumber: "D719", departureAirport: "Beijing Capital", departureTransfer: "До вокзала", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", airport: "Beijing West Station", transfer: "Групповой", departureFlightNumber: "CA456", departureAirport: "Zhangjiajie Hehua", departureTransfer: "Индивидуальный", hotelName: "Pullman Zhangjiajie", roomType: "twin" as const }
          ]
        },
        {
          name: "Sadeeva Emmiia",
          phone: "+79151455488",
          passport: "523486729",
          birthDate: "2010-08-22",
          amount: "55000",
          currency: "RUB" as const,
          nights: "5",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", airport: "Sheremetyevo SVO", transfer: "Встреча в аэропорту", departureFlightNumber: "D719", departureAirport: "Beijing Capital", departureTransfer: "До вокзала", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", airport: "Beijing West Station", transfer: "Групповой", departureFlightNumber: "CA456", departureAirport: "Zhangjiajie Hehua", departureTransfer: "Индивидуальный", hotelName: "Pullman Zhangjiajie", roomType: "twin" as const }
          ]
        },
        {
          name: "Polshchikova Anastasiia",
          phone: "+79119880952",
          passport: "741852963",
          birthDate: "1992-06-10",
          amount: "58000",
          currency: "RUB" as const,
          nights: "4",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "13:00", departureDate: "2025-11-05", departureTime: "18:30", transportType: "plane", departureTransportType: "plane", flightNumber: "CA890", airport: "Domodedovo DME", transfer: "VIP трансфер", departureFlightNumber: "CA891", departureAirport: "Beijing Capital", departureTransfer: "VIP трансфер", hotelName: "Park Plaza Beijing Wangfujing", roomType: "double" as const }
          ]
        },
        {
          name: "Androsova Marfa",
          phone: "+79627323846",
          passport: "258963147",
          birthDate: "1988-11-25",
          amount: "72000",
          currency: "RUB" as const,
          nights: "5",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "SU101", airport: "Vnukovo VKO", transfer: "Встреча с гидом", departureFlightNumber: "D301", departureAirport: "Beijing South", departureTransfer: "Групповой автобус", hotelName: "Park Plaza Beijing Wangfujing", roomType: "double" as const },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z205", airport: "Beijing Railway", transfer: "До отеля", departureFlightNumber: "MU789", departureAirport: "Zhangjiajie Hehua", departureTransfer: "С багажом", hotelName: "Pullman Zhangjiajie", roomType: "double" as const }
          ]
        },
        {
          name: "Karev Ivan",
          phone: "+79038558094",
          passport: "369852741",
          birthDate: "1990-04-18",
          amount: "68000",
          currency: "RUB" as const,
          nights: "5",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", airport: "Sheremetyevo SVO", transfer: "Встреча в аэропорту", departureFlightNumber: "D719", departureAirport: "Beijing Capital", departureTransfer: "До вокзала", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", airport: "Beijing West Station", transfer: "Групповой", departureFlightNumber: "CA456", departureAirport: "Zhangjiajie Hehua", departureTransfer: "Индивидуальный", hotelName: "Pullman Zhangjiajie", roomType: "twin" as const }
          ]
        },
        {
          name: "Kareva Ekaterina",
          phone: "+79038558094",
          passport: "147258369",
          birthDate: "1993-09-05",
          amount: "68000",
          currency: "RUB" as const,
          nights: "5",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "14:30", departureDate: "2025-11-03", departureTime: "09:45", transportType: "plane", departureTransportType: "train", flightNumber: "CA123", airport: "Sheremetyevo SVO", transfer: "Встреча в аэропорту", departureFlightNumber: "D719", departureAirport: "Beijing Capital", departureTransfer: "До вокзала", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Zhangjiajie", arrivalDate: "2025-11-03", arrivalTime: "16:20", departureDate: "2025-11-06", departureTime: "08:15", transportType: "train", departureTransportType: "plane", flightNumber: "Z201", airport: "Beijing West Station", transfer: "Групповой", departureFlightNumber: "CA456", departureAirport: "Zhangjiajie Hehua", departureTransfer: "Индивидуальный", hotelName: "Pullman Zhangjiajie", roomType: "twin" as const }
          ]
        },
        {
          name: "Bogdanov Vadim",
          phone: "+79251845075",
          passport: "951753486",
          birthDate: "1987-12-30",
          amount: "62000",
          currency: "RUB" as const,
          nights: "3",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "10:15", departureDate: "2025-11-04", departureTime: "11:30", transportType: "train", departureTransportType: "train", flightNumber: "G102", airport: "Moscow Kazansky", transfer: "Такси", departureFlightNumber: "G104", departureAirport: "Beijing West", departureTransfer: "На своем", hotelName: "Park Plaza Beijing Wangfujing", roomType: "double" as const }
          ]
        },
        {
          name: "Skachkova Iuliia",
          phone: "+79251845075",
          passport: "852741963",
          birthDate: "1989-02-14",
          amount: "62000",
          currency: "RUB" as const,
          nights: "3",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "10:15", departureDate: "2025-11-04", departureTime: "15:20", transportType: "train", departureTransportType: "plane", flightNumber: "G102", airport: "Moscow Kazansky", transfer: "Такси", departureFlightNumber: "CA902", departureAirport: "Beijing Capital", departureTransfer: "Стандартный", hotelName: "Park Plaza Beijing Wangfujing", roomType: "double" as const }
          ]
        },
        {
          name: "Chadova Larisa",
          phone: "+79090227150",
          passport: "654987321",
          birthDate: "1991-07-08",
          amount: "85000",
          currency: "RUB" as const,
          nights: "11",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "12:45", departureDate: "2025-11-05", departureTime: "07:30", transportType: "plane", departureTransportType: "train", flightNumber: "HU456", airport: "Pulkovo LED", transfer: "Групповая встреча", departureFlightNumber: "G215", departureAirport: "Beijing South", departureTransfer: "Автобус", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Luoyang", arrivalDate: "2025-11-05", arrivalTime: "14:00", departureDate: "2025-11-08", departureTime: "08:00", transportType: "train", departureTransportType: "train", flightNumber: "G210", airport: "Beijing Railway", transfer: "Со станции", departureFlightNumber: "G320", departureAirport: "Luoyang Station", departureTransfer: "Организованный", hotelName: "Luoyang Peony Plaza", roomType: "twin" as const },
            { city: "Xian", arrivalDate: "2025-11-08", arrivalTime: "15:30", departureDate: "2025-11-12", departureTime: "17:45", transportType: "train", departureTransportType: "plane", flightNumber: "G305", airport: "Luoyang Railway", transfer: "Прямой", departureFlightNumber: "MU234", departureAirport: "Xian Xianyang", departureTransfer: "Трансфер в аэропорт", hotelName: "Grand Park Xian", roomType: "twin" as const }
          ]
        },
        {
          name: "Chadov Evgenii",
          phone: "+79090227150",
          passport: "321654987",
          birthDate: "1990-05-20",
          amount: "85000",
          currency: "RUB" as const,
          nights: "11",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "12:45", departureDate: "2025-11-05", departureTime: "07:30", transportType: "plane", departureTransportType: "train", flightNumber: "HU456", airport: "Pulkovo LED", transfer: "Групповая встреча", departureFlightNumber: "G215", departureAirport: "Beijing South", departureTransfer: "Автобус", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Luoyang", arrivalDate: "2025-11-05", arrivalTime: "14:00", departureDate: "2025-11-08", departureTime: "08:00", transportType: "train", departureTransportType: "train", flightNumber: "G210", airport: "Beijing Railway", transfer: "Со станции", departureFlightNumber: "G320", departureAirport: "Luoyang Station", departureTransfer: "Организованный", hotelName: "Luoyang Peony Plaza", roomType: "twin" as const },
            { city: "Xian", arrivalDate: "2025-11-08", arrivalTime: "15:30", departureDate: "2025-11-12", departureTime: "17:45", transportType: "train", departureTransportType: "plane", flightNumber: "G305", airport: "Luoyang Railway", transfer: "Прямой", departureFlightNumber: "MU234", departureAirport: "Xian Xianyang", departureTransfer: "Трансфер в аэропорт", hotelName: "Grand Park Xian", roomType: "twin" as const }
          ]
        },
        {
          name: "Smirnov Vitalii",
          phone: "+79697630050",
          passport: "135792468",
          birthDate: "1986-10-12",
          amount: "74000",
          currency: "RUB" as const,
          nights: "7",
          visits: [
            { city: "Beijing", arrivalDate: "2025-11-01", arrivalTime: "11:00", departureDate: "2025-11-04", departureTime: "06:45", transportType: "plane", departureTransportType: "train", flightNumber: "MU567", airport: "Vnukovo VKO", transfer: "Индивидуальный трансфер", departureFlightNumber: "G315", departureAirport: "Beijing West", departureTransfer: "С сопровождением", hotelName: "Park Plaza Beijing Wangfujing", roomType: "double" as const },
            { city: "Xian", arrivalDate: "2025-11-04", arrivalTime: "13:20", departureDate: "2025-11-08", departureTime: "19:00", transportType: "train", departureTransportType: "plane", flightNumber: "G301", airport: "Beijing Station", transfer: "От отеля", departureFlightNumber: "CA888", departureAirport: "Xian Xianyang", departureTransfer: "Комфорт", hotelName: "Grand Park Xian", roomType: "double" as const }
          ]
        },
        {
          name: "Meshcheriakova Ekaterina",
          phone: "+79313577015",
          passport: "246813579",
          birthDate: "1994-01-28",
          amount: "88000",
          currency: "RUB" as const,
          nights: "10",
          visits: [
            { city: "Beijing", arrivalDate: "2025-10-30", arrivalTime: "16:00", departureDate: "2025-11-03", departureTime: "10:30", transportType: "plane", departureTransportType: "train", flightNumber: "CA789", airport: "Domodedovo DME", transfer: "Встреча с табличкой", departureFlightNumber: "G208", departureAirport: "Beijing Capital", departureTransfer: "До вокзала групповой", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Luoyang", arrivalDate: "2025-11-03", arrivalTime: "17:15", departureDate: "2025-11-05", departureTime: "09:00", transportType: "train", departureTransportType: "train", flightNumber: "G208", airport: "Beijing South Station", transfer: "Гид встретит", departureFlightNumber: "G302", departureAirport: "Luoyang Railway", departureTransfer: "Автобус к поезду", hotelName: "Luoyang Peony Plaza", roomType: "twin" as const },
            { city: "Xian", arrivalDate: "2025-11-05", arrivalTime: "14:45", departureDate: "2025-11-09", departureTime: "16:30", transportType: "train", departureTransportType: "plane", flightNumber: "G302", airport: "Luoyang Station", transfer: "Со станции до отеля", departureFlightNumber: "HU555", departureAirport: "Xian Xianyang", departureTransfer: "Премиум трансфер", hotelName: "Grand Park Xian", roomType: "twin" as const }
          ]
        },
        {
          name: "Tokarev Aleksei",
          phone: "+79313577015",
          passport: "369125804",
          birthDate: "1992-11-03",
          amount: "88000",
          currency: "RUB" as const,
          nights: "10",
          visits: [
            { city: "Beijing", arrivalDate: "2025-10-30", arrivalTime: "16:00", departureDate: "2025-11-03", departureTime: "10:30", transportType: "plane", departureTransportType: "train", flightNumber: "CA789", airport: "Domodedovo DME", transfer: "Встреча с табличкой", departureFlightNumber: "G208", departureAirport: "Beijing Capital", departureTransfer: "До вокзала групповой", hotelName: "Park Plaza Beijing Wangfujing", roomType: "twin" as const },
            { city: "Luoyang", arrivalDate: "2025-11-03", arrivalTime: "17:15", departureDate: "2025-11-05", departureTime: "09:00", transportType: "train", departureTransportType: "train", flightNumber: "G208", airport: "Beijing South Station", transfer: "Гид встретит", departureFlightNumber: "G302", departureAirport: "Luoyang Railway", departureTransfer: "Автобус к поезду", hotelName: "Luoyang Peony Plaza", roomType: "twin" as const },
            { city: "Xian", arrivalDate: "2025-11-05", arrivalTime: "14:45", departureDate: "2025-11-09", departureTime: "16:30", transportType: "train", departureTransportType: "plane", flightNumber: "G302", airport: "Luoyang Station", transfer: "Со станции до отеля", departureFlightNumber: "HU555", departureAirport: "Xian Xianyang", departureTransfer: "Премиум трансфер", hotelName: "Grand Park Xian", roomType: "twin" as const }
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
          passport: tourist.passport,
          birthDate: tourist.birthDate,
          amount: tourist.amount,
          currency: tourist.currency,
          nights: tourist.nights,
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
              airport: (visit as any).airport,
              transfer: (visit as any).transfer,
              departureFlightNumber: (visit as any).departureFlightNumber,
              departureAirport: (visit as any).departureAirport,
              departureTransfer: (visit as any).departureTransfer,
              hotelName: visit.hotelName,
              roomType: (visit as any).roomType,
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

  // Test endpoint: Fetch data from Bitrix24
  app.get("/api/bitrix/test-fetch", async (req, res) => {
    try {
      if (!bitrix24) {
        return res.status(503).json({ 
          error: "Bitrix24 integration not configured",
          message: "BITRIX24_WEBHOOK_URL not set"
        });
      }

      const entityTypeId = String(req.query.entityTypeId || "176");
      const entityId = String(req.query.entityId || "303");

      console.log(`\n🔍 Fetching Bitrix24 data for Smart Process ${entityTypeId}/${entityId}...`);

      // Шаг 1: Получить элемент Smart Process "Событие"
      const smartProcessItem = await bitrix24.getSmartProcessItem(entityTypeId, entityId);
      console.log("📦 Smart Process Item:", JSON.stringify(smartProcessItem, null, 2));

      // Шаг 2: Извлечь поле UF_CRM_9_1711887457 (массив сделок)
      const dealIds = smartProcessItem?.ufCrm9_1711887457 || smartProcessItem?.UF_CRM_9_1711887457 || [];
      console.log(`\n💼 Found ${dealIds.length} deal IDs:`, dealIds);

      if (dealIds.length === 0) {
        return res.json({
          success: true,
          smartProcessItem,
          dealIds: [],
          deals: [],
          tourists: [],
          message: "No deals found in UF_CRM_9_1711887457 field"
        });
      }

      // Шаг 3: Получить данные по каждой сделке
      const deals = await bitrix24.getDeals(dealIds);
      console.log(`\n✅ Fetched ${deals.length} deals`);

      // Шаг 4: Извлечь туристов из каждой сделки
      const allTourists = [];
      for (const deal of deals) {
        console.log(`\n🎫 Processing deal ${deal.ID}:`);
        console.log("Deal data:", JSON.stringify(deal, null, 2));

        // Попробуем разные варианты имени поля
        const touristsField = deal?.ufCrm1702460537 || 
                            deal?.UF_CRM_1702460537 || 
                            deal?.uf_crm_1702460537 ||
                            null;

        console.log("Tourists field value:", touristsField);

        if (touristsField) {
          // Если поле - это JSON-строка, распарсим
          let touristsData = touristsField;
          if (typeof touristsField === 'string') {
            try {
              touristsData = JSON.parse(touristsField);
            } catch (e) {
              console.error("Failed to parse tourists field as JSON:", e);
            }
          }

          // Если это массив объектов
          if (Array.isArray(touristsData)) {
            for (const tourist of touristsData) {
              const name = tourist?.ufCrm1700666127661 || 
                          tourist?.UF_CRM_1700666127661 || 
                          tourist?.uf_crm_1700666127661 ||
                          null;
              const passport = tourist?.ufCrm1700667203530 || 
                              tourist?.UF_CRM_1700667203530 || 
                              tourist?.uf_crm_1700667203530 ||
                              null;

              allTourists.push({
                dealId: deal.ID,
                name,
                passport,
                rawData: tourist
              });

              console.log(`  👤 Tourist: ${name}, Passport: ${passport}`);
            }
          } else {
            // Если это объект
            const name = touristsData?.ufCrm1700666127661 || 
                        touristsData?.UF_CRM_1700666127661 || 
                        touristsData?.uf_crm_1700666127661 ||
                        null;
            const passport = touristsData?.ufCrm1700667203530 || 
                            touristsData?.UF_CRM_1700667203530 || 
                            touristsData?.uf_crm_1700667203530 ||
                            null;

            allTourists.push({
              dealId: deal.ID,
              name,
              passport,
              rawData: touristsData
            });

            console.log(`  👤 Tourist: ${name}, Passport: ${passport}`);
          }
        }
      }

      console.log(`\n✨ Total tourists found: ${allTourists.length}`);

      res.json({
        success: true,
        smartProcessItem,
        dealIds,
        deals,
        tourists: allTourists,
        summary: {
          entityTypeId,
          entityId,
          dealsCount: deals.length,
          touristsCount: allTourists.length
        }
      });

    } catch (error: any) {
      console.error("❌ Error fetching Bitrix24 data:", error);
      res.status(500).json({ 
        error: "Failed to fetch Bitrix24 data",
        message: error.message,
        details: error.toString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
