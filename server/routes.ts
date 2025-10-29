import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getBitrix24Service } from "./bitrix24";
import { z } from "zod";
import { insertTouristSchema, insertCityVisitSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const bitrix24 = getBitrix24Service();

  // Auto-rebind endpoint - fixes placement HANDLER to point to '/' instead of '/install'
  app.get("/install", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Исправление Placement</title>
  <script src="//api.bitrix24.com/api/v1/"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .status {
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .status.info {
      background: #e3f2fd;
      color: #1565c0;
      border-left: 4px solid #1976d2;
    }
    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
      border-left: 4px solid #4caf50;
    }
    .status.error {
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #f44336;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #1976d2;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 15px;
    }
    button:hover {
      background: #1565c0;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔧 Автоматическое исправление Placement</h1>
    <div id="status"></div>
  </div>

  <script>
    const statusEl = document.getElementById('status');
    
    function showStatus(message, type = 'info', spinner = false) {
      statusEl.innerHTML = \`
        <div class="status \${type}">
          \${spinner ? '<div class="spinner"></div>' : ''}
          <div style="margin-top: 10px;">\${message}</div>
        </div>
      \`;
    }

    async function autoRebind() {
      try {
        showStatus('⏳ Инициализация Bitrix24 SDK...', 'info', true);
        
        // Initialize BX24
        await new Promise((resolve, reject) => {
          if (!window.BX24) {
            reject(new Error('BX24 SDK не загружен. Откройте эту страницу из Bitrix24.'));
            return;
          }
          
          BX24.init(() => {
            console.log('✅ BX24.init() завершен');
            resolve();
          });
        });

        showStatus('🔍 Получение информации о текущем placement...', 'info', true);
        
        const placementInfo = BX24.placement.info();
        console.log('Placement info:', placementInfo);
        
        const PLACEMENT_CODE = 'CRM_DYNAMIC_176_DETAIL_TAB';
        
        showStatus('🗑️ Удаление старого placement...', 'info', true);
        
        // Unbind old placement
        await new Promise((resolve, reject) => {
          BX24.callMethod('placement.unbind', {
            PLACEMENT: PLACEMENT_CODE
          }, (result) => {
            if (result.error()) {
              console.error('Ошибка unbind:', result.error());
              // Continue anyway - maybe it wasn't bound
              resolve();
            } else {
              console.log('✅ Placement unbind успешно:', result.data());
              resolve();
            }
          });
        });

        showStatus('✨ Регистрация нового placement с правильным URL...', 'info', true);
        
        // Bind new placement with correct HANDLER
        await new Promise((resolve, reject) => {
          BX24.callMethod('placement.bind', {
            PLACEMENT: PLACEMENT_CODE,
            HANDLER: window.location.origin + '/',
            TITLE: 'Управление группой',
            DESCRIPTION: 'Управление групповыми турами по Китаю'
          }, (result) => {
            if (result.error()) {
              console.error('Ошибка bind:', result.error());
              reject(new Error('Не удалось зарегистрировать placement: ' + result.error()));
            } else {
              console.log('✅ Placement bind успешно:', result.data());
              resolve();
            }
          });
        });

        showStatus(\`
          ✅ <strong>Placement успешно исправлен!</strong><br><br>
          Теперь приложение будет загружаться с правильным URL.<br><br>
          <button onclick="window.location.reload()">🔄 Перезагрузить страницу</button>
        \`, 'success');

      } catch (error) {
        console.error('❌ Ошибка при auto-rebind:', error);
        showStatus(\`
          ❌ <strong>Ошибка:</strong><br>
          \${error.message}<br><br>
          Попробуйте:<br>
          1. Обновить страницу<br>
          2. Открыть приложение из Bitrix24<br>
          3. Проверить права доступа<br><br>
          <button onclick="window.location.reload()">🔄 Попробовать снова</button>
        \`, 'error');
      }
    }

    // Start auto-rebind on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoRebind);
    } else {
      autoRebind();
    }
  </script>
</body>
</html>
    `);
  });

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