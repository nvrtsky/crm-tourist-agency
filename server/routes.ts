import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireAdmin } from "./auth";
import passport from "passport";
import bcrypt from "bcrypt";
import { z } from "zod";
import multer from "multer";
import { ObjectStorageService } from "./objectStorage";
import { scrapeAllTours, syncToursToDatabase } from "./websiteScraper";
import {
  insertEventSchema,
  updateEventSchema,
  insertContactSchema,
  updateContactSchema,
  insertDealSchema,
  updateDealSchema,
  insertCityVisitSchema,
  insertNotificationSchema,
  updateNotificationSchema,
  insertLeadSchema,
  updateLeadSchema,
  insertLeadStatusHistorySchema,
  insertFormSchema,
  insertFormFieldSchema,
  insertFormSubmissionSchema,
  insertGroupSchema,
  updateGroupSchema,
  insertLeadTouristSchema,
  updateLeadTouristSchema,
  insertUserSchema,
  updateUserSchema,
  loginSchema,
  insertDictionaryTypeConfigSchema,
  type User,
  type LeadTourist,
} from "@shared/schema";

// Utility to sanitize user object (remove password hash)
function sanitizeUser(user: User) {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

// Helper function to get roomType from a deal by traversing deal -> contact -> lead
async function getRoomTypeFromDeal(dealId: string): Promise<string | null> {
  const deal = await storage.getDeal(dealId);
  if (!deal) return null;
  
  const contact = await storage.getContact(deal.contactId);
  if (!contact) return null;
  
  let leadId: string | null = null;
  
  if (contact.leadId) {
    leadId = contact.leadId;
  } else if (contact.leadTouristId) {
    const tourist = await storage.getTourist(contact.leadTouristId);
    if (tourist) leadId = tourist.leadId;
  }
  
  if (!leadId) return null;
  
  const lead = await storage.getLead(leadId);
  return lead?.roomType || null;
}

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow only images and PDFs
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== AUTHENTICATION ROUTES ====================
  
  // Login (with rate limiting and session regeneration)
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 5; // max attempts
  const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
  
  app.post("/api/auth/login", (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid credentials format" });
    }
    
    // Rate limiting
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const attempts = loginAttempts.get(ip);
    
    if (attempts && attempts.count >= RATE_LIMIT && now < attempts.resetAt) {
      const waitMinutes = Math.ceil((attempts.resetAt - now) / 60000);
      return res.status(429).json({ 
        error: `Too many login attempts. Please try again in ${waitMinutes} minutes.`
      });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        // Track failed attempt
        if (!attempts || now >= attempts.resetAt) {
          loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        } else {
          attempts.count++;
        }
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      
      // Clear failed attempts on successful login
      loginAttempts.delete(ip);
      
      // Regenerate session to prevent session fixation
      const oldSession = req.session;
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        
        // Restore any data from old session if needed
        Object.assign(req.session, oldSession);
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({ user: sanitizeUser(user) });
        });
      });
    })(req, res, next);
  });
  
  // Logout (with session regeneration)
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      
      // Regenerate session after logout to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error on logout:", err);
        }
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      return res.json({ user: sanitizeUser(req.user as User) });
    }
    res.status(401).json({ error: "Not authenticated" });
  });
  
  // ==================== USER MANAGEMENT ROUTES ====================
  
  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitized = users.map(sanitizeUser);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Get viewer users (authenticated users only)
  app.get("/api/users/viewers", requireAuth, async (req, res) => {
    try {
      const viewers = await storage.getUsersByRole("viewer");
      const sanitized = viewers.map(sanitizeUser);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching viewers:", error);
      res.status(500).json({ error: "Failed to fetch viewers" });
    }
  });
  
  // Get managers and admins (authenticated users only)
  app.get("/api/users/managers-and-admins", requireAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const managersAndAdmins = allUsers.filter(user => user.role === "admin" || user.role === "manager");
      const sanitized = managersAndAdmins.map(sanitizeUser);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching managers and admins:", error);
      res.status(500).json({ error: "Failed to fetch managers and admins" });
    }
  });
  
  // Create user (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid user data",
          details: validation.error.errors 
        });
      }
      
      const { passwordHash, ...userData } = validation.data;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(passwordHash, 10);
      
      const user = await storage.createUser({
        ...userData,
        passwordHash: hashedPassword
      });
      
      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  
  // Update user (admin only)
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid user data",
          details: validation.error.errors 
        });
      }
      
      let updates = { ...validation.data };
      
      // Hash password if being updated
      if (updates.passwordHash) {
        updates.passwordHash = await bcrypt.hash(updates.passwordHash, 10);
      }
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (req.user && (req.user as User).id === id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  // ==================== EVENT ROUTES ====================

  // Get all events
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      // Auto-archive expired events before fetching (don't let failures block event list)
      try {
        await storage.archiveExpiredEvents();
      } catch (archiveError) {
        console.error("Auto-archive failed (non-blocking):", archiveError);
      }
      
      const user = req.user as User;
      let events = await storage.getAllEventsWithStats();
      
      // Filter events for viewer role - only show events where they are assigned as guide
      if (user.role === "viewer") {
        events = events.filter(event => {
          const cityGuides = event.cityGuides as Record<string, string> | null;
          if (!cityGuides) return false;
          const assignedGuideIds = Object.values(cityGuides);
          return assignedGuideIds.includes(user.id);
        });
      }
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get single event with stats
  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as User;
      const event = await storage.getEventWithStats(id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check viewer access - must be assigned as guide
      if (user.role === "viewer") {
        const cityGuides = event.cityGuides as Record<string, string> | null;
        if (!cityGuides) {
          return res.status(403).json({ error: "Access denied" });
        }
        const assignedGuideIds = Object.values(cityGuides);
        if (!assignedGuideIds.includes(user.id)) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Filter cities to only show assigned ones
        const assignedCities = event.cities.filter(city => cityGuides[city] === user.id);
        event.cities = assignedCities;
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Get event participants (deals with contacts)
  app.get("/api/events/:id/participants", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as User;
      
      // Check viewer access to this event
      if (user.role === "viewer") {
        const event = await storage.getEvent(id);
        if (!event) {
          return res.status(404).json({ error: "Event not found" });
        }
        const cityGuides = event.cityGuides as Record<string, string> | null;
        if (!cityGuides) {
          return res.status(403).json({ error: "Access denied" });
        }
        const assignedGuideIds = Object.values(cityGuides);
        if (!assignedGuideIds.includes(user.id)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const deals = await storage.getDealsByEvent(id);
      
      // Batch fetch all related data to avoid N+1 queries
      const contactIds = Array.from(new Set(deals.map(d => d.contactId)));
      const dealIds = deals.map(d => d.id);
      const groupIds = Array.from(new Set(deals.map(d => d.groupId).filter(Boolean) as string[]));
      
      // Fetch all contacts, visits, and groups in parallel
      const [allContacts, allVisits, allGroups] = await Promise.all([
        Promise.all(contactIds.map(cId => storage.getContact(cId))),
        Promise.all(dealIds.map(dId => storage.getCityVisitsByDeal(dId))),
        groupIds.length > 0 ? Promise.all(groupIds.map(gId => storage.getGroup(gId))) : Promise.resolve([])
      ]);
      
      // Fetch leadTourist data for all contacts
      const leadTouristIds = Array.from(new Set(allContacts.filter(c => c?.leadTouristId).map(c => c!.leadTouristId!)));
      const allLeadTourists = leadTouristIds.length > 0
        ? await Promise.all(leadTouristIds.map(ltId => storage.getTourist(ltId)))
        : [];
      
      // Fetch lead data for all contacts
      const leadIds = Array.from(new Set(allContacts.filter(c => c?.leadId).map(c => c!.leadId!)));
      const allLeads = leadIds.length > 0
        ? await Promise.all(leadIds.map(lId => storage.getLead(lId)))
        : [];
      
      // Create lookup maps
      const contactMap = new Map(allContacts.filter(Boolean).map(c => [c!.id, c!]));
      const visitsMap = new Map(dealIds.map((dId, idx) => [dId, allVisits[idx]]));
      const groupMap = new Map(allGroups.filter(Boolean).map(g => [g!.id, g!]));
      const leadTouristMap = new Map(allLeadTourists.filter((lt): lt is LeadTourist => lt !== undefined).map(lt => [lt.id, lt]));
      const leadMap = new Map(allLeads.filter(Boolean).map(l => [l!.id, l!]));
      
      // For viewers, get their assigned cities
      let assignedCities: string[] = [];
      if (user.role === "viewer") {
        const event = await storage.getEvent(id);
        if (event) {
          const cityGuides = event.cityGuides as Record<string, string> | null;
          if (cityGuides) {
            assignedCities = event.cities.filter(city => cityGuides[city] === user.id);
          }
        }
      }
      
      // Assemble participants using lookups
      const participants = deals
        .map((deal) => {
          const contact = contactMap.get(deal.contactId);
          if (!contact) {
            console.warn(`Contact ${deal.contactId} not found for deal ${deal.id}`);
            return null;
          }
          
          let visits = visitsMap.get(deal.id) || [];
          
          // Filter visits for viewer role - only show assigned cities
          if (user.role === "viewer" && assignedCities.length > 0) {
            visits = visits.filter(visit => assignedCities.includes(visit.city));
          }
          
          const leadTourist = contact.leadTouristId ? leadTouristMap.get(contact.leadTouristId) || null : null;
          const lead = contact.leadId ? leadMap.get(contact.leadId) || null : null;
          
          return {
            deal,
            contact,
            leadTourist,
            lead,
            visits,
            group: deal.groupId ? (groupMap.get(deal.groupId) || null) : null,
          };
        })
        .filter((p) => p !== null);
      
      res.json(participants);
    } catch (error) {
      console.error("Error fetching event participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  // Get event availability
  app.get("/api/events/availability/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      
      // Get event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Count confirmed deals
      const deals = await storage.getDealsByEvent(eventId);
      const confirmedCount = deals.filter(d => d.status === "confirmed").length;
      
      // Calculate availability
      const participantLimit = event.participantLimit;
      const availableSpots = Math.max(0, participantLimit - confirmedCount);
      const availabilityPercentage = participantLimit > 0 
        ? Math.round((availableSpots / participantLimit) * 100) 
        : 0;
      
      res.json({
        eventId,
        participantLimit,
        confirmedCount,
        availableSpots,
        availabilityPercentage,
        isFull: availableSpots === 0,
      });
    } catch (error) {
      console.error("Error fetching event availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Create event
  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can create events
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validation = insertEventSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const event = await storage.createEvent(validation.data);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Update event
  app.patch("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can update events
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { id } = req.params;
      const validation = updateEventSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      // Get old event to compare price
      const oldEvent = await storage.getEvent(id);
      if (!oldEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      const event = await storage.updateEvent(id, validation.data);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // If price changed (compare updated event price with old price), update all related leads' tourCost
      if (event.price !== oldEvent.price) {
        console.log(`[EVENT_UPDATE] Price changed from ${oldEvent.price} to ${event.price}, recalculating lead costs`);
        await storage.updateLeadCostsByEventPrice(id, event.price);
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete event (admin only)
  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteEvent(id);
      
      if (!success) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Archive event
  app.patch("/api/events/:id/archive", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can archive events
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { id } = req.params;
      const event = await storage.archiveEvent(id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Also archive all leads linked to this event
      await storage.archiveLeadsByEvent(id);
      
      res.json(event);
    } catch (error) {
      console.error("Error archiving event:", error);
      res.status(500).json({ error: "Failed to archive event" });
    }
  });

  // Unarchive event
  app.patch("/api/events/:id/unarchive", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can unarchive events
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { id } = req.params;
      const event = await storage.unarchiveEvent(id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Also unarchive all leads linked to this event
      await storage.unarchiveLeadsByEvent(id);
      
      res.json(event);
    } catch (error) {
      console.error("Error unarchiving event:", error);
      res.status(500).json({ error: "Failed to unarchive event" });
    }
  });

  // ==================== EVENT EXPENSE ROUTES ====================

  // Get all expenses for event
  app.get("/api/events/:eventId/expenses", requireAuth, async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const [participantExpenses, commonExpenses] = await Promise.all([
        storage.getParticipantExpensesByEvent(eventId),
        storage.getCommonExpensesByEvent(eventId)
      ]);
      
      res.json({ participantExpenses, commonExpenses });
    } catch (error) {
      console.error("Error fetching event expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Upsert participant expense
  app.put("/api/events/:eventId/expenses/participant", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { eventId } = req.params;
      const { dealId, city, expenseType, amount, currency, comment } = req.body;
      
      if (!dealId || !city || !expenseType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const expense = await storage.upsertParticipantExpense({
        eventId,
        dealId,
        city,
        expenseType,
        amount: amount || null,
        currency: currency || "RUB",
        comment: comment || null
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error saving participant expense:", error);
      res.status(500).json({ error: "Failed to save expense" });
    }
  });

  // Delete participant expense
  app.delete("/api/events/:eventId/expenses/participant", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { eventId } = req.params;
      const { dealId, city, expenseType } = req.body;
      
      if (!dealId || !city || !expenseType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const success = await storage.deleteParticipantExpense(eventId, dealId, city, expenseType);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting participant expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Upsert common expense
  app.put("/api/events/:eventId/expenses/common", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { eventId } = req.params;
      const { city, expenseType, amount, currency, comment } = req.body;
      
      if (!city || !expenseType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const expense = await storage.upsertCommonExpense({
        eventId,
        city,
        expenseType,
        amount: amount || null,
        currency: currency || "RUB",
        comment: comment || null
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error saving common expense:", error);
      res.status(500).json({ error: "Failed to save expense" });
    }
  });

  // Delete common expense
  app.delete("/api/events/:eventId/expenses/common", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { eventId } = req.params;
      const { city, expenseType } = req.body;
      
      if (!city || !expenseType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const success = await storage.deleteCommonExpense(eventId, city, expenseType);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting common expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ==================== BASE EXPENSE ROUTES (CATALOG) ====================

  // Get all base expenses
  app.get("/api/base-expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getAllBaseExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching base expenses:", error);
      res.status(500).json({ error: "Failed to fetch base expenses" });
    }
  });

  // Get single base expense
  app.get("/api/base-expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const expense = await storage.getBaseExpense(id);
      
      if (!expense) {
        return res.status(404).json({ error: "Base expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error fetching base expense:", error);
      res.status(500).json({ error: "Failed to fetch base expense" });
    }
  });

  // Create base expense
  app.post("/api/base-expenses", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create base expenses" });
      }
      
      const { name, amount, currency, category } = req.body;
      
      if (!name || amount === undefined) {
        return res.status(400).json({ error: "Name and amount are required" });
      }
      
      const expense = await storage.createBaseExpense({
        name,
        amount: String(amount),
        currency: currency || "CNY",
        category: category || null
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error creating base expense:", error);
      res.status(500).json({ error: "Failed to create base expense" });
    }
  });

  // Update base expense
  app.patch("/api/base-expenses/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can update base expenses" });
      }
      
      const { id } = req.params;
      const { name, amount, currency, category } = req.body;
      
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (amount !== undefined) updateData.amount = String(amount);
      if (currency !== undefined) updateData.currency = currency;
      if (category !== undefined) updateData.category = category;
      
      const expense = await storage.updateBaseExpense(id, updateData);
      
      if (!expense) {
        return res.status(404).json({ error: "Base expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error updating base expense:", error);
      res.status(500).json({ error: "Failed to update base expense" });
    }
  });

  // Delete base expense
  app.delete("/api/base-expenses/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete base expenses" });
      }
      
      const { id } = req.params;
      const success = await storage.deleteBaseExpense(id);
      
      if (!success) {
        return res.status(404).json({ error: "Base expense not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting base expense:", error);
      res.status(500).json({ error: "Failed to delete base expense" });
    }
  });

  // ==================== CONTACT ROUTES ====================

  // Get all contacts
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  // Get single contact with deals
  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.getContactWithDeals(id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  // Create contact
  app.post("/api/contacts", async (req, res) => {
    try {
      const validation = insertContactSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const contact = await storage.createContact(validation.data);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  // Update contact
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateContactSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const contact = await storage.updateContact(id, validation.data);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Delete contact (admin only)
  app.delete("/api/contacts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteContact(id);
      
      if (!success) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Get contact details (merged with leadTourist data)
  app.get("/api/contacts/:id/details", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const details = await storage.getContactDetails(id);
      
      if (!details) {
        return res.status(404).json({ error: "Contact not found or not linked to tourist data" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching contact details:", error);
      res.status(500).json({ error: "Failed to fetch contact details" });
    }
  });

  // Update contact details (updates leadTourist and syncs to contact)
  app.patch("/api/contacts/:id/details", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as User;
      const validation = updateLeadTouristSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      // Check edit permissions for managers
      if (user.role === 'manager') {
        // Get contact details to check lead assignment
        const contactDetails = await storage.getContactDetails(id);
        
        if (!contactDetails) {
          return res.status(404).json({ error: "Contact not found" });
        }
        
        // Managers can only edit tourists from their assigned leads
        // If no lead or lead cannot be loaded, deny access for security
        if (!contactDetails.contact.leadId) {
          return res.status(403).json({ 
            error: "Access denied",
            message: "You can only edit tourists from your assigned leads"
          });
        }
        
        const lead = await storage.getLead(contactDetails.contact.leadId);
        
        if (!lead || lead.assignedUserId !== user.id) {
          return res.status(403).json({ 
            error: "Access denied",
            message: "You can only edit tourists from your assigned leads"
          });
        }
      }

      await storage.updateContactDetails(id, validation.data);
      
      // Fetch updated details to return
      const updatedDetails = await storage.getContactDetails(id);
      res.json(updatedDetails);
    } catch (error: any) {
      console.error("Error updating contact details:", error);
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(500).json({ error: "Failed to update contact details" });
    }
  });

  // ==================== DEAL ROUTES ====================

  // Get deals for an event
  app.get("/api/events/:eventId/deals", async (req, res) => {
    try {
      const { eventId } = req.params;
      const deals = await storage.getDealsWithDetailsByEvent(eventId);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Get single deal with details
  app.get("/api/deals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deal = await storage.getDealWithDetails(id);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // Create deal
  app.post("/api/deals", async (req, res) => {
    try {
      const validation = insertDealSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const deal = await storage.createDeal(validation.data);
      
      // Auto-create city visits for all cities in the event route
      const event = await storage.getEvent(deal.eventId);
      if (event && event.cities && event.cities.length > 0) {
        // Get roomType from the associated lead
        const roomType = await getRoomTypeFromDeal(deal.id);
        
        for (const city of event.cities) {
          await storage.createCityVisit({
            dealId: deal.id,
            city,
            arrivalDate: event.startDate,
            transportType: "plane",
            hotelName: `Hotel ${city}`,
            roomType: roomType || undefined,
          });
        }
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // Update deal
  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateDealSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const deal = await storage.updateDeal(id, validation.data);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // Delete deal (admin only)
  app.delete("/api/deals/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDeal(id);
      
      if (!success) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // ==================== CITY VISIT ROUTES ====================

  // Get visits for a deal
  app.get("/api/deals/:dealId/visits", async (req, res) => {
    try {
      const { dealId } = req.params;
      const visits = await storage.getCityVisitsByDeal(dealId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  // Create city visit
  app.post("/api/deals/:dealId/visits", async (req, res) => {
    try {
      const { dealId } = req.params;
      const visitData = { ...req.body, dealId };
      
      const validation = insertCityVisitSchema.safeParse(visitData);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      // If roomType not provided in request, inherit from lead
      let visitDataWithRoomType = validation.data;
      if (!visitDataWithRoomType.roomType) {
        const roomType = await getRoomTypeFromDeal(dealId);
        if (roomType) {
          visitDataWithRoomType = { ...visitDataWithRoomType, roomType };
        }
      }

      const visit = await storage.createCityVisit(visitDataWithRoomType);
      res.json(visit);
    } catch (error) {
      console.error("Error creating visit:", error);
      res.status(500).json({ error: "Failed to create visit" });
    }
  });

  // Update city visit
  app.patch("/api/visits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertCityVisitSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const visit = await storage.updateCityVisit(id, validation.data);
      
      if (!visit) {
        return res.status(404).json({ error: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      console.error("Error updating visit:", error);
      res.status(500).json({ error: "Failed to update visit" });
    }
  });

  // Delete city visit (admin only)
  app.delete("/api/visits/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCityVisit(id);
      
      if (!success) {
        return res.status(404).json({ error: "Visit not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting visit:", error);
      res.status(500).json({ error: "Failed to delete visit" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  // Get all notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notifications
  app.get("/api/notifications/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Delete notification (admin only)
  app.delete("/api/notifications/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNotification(id);
      
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ==================== LEAD ROUTES ====================

  // Get all leads (with role-based filtering)
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const leads = await storage.getAllLeads(user?.id, user?.role);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get single lead
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lead = await storage.getLead(id);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // Get lead status history
  app.get("/api/leads/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getHistoryByLead(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching lead history:", error);
      res.status(500).json({ error: "Failed to fetch lead history" });
    }
  });

  // Create lead
  app.post("/api/leads", async (req, res) => {
    try {
      // Extract tourist-specific fields from request body
      const { 
        dateOfBirth, 
        passportSeries, 
        passportIssuedBy, 
        registrationAddress,
        foreignPassportName,
        foreignPassportNumber, 
        foreignPassportValidUntil,
        ...leadData 
      } = req.body;
      
      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      // Create lead with auto-created tourist in a single transaction
      // Pass tourist data separately to be added to the auto-created tourist
      const touristData = {
        dateOfBirth: dateOfBirth || null,
        passportSeries: passportSeries || null,
        passportIssuedBy: passportIssuedBy || null,
        registrationAddress: registrationAddress || null,
        foreignPassportName: foreignPassportName || null,
        foreignPassportNumber: foreignPassportNumber || null,
        foreignPassportValidUntil: foreignPassportValidUntil || null,
      };
      
      const lead = await storage.createLeadWithAutoTourist(validation.data, touristData);
      
      // Auto-convert if eventId is set during creation
      if (lead.eventId) {
        console.log(`[CREATE_LEAD] EventId ${lead.eventId} set on creation, triggering auto-conversion`);
        await autoConvertLeadToEvent(lead.id, lead.eventId);
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Update lead
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[UPDATE_LEAD] Updating lead ${id} with data:`, JSON.stringify(req.body, null, 2));
      
      // Convert postponedUntil string to Date if present (JSON.stringify converts Date to ISO string)
      const dataToValidate = { ...req.body };
      if (dataToValidate.postponedUntil && typeof dataToValidate.postponedUntil === 'string') {
        dataToValidate.postponedUntil = new Date(dataToValidate.postponedUntil);
      }
      
      const validation = updateLeadSchema.safeParse(dataToValidate);
      
      if (!validation.success) {
        console.error(`[UPDATE_LEAD] Validation failed:`, JSON.stringify(validation.error.errors, null, 2));
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }
      console.log(`[UPDATE_LEAD] Validation successful, data:`, JSON.stringify(validation.data, null, 2));

      // Get the current lead before updating to check if eventId is changing
      const currentLead = await storage.getLead(id);
      if (!currentLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const lead = await storage.updateLead(id, validation.data);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Auto-convert if eventId was set or changed
      const eventIdChanged = validation.data.hasOwnProperty('eventId') && 
                            validation.data.eventId !== currentLead.eventId;
      const eventIdIsSet = lead.eventId !== null && lead.eventId !== undefined;
      
      if (eventIdChanged && eventIdIsSet && lead.eventId) {
        console.log(`[UPDATE_LEAD] EventId changed from ${currentLead.eventId} to ${lead.eventId}, triggering auto-conversion`);
        await autoConvertLeadToEvent(id, lead.eventId, currentLead.eventId);
      }
      
      // Sync auto-created tourist if contact fields changed
      const contactFields = ['lastName', 'firstName', 'middleName', 'email', 'phone'];
      const hasContactChanges = contactFields.some(field => validation.data.hasOwnProperty(field));
      
      if (hasContactChanges) {
        console.log(`[UPDATE_LEAD] Contact fields changed, checking for auto-created tourist`);
        const tourists = await storage.getTouristsByLead(id);
        const autoCreatedTourist = tourists.find(t => t.isAutoCreated);
        
        if (autoCreatedTourist) {
          console.log(`[UPDATE_LEAD] Syncing auto-created tourist ${autoCreatedTourist.id}`);
          const touristUpdates: any = {};
          
          if (validation.data.lastName !== undefined) touristUpdates.lastName = validation.data.lastName;
          if (validation.data.firstName !== undefined) touristUpdates.firstName = validation.data.firstName;
          if (validation.data.middleName !== undefined) touristUpdates.middleName = validation.data.middleName;
          if (validation.data.email !== undefined) touristUpdates.email = validation.data.email;
          if (validation.data.phone !== undefined) touristUpdates.phone = validation.data.phone;
          
          await storage.updateTourist(autoCreatedTourist.id, touristUpdates);
          console.log(`[UPDATE_LEAD] Auto-created tourist synced`);
        }
      }
      
      // Sync roomType to cityVisits if changed (compare persisted values)
      if (lead.roomType && lead.roomType !== currentLead.roomType) {
        console.log(`[UPDATE_LEAD] RoomType changed from '${currentLead.roomType}' to '${lead.roomType}', syncing to cityVisits`);
        await storage.syncLeadRoomTypeToCityVisits(id, lead.roomType);
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Delete lead (admin only)
  app.delete("/api/leads/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteLead(id);
      
      if (!success) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Archive lead
  app.patch("/api/leads/:id/archive", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can archive leads
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { id } = req.params;
      const lead = await storage.archiveLead(id);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error archiving lead:", error);
      res.status(500).json({ error: "Failed to archive lead" });
    }
  });

  // Unarchive lead
  app.patch("/api/leads/:id/unarchive", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admin and manager can unarchive leads
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { id } = req.params;
      const lead = await storage.unarchiveLead(id);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error unarchiving lead:", error);
      res.status(500).json({ error: "Failed to unarchive lead" });
    }
  });

  // ==================== LEAD TOURISTS ROUTES ====================
  
  // Get tourists for a lead
  app.get("/api/leads/:id/tourists", async (req, res) => {
    try {
      const { id } = req.params;
      const tourists = await storage.getTouristsByLead(id);
      res.json(tourists);
    } catch (error) {
      console.error("Error fetching tourists:", error);
      res.status(500).json({ error: "Failed to fetch tourists" });
    }
  });

  // Create a tourist for a lead
  app.post("/api/leads/:id/tourists", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertLeadTouristSchema.safeParse({ ...req.body, leadId: id });
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }
      
      // Check if trying to create a primary tourist when one already exists
      if (validation.data.isPrimary) {
        const existingTourists = await storage.getTouristsByLead(id);
        const hasPrimaryTourist = existingTourists.some(t => t.isPrimary);
        
        if (hasPrimaryTourist) {
          return res.status(400).json({
            error: "Основной турист уже существует для этого лида. Может быть только один основной турист.",
          });
        }
      }
      
      const tourist = await storage.createTourist(validation.data);
      console.log(`[CREATE_TOURIST] Created tourist ${tourist.id} for lead ${id}`);
      
      // Auto-convert tourist to contact + deal if lead has eventId set
      const lead = await storage.getLead(id);
      if (lead && lead.eventId) {
        console.log(`[CREATE_TOURIST] Lead ${id} has eventId ${lead.eventId}, triggering auto-conversion`);
        await autoConvertLeadToEvent(id, lead.eventId);
      }
      
      res.json(tourist);
    } catch (error) {
      console.error("Error creating tourist:", error);
      res.status(500).json({ error: "Failed to create tourist" });
    }
  });

  // Update a tourist
  app.patch("/api/tourists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateLeadTouristSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }
      
      // Separate isPrimary from other updates
      const { isPrimary, ...otherUpdates } = validation.data;
      
      // If updating isPrimary to true, toggle primary status first
      if (isPrimary === true) {
        const existingTourist = await storage.getTourist(id);
        if (!existingTourist) {
          return res.status(404).json({ error: "Tourist not found" });
        }
        
        await storage.togglePrimaryTourist(existingTourist.leadId, id);
      }
      
      // Apply other field updates if any
      if (Object.keys(otherUpdates).length > 0) {
        const tourist = await storage.updateTourist(id, otherUpdates);
        
        if (!tourist) {
          return res.status(404).json({ error: "Tourist not found" });
        }
        
        res.json(tourist);
      } else {
        // If only isPrimary was updated, fetch and return the updated tourist
        const updatedTourist = await storage.getTourist(id);
        res.json(updatedTourist);
      }
    } catch (error) {
      console.error("Error updating tourist:", error);
      res.status(500).json({ error: "Failed to update tourist" });
    }
  });

  // Delete a tourist (admin only)
  app.delete("/api/tourists/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTourist(id);
      
      if (!success) {
        return res.status(404).json({ error: "Tourist not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tourist:", error);
      res.status(500).json({ error: "Failed to delete tourist" });
    }
  });

  // Upload passport scan file
  app.post("/api/tourists/:id/passport-scans", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check if tourist exists
      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Upload file to object storage
      const objectStorageService = new ObjectStorageService();
      const fileUrl = await objectStorageService.uploadFile(req.file, "passport-scans");

      // Add file URL to tourist's passportScans array
      const currentScans = tourist.passportScans || [];
      const updatedScans = [...currentScans, fileUrl];
      
      const updatedTourist = await storage.updateTourist(id, {
        passportScans: updatedScans,
      });

      res.json({ 
        success: true, 
        fileUrl,
        tourist: updatedTourist,
      });
    } catch (error) {
      console.error("Error uploading passport scan:", error);
      res.status(500).json({ error: "Failed to upload passport scan" });
    }
  });

  // Delete passport scan file
  app.delete("/api/tourists/:id/passport-scans/:filename", requireAuth, async (req, res) => {
    try {
      const { id, filename } = req.params;
      
      // Check if tourist exists
      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Find the file path in passportScans array
      const currentScans = tourist.passportScans || [];
      const fileToDelete = currentScans.find(scan => scan.includes(filename));
      
      if (!fileToDelete) {
        return res.status(404).json({ error: "File not found" });
      }

      // Delete file from object storage
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.deleteFile(fileToDelete);

      // Remove file URL from tourist's passportScans array
      const updatedScans = currentScans.filter(scan => scan !== fileToDelete);
      
      const updatedTourist = await storage.updateTourist(id, {
        passportScans: updatedScans,
      });

      res.json({ 
        success: true,
        tourist: updatedTourist,
      });
    } catch (error) {
      console.error("Error deleting passport scan:", error);
      res.status(500).json({ error: "Failed to delete passport scan" });
    }
  });

  // Proxy endpoint for viewing passport scan
  app.get("/api/tourists/:id/passport-scans/:filename/view", requireAuth, async (req, res) => {
    try {
      const { id, filename } = req.params;
      
      // Check if tourist exists
      const tourist = await storage.getTourist(id);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      // Find the file path in passportScans array
      const currentScans = tourist.passportScans || [];
      const filePath = currentScans.find(scan => scan.includes(filename));
      
      if (!filePath) {
        return res.status(404).json({ error: "File not found" });
      }

      // Get file buffer and content type
      const objectStorageService = new ObjectStorageService();
      const { buffer, contentType } = await objectStorageService.getFileBuffer(filePath);

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error getting passport scan URL:", error);
      res.status(500).json({ error: "Failed to get file" });
    }
  });

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Auto-convert lead to contacts and deals when eventId is set
   * Does NOT change lead status (unlike manual convert endpoint)
   * @param previousEventId - The previous eventId (if lead is changing events). Used to locate correct deals to update.
   * Returns true if conversion happened, false if skipped (already converted)
   */
  async function autoConvertLeadToEvent(leadId: string, eventId: string, previousEventId?: string | null): Promise<boolean> {
    try {
      // Guard against null/undefined eventId
      if (!eventId) {
        console.log(`[AUTO_CONVERT] EventId is null/undefined, skipping auto-conversion`);
        return false;
      }
      
      console.log(`[AUTO_CONVERT] Checking auto-conversion for lead ${leadId} to event ${eventId}${previousEventId ? ` (from ${previousEventId})` : ''}`);

      // Get lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        console.log(`[AUTO_CONVERT] Lead ${leadId} not found, skipping`);
        return false;
      }

      // Verify event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        console.log(`[AUTO_CONVERT] Event ${eventId} not found, skipping`);
        return false;
      }

      // Get tourists for this lead
      const tourists = await storage.getTouristsByLead(leadId);
      console.log(`[AUTO_CONVERT] Found ${tourists.length} tourists for lead ${leadId}`);

      // If no tourists, fallback to creating from lead data
      if (tourists.length === 0) {
        console.log("[AUTO_CONVERT] No tourists found, using fallback logic");

        const contact = await storage.createContact({
          name: `${lead.firstName} ${lead.lastName}${lead.middleName ? ' ' + lead.middleName : ''}`.trim(),
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          leadId: lead.id,
          notes: lead.notes || undefined,
        });

        const deal = await storage.createDeal({
          contactId: contact.id,
          eventId: eventId,
          status: 'pending',
          amount: event.price,
        });

        // Auto-create city visits
        if (event.cities && event.cities.length > 0) {
          for (const city of event.cities) {
            await storage.createCityVisit({
              dealId: deal.id,
              city,
              arrivalDate: event.startDate,
              transportType: "plane",
              hotelName: `Hotel ${city}`,
              roomType: lead.roomType || undefined,
            });
          }
        }

        console.log(`[AUTO_CONVERT] SUCCESS: Created contact ${contact.id} and deal ${deal.id}`);
        return true;
      }

      // If tourists exist, create contacts from all tourists
      console.log("[AUTO_CONVERT] Using tourists logic");
      let group = null;
      const contacts = [];
      const deals = [];

      // If multiple tourists, create a family group
      if (tourists.length > 1) {
        const primaryTourist = tourists.find(p => p.isPrimary) || tourists[0];
        console.log(`[AUTO_CONVERT] Creating family group for ${tourists.length} tourists`);
        group = await storage.createGroup({
          eventId,
          name: `Семья ${primaryTourist.lastName}`,
          type: 'family',
        });
        console.log(`[AUTO_CONVERT] Created group ${group.id}: ${group.name}`);
      }

      // Create contacts and deals for each tourist
      for (const tourist of tourists) {
        const touristFullName = `${tourist.firstName} ${tourist.lastName}${tourist.middleName ? ' ' + tourist.middleName : ''}`.trim();
        
        // Check if contact already exists for this tourist
        let contact = await storage.getContactByLeadTourist(tourist.id);
        
        if (contact) {
          console.log(`[AUTO_CONVERT] Contact ${contact.id} already exists for tourist ${tourist.id}`);
          
          // Check if deal already exists for this event
          const existingDeals = await storage.getDealsByContact(contact.id);
          const dealForThisEvent = existingDeals.find(d => d.eventId === eventId);
          
          if (dealForThisEvent) {
            console.log(`[AUTO_CONVERT] Deal ${dealForThisEvent.id} already exists for contact ${contact.id} on event ${eventId}, skipping`);
            contacts.push(contact);
            deals.push(dealForThisEvent);
            continue; // Skip to next tourist
          }
          
          // If contact has deals for OTHER events, handle based on whether we're migrating or adding new
          if (existingDeals.length > 0) {
            // Only update an existing deal if we're explicitly migrating from previousEventId
            if (previousEventId) {
              const dealToUpdate = existingDeals.find(d => d.eventId === previousEventId);
              
              if (dealToUpdate) {
                console.log(`[AUTO_CONVERT] Found deal ${dealToUpdate.id} for previousEventId ${previousEventId}`);
                console.log(`[AUTO_CONVERT] Updating existing deal ${dealToUpdate.id} from event ${dealToUpdate.eventId} to event ${eventId}`);
                const updatedDeal = await storage.updateDeal(dealToUpdate.id, { 
                  eventId: eventId,
                  groupId: group?.id,
                  isPrimaryInGroup: tourist.isPrimary,
                });
                contacts.push(contact);
                deals.push(updatedDeal!);
                continue; // Skip to next tourist
              } else {
                console.log(`[AUTO_CONVERT] WARNING: No deal found for previousEventId ${previousEventId}, will create new deal`);
              }
            } else {
              // No previousEventId means this is a new tourist joining existing contact
              // Fall through to create a new deal (don't update existing deals)
              console.log(`[AUTO_CONVERT] Contact ${contact.id} has existing deals but no previousEventId - creating new deal for this tourist`);
            }
          }
        } else {
          // Create new contact if it doesn't exist
          console.log(`[AUTO_CONVERT] Creating new contact for tourist ${touristFullName}`);
          contact = await storage.createContact({
            name: touristFullName,
            email: tourist.email || undefined,
            phone: tourist.phone || undefined,
            birthDate: tourist.dateOfBirth || undefined,
            leadId: lead.id,
            leadTouristId: tourist.id, // Link to detailed tourist data
            notes: tourist.notes || undefined,
          });
          console.log(`[AUTO_CONVERT] Created contact ${contact.id} linked to tourist ${tourist.id}`);
        }
        
        contacts.push(contact);

        // Create new deal for this contact and event
        const deal = await storage.createDeal({
          contactId: contact.id,
          eventId: eventId,
          status: 'pending',
          amount: event.price,
          groupId: group?.id,
          isPrimaryInGroup: tourist.isPrimary,
        });
        deals.push(deal);
        console.log(`[AUTO_CONVERT] Created deal ${deal.id} for contact ${contact.id}`);

        // Auto-create city visits for each deal
        if (event.cities && event.cities.length > 0) {
          for (const city of event.cities) {
            await storage.createCityVisit({
              dealId: deal.id,
              city,
              arrivalDate: event.startDate,
              transportType: "plane",
              hotelName: `Hotel ${city}`,
              roomType: lead.roomType || undefined,
            });
          }
        }
      }

      const successMessage = tourists.length > 1 
        ? `Created ${contacts.length} contacts and family group` 
        : 'Lead auto-converted successfully';
      
      console.log(`[AUTO_CONVERT] SUCCESS: ${successMessage}`);
      return true;
    } catch (error) {
      console.error("[AUTO_CONVERT] Error during auto-conversion:", error);
      // Don't throw - just log and return false so the lead update can still succeed
      return false;
    }
  }

  // ==================== LEAD CONVERSION ROUTES ====================

  // Convert lead to contact + deal (with participants support)
  app.post("/api/leads/:id/convert", async (req, res) => {
    try {
      const { id } = req.params;
      const { eventId } = req.body;

      console.log(`[CONVERT] Starting conversion for lead ${id} to event ${eventId}`);

      if (!eventId) {
        console.log("[CONVERT] Error: No eventId provided");
        return res.status(400).json({ error: "Event ID is required" });
      }

      // Get lead
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Verify event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Get tourists for this lead
      const tourists = await storage.getTouristsByLead(id);
      console.log(`[CONVERT] Found ${tourists.length} tourists for lead ${id}`);

      // If no tourists, fallback to old behavior (create from lead data)
      if (tourists.length === 0) {
        console.log("[CONVERT] No tourists found, using fallback logic");

        const contact = await storage.createContact({
          name: `${lead.firstName} ${lead.lastName}${lead.middleName ? ' ' + lead.middleName : ''}`.trim(),
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          leadId: lead.id,
          notes: lead.notes || undefined,
        });

        const deal = await storage.createDeal({
          contactId: contact.id,
          eventId: eventId,
          status: 'pending',
          amount: event.price,
        });

        // Auto-create city visits
        if (event.cities && event.cities.length > 0) {
          for (const city of event.cities) {
            await storage.createCityVisit({
              dealId: deal.id,
              city,
              arrivalDate: event.startDate,
              transportType: "plane",
              hotelName: `Hotel ${city}`,
              roomType: lead.roomType || undefined,
            });
          }
        }

        await storage.updateLead(id, { status: 'won' });
        return res.json({ contact, deal });
      }

      // If tourists exist, create contacts from all tourists
      console.log("[CONVERT] Using tourists logic");
      let group = null;
      const contacts = [];
      const deals = [];

      // If multiple tourists, create a family group
      if (tourists.length > 1) {
        const primaryTourist = tourists.find(p => p.isPrimary) || tourists[0];
        console.log(`[CONVERT] Creating family group for ${tourists.length} tourists`);
        group = await storage.createGroup({
          eventId,
          name: `Семья ${primaryTourist.lastName}`,
          type: 'family',
        });
        console.log(`[CONVERT] Created group ${group.id}: ${group.name}`);
      }

      // Create contacts and deals for each tourist
      for (const tourist of tourists) {
        const touristFullName = `${tourist.firstName} ${tourist.lastName}${tourist.middleName ? ' ' + tourist.middleName : ''}`.trim();
        console.log(`[CONVERT] Creating contact for tourist ${touristFullName}`);
        const contact = await storage.createContact({
          name: touristFullName,
          email: tourist.email || undefined,
          phone: tourist.phone || undefined,
          birthDate: tourist.dateOfBirth || undefined,
          leadId: lead.id,
          leadTouristId: tourist.id, // Link to detailed tourist data
          notes: tourist.notes || undefined,
        });
        contacts.push(contact);
        console.log(`[CONVERT] Created contact ${contact.id} linked to tourist ${tourist.id}`);

        const deal = await storage.createDeal({
          contactId: contact.id,
          eventId: eventId,
          status: 'pending',
          amount: event.price,
          groupId: group?.id,
          isPrimaryInGroup: tourist.isPrimary,
        });
        deals.push(deal);
        console.log(`[CONVERT] Created deal ${deal.id} for contact ${contact.id}`);


        // Auto-create city visits for each deal
        if (event.cities && event.cities.length > 0) {
          for (const city of event.cities) {
            await storage.createCityVisit({
              dealId: deal.id,
              city,
              arrivalDate: event.startDate,
              transportType: "plane",
              hotelName: `Hotel ${city}`,
              roomType: lead.roomType || undefined,
            });
          }
        }
      }

      // Note: isFull is automatically updated by storage.createDeal when status is 'confirmed'

      // Update lead status to 'won'
      console.log(`[CONVERT] Updating lead ${id} status to 'won'`);
      await storage.updateLead(id, { status: 'won' });

      const successMessage = tourists.length > 1 
        ? `Created ${contacts.length} contacts and family group` 
        : 'Lead converted successfully';
      
      console.log(`[CONVERT] SUCCESS: ${successMessage}`);
      res.json({ 
        contacts, 
        deals,
        group,
        message: successMessage
      });
    } catch (error) {
      console.error("[CONVERT] Error converting lead:", error);
      res.status(500).json({ error: "Failed to convert lead" });
    }
  });

  // Convert lead to family group
  app.post("/api/leads/:id/convert-family", async (req, res) => {
    // Define validation schema for family members
    const familyMemberSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      passport: z.string().optional().nullable(),
      birthDate: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    });

    const convertFamilySchema = z.object({
      eventId: z.string().min(1, "Event ID is required"),
      groupName: z.string().optional(),
      members: z.array(familyMemberSchema).min(1, "At least one member is required"),
    });

    try {
      const { id } = req.params;

      // Validate request body upfront
      const validation = convertFamilySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const { eventId, groupName, members } = validation.data;

      // Verify lead exists
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Verify event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Track created resources for rollback in case of failure
      let group: any = null;
      const createdContactIds: string[] = [];
      const createdDealIds: string[] = [];

      try {
        // Create group
        group = await storage.createGroup({
          eventId,
          name: groupName || `Семья ${lead.lastName}`,
          type: "family",
        });

        // Create contacts and deals for each family member
        const createdDeals = [];
        for (let i = 0; i < members.length; i++) {
          const memberData = members[i];

          // Create contact
          const contact = await storage.createContact({
            name: memberData.name,
            email: memberData.email || null,
            phone: memberData.phone || null,
            passport: memberData.passport || null,
            birthDate: memberData.birthDate || null,
            leadId: id,
            notes: memberData.notes || null,
          });
          createdContactIds.push(contact.id);

          // Create deal
          const deal = await storage.createDeal({
            contactId: contact.id,
            eventId: eventId,
            status: 'pending',
            amount: event.price,
            groupId: group.id,
            isPrimaryInGroup: i === 0, // First member is primary
          });
          createdDealIds.push(deal.id);

          // Auto-create city visits for all cities in the event route
          if (event.cities && event.cities.length > 0) {
            for (const city of event.cities) {
              await storage.createCityVisit({
                dealId: deal.id,
                city,
                arrivalDate: event.startDate,
                transportType: "plane",
                hotelName: `Hotel ${city}`,
                roomType: lead.roomType || undefined,
              });
            }
          }

          createdDeals.push(deal);
        }

        // Update lead status to 'won' only after all members are created successfully
        await storage.updateLead(id, { status: 'won' });

        res.json({ 
          group,
          deals: createdDeals,
          message: `Successfully created family group with ${createdDeals.length} members`
        });
      } catch (creationError) {
        // Rollback: Delete created resources in reverse order
        console.error("Error during family creation, rolling back:", creationError);

        // Delete city visits (cascades via deal deletion)
        for (const dealId of createdDealIds) {
          try {
            await storage.deleteDeal(dealId);
          } catch (e) {
            console.error(`Failed to rollback deal ${dealId}:`, e);
          }
        }

        // Delete contacts
        for (const contactId of createdContactIds) {
          try {
            await storage.deleteContact(contactId);
          } catch (e) {
            console.error(`Failed to rollback contact ${contactId}:`, e);
          }
        }

        // Delete group
        if (group) {
          try {
            await storage.deleteGroup(group.id);
          } catch (e) {
            console.error(`Failed to rollback group ${group.id}:`, e);
          }
        }

        throw creationError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error converting lead to family:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to convert lead to family";
      res.status(500).json({ error: errorMessage });
    }
  });

  // ==================== FORM ROUTES ====================

  // Get all forms
  app.get("/api/forms", async (req, res) => {
    try {
      const forms = await storage.getAllForms();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  // Get single form with fields
  app.get("/api/forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getForm(id);
      
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      const fields = await storage.getFieldsByForm(id);
      res.json({ ...form, fields });
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  // Create form
  app.post("/api/forms", async (req, res) => {
    try {
      const validation = insertFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const form = await storage.createForm(validation.data);
      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  // Update form
  app.patch("/api/forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertFormSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const form = await storage.updateForm(id, validation.data);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      res.json(form);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  // Delete form
  app.delete("/api/forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteForm(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Form not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  // Get form submissions
  app.get("/api/forms/:id/submissions", async (req, res) => {
    try {
      const { id } = req.params;
      const submissions = await storage.getSubmissionsByForm(id);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Add field to form
  app.post("/api/forms/:id/fields", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertFormFieldSchema.safeParse({
        ...req.body,
        formId: id,
      });
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const field = await storage.createFormField(validation.data);
      res.json(field);
    } catch (error) {
      console.error("Error creating field:", error);
      res.status(500).json({ error: "Failed to create field" });
    }
  });

  // Update field
  app.patch("/api/fields/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertFormFieldSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const field = await storage.updateFormField(id, validation.data);
      if (!field) {
        return res.status(404).json({ error: "Field not found" });
      }

      res.json(field);
    } catch (error) {
      console.error("Error updating field:", error);
      res.status(500).json({ error: "Failed to update field" });
    }
  });

  // Delete field
  app.delete("/api/fields/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFormField(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Field not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting field:", error);
      res.status(500).json({ error: "Failed to delete field" });
    }
  });

  // Helper to parse full name into components for leads
  function parseFullName(fullName: string): { lastName: string; firstName: string; middleName: string | null } {
    if (!fullName || !fullName.trim()) {
      return { lastName: 'Unknown', firstName: '', middleName: null };
    }
    
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 1) {
      return { lastName: parts[0], firstName: '', middleName: null };
    } else if (parts.length === 2) {
      return { lastName: parts[0], firstName: parts[1], middleName: null };
    } else {
      return { 
        lastName: parts[0], 
        firstName: parts[1], 
        middleName: parts.slice(2).join(' ') 
      };
    }
  }

  // ==================== PUBLIC FORM ROUTES (no auth required) ====================

  // Get public form (for embedding)
  app.get("/api/public/forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getForm(id);
      
      if (!form || !form.isActive) {
        return res.status(404).json({ error: "Form not found or inactive" });
      }
      
      const fields = await storage.getFieldsByForm(id);
      res.json({ ...form, fields });
    } catch (error) {
      console.error("Error fetching public form:", error);
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  // Submit form (public endpoint)
  app.post("/api/public/forms/:id/submit", async (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      // Verify form exists and is active
      const form = await storage.getForm(id);
      if (!form || !form.isActive) {
        return res.status(404).json({ error: "Form not found or inactive" });
      }

      // Get form fields to identify tour fields
      const fields = await storage.getFieldsByForm(id);
      const tourFields = fields.filter(f => f.type === 'tour');
      
      // Find first tour field value in submission data
      const selectedTourField = tourFields.find(f => data[f.key]);
      const selectedTourId = selectedTourField ? data[selectedTourField.key] : null;

      // Determine lead name with flexible logic
      let leadName = 'Unknown';
      let selectedEvent = null;
      
      // Fetch selected event once if tour field present
      if (selectedTourId) {
        selectedEvent = await storage.getEvent(String(selectedTourId));
      }
      
      // Try to find a name field by checking common keys or text fields
      const possibleNameFields = fields.filter(f => 
        f.type === 'text' && 
        (f.key.toLowerCase().includes('name') || 
         f.key.toLowerCase().includes('имя') ||
         f.key.toLowerCase().includes('fio') ||
         f.key.toLowerCase().includes('ФИО'))
      );
      
      const nameField = possibleNameFields[0];
      if (nameField && data[nameField.key]) {
        leadName = String(data[nameField.key]);
      } else if (selectedEvent) {
        // If no name field but has tour, use event name
        leadName = `Booking for ${selectedEvent.name}`;
      } else {
        // Fallback: use email or phone if no name available
        const emailField = fields.find(f => f.type === 'email');
        const phoneField = fields.find(f => f.type === 'phone');
        
        if (emailField && data[emailField.key]) {
          leadName = String(data[emailField.key]);
        } else if (phoneField && data[phoneField.key]) {
          leadName = String(data[phoneField.key]);
        }
      }

      // Build notes with tour selection if present
      let leadNotes: string | undefined = undefined;
      if (selectedEvent) {
        leadNotes = `Selected tour: ${selectedEvent.name} (ID: ${selectedTourId})`;
      } else if (selectedTourId) {
        leadNotes = `Selected tour ID: ${selectedTourId}`;
      }

      // Extract email and phone from form data
      const emailField = fields.find(f => f.type === 'email');
      const phoneField = fields.find(f => f.type === 'phone');
      const extractedEmail = emailField && data[emailField.key] ? String(data[emailField.key]) : undefined;
      const extractedPhone = phoneField && data[phoneField.key] ? String(data[phoneField.key]) : undefined;

      // Auto-create lead from form data with auto-tourist
      const { lastName, firstName, middleName } = parseFullName(leadName);
      const lead = await storage.createLeadWithAutoTourist({
        lastName,
        firstName,
        middleName,
        email: extractedEmail,
        phone: extractedPhone,
        eventId: selectedTourId || undefined,
        source: 'form',
        formId: id,
        status: 'new',
        notes: leadNotes,
        createdByUserId: form.userId,
      });

      // Create submission linked to lead
      const submission = await storage.createSubmission({
        formId: id,
        leadId: lead.id,
        data,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ submission, lead });
    } catch (error) {
      console.error("Error submitting form:", error);
      res.status(500).json({ error: "Failed to submit form" });
    }
  });

  // ==================== PUBLIC BOOKING ROUTES (no auth required) ====================

  // Submit booking request
  app.post("/api/public/bookings", async (req, res) => {
    try {
      const { eventId, participantCount, name, email, phone, notes } = req.body;

      // Validate required fields
      if (!eventId || !name || (!email && !phone)) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: "eventId, name, and either email or phone are required" 
        });
      }

      // Verify event exists and is not full
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.isFull) {
        return res.status(400).json({ error: "Event is fully booked" });
      }

      // Check actual availability
      const deals = await storage.getDealsByEvent(eventId);
      const confirmedCount = deals.filter(d => d.status === "confirmed").length;
      const availableSpots = event.participantLimit - confirmedCount;

      if (availableSpots <= 0) {
        return res.status(400).json({ error: "No available spots" });
      }

      if (participantCount && participantCount > availableSpots) {
        return res.status(400).json({ 
          error: `Only ${availableSpots} spots available, but ${participantCount} requested` 
        });
      }

      // Create enriched lead with event details in notes and auto-tourist
      const eventInfo = `Event: ${event.name}\nCountry: ${event.country}\nTour Type: ${event.tourType}\nDates: ${event.startDate} - ${event.endDate}\nParticipants: ${participantCount || 1}`;
      const { lastName, firstName, middleName } = parseFullName(name);
      const lead = await storage.createLeadWithAutoTourist({
        lastName,
        firstName,
        middleName,
        phone: phone || undefined,
        email: email || undefined,
        eventId: eventId,
        source: 'booking',
        status: 'new',
        notes: notes ? `${notes}\n\n${eventInfo}` : eventInfo,
        createdByUserId: 'demo-user-001',
      });

      res.json({ 
        success: true,
        lead,
        message: "Booking request received successfully. Our team will contact you soon." 
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // ==================== GROUP ROUTES ====================

  // Get all groups for an event
  app.get("/api/groups/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const groups = await storage.getGroupsByEvent(eventId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Create a new group
  app.post("/api/groups", async (req, res) => {
    try {
      const validation = insertGroupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const group = await storage.createGroup(validation.data);
      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  // Update group
  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateGroupSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const group = await storage.updateGroup(id, validation.data);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  // Delete group (admin only)
  app.delete("/api/groups/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteGroup(id);
      
      if (!success) {
        return res.status(404).json({ error: "Group not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // Add deal to group
  app.post("/api/groups/:id/members", async (req, res) => {
    try {
      const { id } = req.params;
      const { dealId, isPrimary = false } = req.body;

      if (!dealId) {
        return res.status(400).json({ error: "dealId is required" });
      }

      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      const deal = await storage.addDealToGroup(dealId, id, isPrimary);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      res.json(deal);
    } catch (error) {
      console.error("Error adding deal to group:", error);
      res.status(500).json({ error: "Failed to add deal to group" });
    }
  });

  // Remove deal from group (admin only)
  app.delete("/api/groups/:groupId/members/:dealId", requireAdmin, async (req, res) => {
    try {
      const { dealId } = req.params;

      const deal = await storage.removeDealFromGroup(dealId);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      res.json(deal);
    } catch (error) {
      console.error("Error removing deal from group:", error);
      res.status(500).json({ error: "Failed to remove deal from group" });
    }
  });

  // ==================== WAZZUP24 INTEGRATION ROUTES ====================
  
  const { encrypt, decrypt, isEncrypted } = await import("./crypto");
  
  // Get Wazzup24 API key status (admin only)
  app.get("/api/settings/wazzup24", requireAdmin, async (req, res) => {
    try {
      const setting = await storage.getSetting("wazzup24_api_key");
      
      if (!setting?.value) {
        return res.json({ configured: false });
      }
      
      // Return only status, not the actual key
      return res.json({ 
        configured: true,
        updatedAt: setting.updatedAt 
      });
    } catch (error) {
      console.error("Error getting Wazzup24 settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });
  
  // Save Wazzup24 API key (admin only)
  app.post("/api/settings/wazzup24", requireAdmin, async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      
      // Encrypt the API key before storing
      const encryptedKey = encrypt(apiKey);
      const userId = (req.user as User)?.id;
      
      await storage.setSetting("wazzup24_api_key", encryptedKey, userId);
      
      res.json({ success: true, configured: true });
    } catch (error) {
      console.error("Error saving Wazzup24 settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });
  
  // Delete Wazzup24 API key (admin only)
  app.delete("/api/settings/wazzup24", requireAdmin, async (req, res) => {
    try {
      const userId = (req.user as User)?.id;
      await storage.setSetting("wazzup24_api_key", null, userId);
      
      res.json({ success: true, configured: false });
    } catch (error) {
      console.error("Error deleting Wazzup24 settings:", error);
      res.status(500).json({ error: "Failed to delete settings" });
    }
  });

  // ==================== SYSTEM DICTIONARY ROUTES ====================

  // Get dictionary items by type (public for authenticated users - for form dropdowns)
  app.get("/api/public/dictionaries/:type", requireAuth, async (req, res) => {
    try {
      const { type } = req.params;
      const items = await storage.getDictionaryItems(type);
      // Return only active items, sorted by order
      const activeItems = items.filter(item => item.isActive).sort((a, b) => a.order - b.order);
      res.json(activeItems);
    } catch (error) {
      console.error("Error fetching dictionary items:", error);
      res.status(500).json({ error: "Failed to fetch dictionary items" });
    }
  });

  // Get all dictionary items (admin only)
  app.get("/api/dictionaries", requireAdmin, async (req, res) => {
    try {
      const items = await storage.getAllDictionaries();
      res.json(items);
    } catch (error) {
      console.error("Error fetching dictionaries:", error);
      res.status(500).json({ error: "Failed to fetch dictionaries" });
    }
  });

  // Get dictionary items by type (admin only)
  app.get("/api/dictionaries/:type", requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const items = await storage.getDictionaryItems(type);
      res.json(items);
    } catch (error) {
      console.error("Error fetching dictionary items:", error);
      res.status(500).json({ error: "Failed to fetch dictionary items" });
    }
  });

  // Create dictionary item (admin only)
  app.post("/api/dictionaries", requireAdmin, async (req, res) => {
    try {
      const { type, value, label, order, isActive } = req.body;
      
      if (!type || !value || !label) {
        return res.status(400).json({ error: "Type, value, and label are required" });
      }
      
      const item = await storage.createDictionaryItem({
        type,
        value,
        label,
        order: order || 0,
        isActive: isActive !== false,
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating dictionary item:", error);
      res.status(500).json({ error: "Failed to create dictionary item" });
    }
  });

  // Update dictionary item (admin only)
  app.patch("/api/dictionaries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const item = await storage.updateDictionaryItem(id, updates);
      
      if (!item) {
        return res.status(404).json({ error: "Dictionary item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error updating dictionary item:", error);
      res.status(500).json({ error: "Failed to update dictionary item" });
    }
  });

  // Delete dictionary item (admin only)
  app.delete("/api/dictionaries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDictionaryItem(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Dictionary item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dictionary item:", error);
      res.status(500).json({ error: "Failed to delete dictionary item" });
    }
  });

  // ==================== DICTIONARY TYPE CONFIG ROUTES ====================

  // Get all dictionary type configs (admin only)
  app.get("/api/dictionary-type-configs", requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getAllDictionaryTypeConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching dictionary type configs:", error);
      res.status(500).json({ error: "Failed to fetch dictionary type configs" });
    }
  });

  // Get dictionary type config by type (public for forms)
  app.get("/api/public/dictionary-type-config/:type", requireAuth, async (req, res) => {
    try {
      const { type } = req.params;
      const config = await storage.getDictionaryTypeConfig(type);
      res.json(config || { type, isMultiple: false, displayName: type });
    } catch (error) {
      console.error("Error fetching dictionary type config:", error);
      res.status(500).json({ error: "Failed to fetch dictionary type config" });
    }
  });

  // Upsert dictionary type config (admin only)
  app.put("/api/dictionary-type-configs/:type", requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      
      // Validate request body
      const validationSchema = insertDictionaryTypeConfigSchema.partial().extend({
        type: z.string().optional(),
      });
      const validation = validationSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request body", 
          details: validation.error.errors 
        });
      }
      
      const { isMultiple, displayName, description } = validation.data;
      
      const config = await storage.upsertDictionaryTypeConfig({
        type,
        isMultiple: isMultiple ?? false,
        displayName: displayName || type,
        description: description || null
      });
      
      res.json(config);
    } catch (error) {
      console.error("Error upserting dictionary type config:", error);
      res.status(500).json({ error: "Failed to update dictionary type config" });
    }
  });
  
  // Get Wazzup24 iframe URL for a lead
  app.post("/api/wazzup24/iframe", requireAuth, async (req, res) => {
    try {
      const { leadId, phone, name } = req.body;
      const currentUser = req.user as User;
      
      if (!leadId) {
        return res.status(400).json({ error: "Lead ID is required" });
      }
      
      // Get API key from settings
      const setting = await storage.getSetting("wazzup24_api_key");
      
      if (!setting?.value) {
        return res.status(400).json({ error: "Wazzup24 is not configured" });
      }
      
      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = isEncrypted(setting.value) ? decrypt(setting.value) : setting.value;
      } catch {
        return res.status(500).json({ error: "Failed to decrypt API key" });
      }
      
      // Normalize phone number for WhatsApp (remove +, spaces, dashes)
      const normalizePhone = (phoneStr: string | null | undefined): string | null => {
        if (!phoneStr) return null;
        // Remove all non-digit characters
        let digits = phoneStr.replace(/\D/g, '');
        // If starts with 8, replace with 7 (Russia)
        if (digits.startsWith('8') && digits.length === 11) {
          digits = '7' + digits.slice(1);
        }
        // If doesn't start with country code, add 7 for Russia
        if (digits.length === 10) {
          digits = '7' + digits;
        }
        return digits || null;
      };
      
      const normalizedPhone = normalizePhone(phone);
      
      // First, ensure user exists in Wazzup24 (create if not exists)
      // IMPORTANT: Use String(id) to match how users are synced via sync-users endpoint
      const userData = {
        id: String(currentUser.id),
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || "CRM User"
      };
      
      console.log("Wazzup24: Ensuring user exists:", JSON.stringify(userData, null, 2));
      
      const userResponse = await fetch("https://api.wazzup24.com/v3/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify([userData])
      });
      
      if (!userResponse.ok) {
        const userErrorText = await userResponse.text();
        console.error("Wazzup24 user creation error:", userResponse.status, userErrorText);
        // Continue anyway - user might already exist
      } else {
        console.log("Wazzup24: User created/updated successfully");
      }
      
      // Create/update contact in Wazzup24 with responsibleUserId
      // This is required to allow writing in "card" scope
      if (normalizedPhone) {
        const contactData = [{
          id: `lead_${leadId}`,
          responsibleUserId: String(currentUser.id),
          name: name || `Lead ${leadId}`,
          contactData: [
            {
              chatType: "whatsapp",
              chatId: normalizedPhone
            }
          ]
        }];
        
        console.log("Wazzup24: Creating/updating contact:", JSON.stringify(contactData, null, 2));
        
        const contactResponse = await fetch("https://api.wazzup24.com/v3/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(contactData)
        });
        
        if (!contactResponse.ok) {
          const contactErrorText = await contactResponse.text();
          console.error("Wazzup24 contact creation error:", contactResponse.status, contactErrorText);
          // Continue anyway - contact might already exist or we can still show chat
        } else {
          console.log("Wazzup24: Contact created/updated successfully");
        }
      }
      
      // Build request body according to Wazzup24 API v3 spec
      // Use scope: "card" to show only the lead's chat (with filter)
      const requestBody: Record<string, unknown> = {
        scope: "card",
        user: userData
      };
      
      // Add filter array with phone if available (required by Wazzup24 API)
      if (normalizedPhone) {
        requestBody.filter = [
          {
            chatType: "whatsapp",
            chatId: normalizedPhone
          }
        ];
        // Also set activeChat to open this chat by default
        requestBody.activeChat = {
          chatType: "whatsapp",
          chatId: normalizedPhone
        };
      }
      
      console.log("Wazzup24 iframe request:", JSON.stringify(requestBody, null, 2));
      
      // Request iframe URL from Wazzup24 API
      const response = await fetch("https://api.wazzup24.com/v3/iframe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Wazzup24 API error:", response.status, errorText);
        return res.status(response.status).json({ 
          error: `Wazzup24 API error: ${response.statusText}`,
          details: errorText
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error getting Wazzup24 iframe:", error);
      res.status(500).json({ error: "Failed to get iframe URL" });
    }
  });
  
  // Test Wazzup24 connection (admin only)
  app.post("/api/wazzup24/test", requireAdmin, async (req, res) => {
    try {
      // Get API key from settings
      const setting = await storage.getSetting("wazzup24_api_key");
      
      if (!setting?.value) {
        return res.status(400).json({ error: "Wazzup24 is not configured" });
      }
      
      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = isEncrypted(setting.value) ? decrypt(setting.value) : setting.value;
      } catch {
        return res.status(500).json({ error: "Failed to decrypt API key" });
      }
      
      // Test connection by getting user info
      const response = await fetch("https://api.wazzup24.com/v3/users", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Wazzup24 test error:", response.status, errorText);
        return res.status(response.status).json({ 
          success: false,
          error: `Wazzup24 API error: ${response.statusText}`,
          details: errorText
        });
      }
      
      const data = await response.json();
      res.json({ success: true, users: data });
    } catch (error) {
      console.error("Error testing Wazzup24:", error);
      res.status(500).json({ success: false, error: "Failed to test connection" });
    }
  });

  // Sync all CRM users to Wazzup24 (admin only)
  app.post("/api/wazzup24/sync-users", requireAdmin, async (req, res) => {
    try {
      // Get API key from settings
      const setting = await storage.getSetting("wazzup24_api_key");
      
      if (!setting?.value) {
        return res.status(400).json({ error: "Wazzup24 is not configured" });
      }
      
      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = isEncrypted(setting.value) ? decrypt(setting.value) : setting.value;
      } catch {
        return res.status(500).json({ error: "Failed to decrypt API key" });
      }
      
      // Get all CRM users
      const crmUsers = await storage.getAllUsers();
      
      // Prepare users data for Wazzup24 API
      const wazzupUsers = crmUsers.map((user: User) => ({
        id: String(user.id),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
      }));
      
      console.log("Wazzup24: Syncing users:", JSON.stringify(wazzupUsers, null, 2));
      
      // Send users to Wazzup24
      const response = await fetch("https://api.wazzup24.com/v3/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(wazzupUsers)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Wazzup24 sync users error:", response.status, errorText);
        return res.status(response.status).json({ 
          success: false,
          error: `Wazzup24 API error: ${response.statusText}`,
          details: errorText
        });
      }
      
      const data = await response.json();
      console.log("Wazzup24: Users synced successfully:", data);
      
      res.json({ 
        success: true, 
        syncedCount: wazzupUsers.length,
        users: wazzupUsers.map((u: { id: string; name: string }) => u.name)
      });
    } catch (error) {
      console.error("Error syncing users to Wazzup24:", error);
      res.status(500).json({ success: false, error: "Failed to sync users" });
    }
  });

  // ==================== DOCUMENT GENERATION ROUTES ====================
  
  const { generateContract, generateBookingSheet } = await import("./document-generator");
  
  // Generate Contract (DOCX)
  app.get("/api/leads/:id/documents/contract", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const tourists = await storage.getTouristsByLead(lead.id);
      const event = lead.eventId ? await storage.getEvent(lead.eventId) : null;
      const primaryTourist = tourists.find((t: LeadTourist) => t.isPrimary) || tourists[0] || null;
      
      const buffer = await generateContract({
        lead,
        tourists,
        event: event || null,
        primaryTourist,
      });
      
      const contractNumber = new Date().toISOString().slice(0,10).split('-').reverse().join('/').slice(0,8);
      const filename = `Договор_${contractNumber.replace(/\//g, '-')}.docx`;
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating contract:", error);
      res.status(500).json({ error: "Failed to generate contract" });
    }
  });
  
  // Generate Booking Sheet (DOCX)
  app.get("/api/leads/:id/documents/booking-sheet", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const tourists = await storage.getTouristsByLead(lead.id);
      const event = lead.eventId ? await storage.getEvent(lead.eventId) : null;
      const primaryTourist = tourists.find((t: LeadTourist) => t.isPrimary) || tourists[0] || null;
      
      const buffer = await generateBookingSheet({
        lead,
        tourists,
        event: event || null,
        primaryTourist,
      });
      
      const contractNumber = new Date().toISOString().slice(0,10).split('-').reverse().join('/').slice(0,8);
      const filename = `Лист_бронирования_${contractNumber.replace(/\//g, '-')}.docx`;
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating booking sheet:", error);
      res.status(500).json({ error: "Failed to generate booking sheet" });
    }
  });

  // ==================== PUBLIC API ENDPOINTS (Booking Widget - No Auth) ====================
  // These endpoints must be registered BEFORE the WordPress API-key-protected endpoints
  // to handle public booking widget requests without authentication

  // Zod schema for creating lead from booking widget
  const bookingLeadSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    tourName: z.string().optional(),
    tourDate: z.string().optional(),
    tourUrl: z.string().optional(),
    tourCost: z.string().optional(),
    tourCostCurrency: z.string().default("RUB"),
    advancePayment: z.string().optional(),
    advancePaymentCurrency: z.string().default("RUB"),
    participants: z.number().optional(),
    bookingId: z.string().optional(),
    paymentMethod: z.string().optional(),
  });

  // Zod schema for payment status update
  const paymentStatusSchema = z.object({
    paymentStatus: z.enum(["pending", "paid", "failed"]),
    paymentId: z.string().optional(),
    amountPaid: z.string().optional(),
    transactionDate: z.string().optional(),
  });

  // Handler for creating lead from booking widget
  const handleCreateBookingLead = async (req: any, res: any) => {
    try {
      const validation = bookingLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      // Try to find matching event by websiteUrl
      let eventId: string | undefined = undefined;
      if (data.tourUrl) {
        const event = await storage.getEventByWebsiteUrl(data.tourUrl);
        if (event) {
          eventId = event.id;
        }
      }

      // Build notes from booking widget data
      const notesParts: string[] = [];
      if (data.tourName) notesParts.push(`Тур: ${data.tourName}`);
      if (data.tourDate) notesParts.push(`Дата: ${data.tourDate}`);
      if (data.participants) notesParts.push(`Участников: ${data.participants}`);
      if (data.paymentMethod) notesParts.push(`Способ оплаты: ${data.paymentMethod}`);
      if (data.bookingId) notesParts.push(`ID бронирования: ${data.bookingId}`);
      const notes = notesParts.length > 0 ? notesParts.join("\n") : undefined;

      // Create the lead
      const lead = await storage.createLead({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        email: data.email || undefined,
        eventId: eventId,
        tourCost: data.tourCost || undefined,
        tourCostCurrency: data.tourCostCurrency,
        advancePayment: data.advancePayment || undefined,
        advancePaymentCurrency: data.advancePaymentCurrency,
        status: "new",
        source: "booking",
        notes: notes,
      });

      res.status(201).json({
        success: true,
        leadId: lead.id,
        message: "Lead created successfully",
      });
    } catch (error) {
      console.error("[PUBLIC API] Error creating lead:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create lead",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Handler for updating payment status
  const handlePaymentStatusUpdate = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const validation = paymentStatusSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      // Get existing lead
      const existingLead = await storage.getLead(id);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          error: "Lead not found",
        });
      }

      // Determine new lead status based on payment status
      let newStatus: string = existingLead.status;
      if (data.paymentStatus === "paid") {
        newStatus = "qualified";
      } else if (data.paymentStatus === "failed") {
        newStatus = "contacted";
      }

      // Build payment info note
      const paymentNotes: string[] = [];
      paymentNotes.push(`\n--- Обновление оплаты (${new Date().toLocaleString("ru-RU")}) ---`);
      paymentNotes.push(`Статус оплаты: ${data.paymentStatus}`);
      if (data.paymentId) paymentNotes.push(`ID платежа: ${data.paymentId}`);
      if (data.amountPaid) paymentNotes.push(`Сумма: ${data.amountPaid}`);
      if (data.transactionDate) paymentNotes.push(`Дата транзакции: ${data.transactionDate}`);

      // Append to existing notes
      const updatedNotes = existingLead.notes 
        ? existingLead.notes + paymentNotes.join("\n")
        : paymentNotes.join("\n");

      // Update the lead
      await storage.updateLead(id, {
        status: newStatus as any,
        notes: updatedNotes,
      });

      res.json({
        success: true,
        leadId: id,
        status: newStatus,
        message: "Payment status updated",
      });
    } catch (error) {
      console.error("[PUBLIC API] Error updating payment status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // CORS middleware for booking widget endpoints (cross-origin requests from chinaunique.ru)
  const bookingWidgetCorsMiddleware = (req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  };

  // Handle OPTIONS preflight requests for booking widget routes
  app.options('/api/booking/*', bookingWidgetCorsMiddleware);
  app.options('/api/public/leads', bookingWidgetCorsMiddleware);
  app.options('/api/public/leads/:id/payment-status', bookingWidgetCorsMiddleware);

  // Register booking widget endpoints (no auth required)
  // Both /api/booking/leads and /api/public/leads paths supported for backward compatibility
  app.post("/api/booking/leads", bookingWidgetCorsMiddleware, handleCreateBookingLead);
  app.post("/api/public/leads", bookingWidgetCorsMiddleware, handleCreateBookingLead);  // Backward compatibility
  app.patch("/api/booking/leads/:id/payment-status", bookingWidgetCorsMiddleware, handlePaymentStatusUpdate);
  app.patch("/api/public/leads/:id/payment-status", bookingWidgetCorsMiddleware, handlePaymentStatusUpdate);  // Backward compatibility

  // ==================== WORDPRESS API ENDPOINTS (With API Key) ====================
  // These endpoints require API key authentication for server-to-server WordPress sync
  
  // API Key validation middleware for WordPress endpoints
  const validateApiKey = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const expectedKey = process.env.WORDPRESS_API_KEY;
    
    if (!expectedKey) {
      console.error("WORDPRESS_API_KEY not configured");
      return res.status(500).json({ error: "API key not configured on server" });
    }
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid or missing API key" });
    }
    
    next();
  };

  // Rate limiting for public endpoints
  const publicApiLimits = new Map<string, { count: number; resetAt: number }>();
  const PUBLIC_RATE_LIMIT = 100; // max requests per window
  const PUBLIC_RATE_WINDOW = 60 * 1000; // 1 minute
  
  const publicRateLimiter = (req: any, res: any, next: any) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const limits = publicApiLimits.get(ip);
    
    if (limits && limits.count >= PUBLIC_RATE_LIMIT && now < limits.resetAt) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    
    if (!limits || now >= limits.resetAt) {
      publicApiLimits.set(ip, { count: 1, resetAt: now + PUBLIC_RATE_WINDOW });
    } else {
      limits.count++;
    }
    
    next();
  };
  
  // WordPress: Create lead from WordPress booking (requires API key)
  app.post("/api/wordpress/leads", validateApiKey, publicRateLimiter, async (req, res) => {
    try {
      const { 
        eventExternalId,  // WordPress post ID 
        clientName,
        phone,
        email,
        touristCount,
        source,
        comment,
        bookingId,  // Unique booking ID from WordPress
        clientCategory,
        roomType,
        hotelCategory,
      } = req.body;

      // Validate required fields
      if (!clientName || !phone) {
        return res.status(400).json({ error: "Missing required fields: clientName, phone" });
      }

      // Find event by external ID if provided
      let event = null;
      if (eventExternalId) {
        event = await storage.getEventByExternalId(String(eventExternalId));
        if (!event) {
          // Log the error and create without event
          await storage.createSyncLog({
            operation: "error",
            entityType: "lead",
            externalId: bookingId || null,
            status: "error",
            errorMessage: `Event not found for externalId: ${eventExternalId}`,
            details: { eventExternalId, clientName, phone },
          });
        }
      }

      // Parse client name into parts
      const nameParts = clientName.trim().split(/\s+/);
      const lastName = nameParts[0] || "Неизвестно";
      const firstName = nameParts[1] || "";
      const middleName = nameParts.slice(2).join(" ") || null;

      // Create lead
      const lead = await storage.createLead({
        lastName,
        firstName,
        middleName,
        phone,
        email: email || null,
        source: source || "WordPress",
        notes: comment || null,
        status: "Новый",
        eventId: event?.id || null,
        clientCategory: clientCategory || null,
        roomType: roomType || null,
        hotelCategory: hotelCategory || null,
      });

      // Create initial tourist
      await storage.createTourist({
        leadId: lead.id,
        lastName,
        firstName,
        middleName,
        phone,
        email: email || null,
        isPrimary: true,
      });

      // Log successful creation
      await storage.createSyncLog({
        operation: "create",
        entityType: "lead",
        entityId: lead.id,
        externalId: bookingId || null,
        status: "success",
        details: { eventExternalId, clientName, phone, eventId: event?.id },
      });

      res.status(201).json({
        success: true,
        leadId: lead.id,
        message: "Lead created successfully",
      });
    } catch (error) {
      console.error("Error creating lead from WordPress:", error);
      
      // Log the error
      await storage.createSyncLog({
        operation: "error",
        entityType: "lead",
        externalId: req.body.bookingId || null,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        details: req.body,
      });

      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // WordPress: Update lead payment status (requires API key)
  app.patch("/api/wordpress/leads/:id/payment-status", validateApiKey, publicRateLimiter, async (req, res) => {
    try {
      const { paymentStatus, paidAmount, paidDate, comment } = req.body;

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const updates: Record<string, any> = {};
      if (paymentStatus) updates.paymentStatus = paymentStatus;
      if (paidAmount !== undefined) updates.advancePayment = String(paidAmount);
      if (paidDate) updates.updatedAt = new Date(paidDate);
      if (comment) {
        updates.notes = lead.notes 
          ? `${lead.notes}\n[${new Date().toISOString().slice(0,10)}] ${comment}`
          : `[${new Date().toISOString().slice(0,10)}] ${comment}`;
      }

      const updatedLead = await storage.updateLead(req.params.id, updates);

      // Log the update
      await storage.createSyncLog({
        operation: "update",
        entityType: "lead",
        entityId: req.params.id,
        status: "success",
        details: { paymentStatus, paidAmount, updates },
      });

      res.json({
        success: true,
        leadId: updatedLead?.id,
        message: "Payment status updated",
      });
    } catch (error) {
      console.error("Error updating lead payment status:", error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  // Public: Sync events from WordPress
  app.post("/api/public/events/sync", validateApiKey, publicRateLimiter, async (req, res) => {
    try {
      const { tours } = req.body;

      if (!Array.isArray(tours)) {
        return res.status(400).json({ error: "tours must be an array" });
      }

      const results = {
        created: 0,
        updated: 0,
        archived: 0,
        errors: [] as string[],
      };

      const receivedExternalIds = new Set<string>();

      for (const tour of tours) {
        try {
          const externalId = String(tour.id || tour.postId);
          receivedExternalIds.add(externalId);

          const existingEvent = await storage.getEventByExternalId(externalId);

          const eventData = {
            name: tour.title || tour.name,
            description: tour.description || null,
            startDate: tour.startDate ? new Date(tour.startDate).toISOString() : new Date().toISOString(),
            endDate: tour.endDate ? new Date(tour.endDate).toISOString() : new Date().toISOString(),
            price: tour.price ? String(tour.price) : "0",
            priceCurrency: tour.currency || tour.priceCurrency || "RUB",
            country: tour.country || "Китай",
            tourType: tour.tourType || "Групповой",
            participantLimit: tour.capacity || tour.participantLimit || 30,
            cities: tour.cities || tour.route || [],
            externalId,
            websiteUrl: tour.url || tour.websiteUrl || tour.permalink || null,
          };

          if (existingEvent) {
            // Update existing event
            await storage.updateEvent(existingEvent.id, eventData);
            results.updated++;
            
            await storage.createSyncLog({
              operation: "update",
              entityType: "event",
              entityId: existingEvent.id,
              externalId,
              status: "success",
              details: { name: eventData.name },
            });
          } else {
            // Create new event
            const newEvent = await storage.createEvent(eventData as any);
            results.created++;

            await storage.createSyncLog({
              operation: "create",
              entityType: "event",
              entityId: newEvent.id,
              externalId,
              status: "success",
              details: { name: eventData.name },
            });
          }
        } catch (tourError) {
          const errorMsg = `Error processing tour ${tour.id}: ${tourError instanceof Error ? tourError.message : "Unknown error"}`;
          results.errors.push(errorMsg);
          
          await storage.createSyncLog({
            operation: "error",
            entityType: "event",
            externalId: String(tour.id || "unknown"),
            status: "error",
            errorMessage: errorMsg,
            details: tour,
          });
        }
      }

      // Archive events that are no longer in WordPress (optional)
      if (req.body.archiveRemoved === true) {
        const allEvents = await storage.getAllEvents();
        for (const event of allEvents) {
          if (event.externalId && !receivedExternalIds.has(event.externalId) && !event.isArchived) {
            await storage.archiveEvent(event.id);
            results.archived++;

            await storage.createSyncLog({
              operation: "archive",
              entityType: "event",
              entityId: event.id,
              externalId: event.externalId,
              status: "success",
              details: { reason: "Tour removed from WordPress" },
            });
          }
        }
      }

      // Log sync completion
      await storage.createSyncLog({
        operation: "sync_complete",
        entityType: "event",
        status: results.errors.length > 0 ? "partial" : "success",
        details: results,
      });

      // Update sync settings
      await storage.upsertSyncSettings("tour_sync", {
        lastSyncAt: new Date(),
        lastSyncStatus: results.errors.length > 0 ? "partial" : "success",
        lastSyncMessage: `Created: ${results.created}, Updated: ${results.updated}, Archived: ${results.archived}`,
      });

      res.json({
        success: true,
        ...results,
      });
    } catch (error) {
      console.error("Error syncing events from WordPress:", error);

      await storage.createSyncLog({
        operation: "error",
        entityType: "event",
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({ error: "Failed to sync events" });
    }
  });

  // Admin: Get sync logs (requires authentication)
  app.get("/api/sync-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        storage.getSyncLogs(limit, offset),
        storage.getSyncLogsCount(),
      ]);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // Admin: Get sync settings
  app.get("/api/sync-settings/:key", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSyncSettings(req.params.key);
      res.json(settings || { key: req.params.key, enabled: false, intervalHours: 24 });
    } catch (error) {
      console.error("Error fetching sync settings:", error);
      res.status(500).json({ error: "Failed to fetch sync settings" });
    }
  });

  // Admin: Update sync settings
  app.patch("/api/sync-settings/:key", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { enabled, intervalHours } = req.body;
      const settings = await storage.upsertSyncSettings(req.params.key, {
        enabled: enabled !== undefined ? enabled : undefined,
        intervalHours: intervalHours !== undefined ? intervalHours : undefined,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error updating sync settings:", error);
      res.status(500).json({ error: "Failed to update sync settings" });
    }
  });

  // Admin: Trigger manual sync
  app.post("/api/sync-settings/:key/trigger", requireAuth, requireAdmin, async (req, res) => {
    try {
      // This endpoint allows admin to manually trigger a sync
      // The actual sync logic would be done by calling the WordPress API
      // For now, just log the trigger request
      await storage.createSyncLog({
        operation: "sync_complete",
        entityType: "event",
        status: "success",
        details: { triggeredBy: "admin", manual: true },
      });

      await storage.upsertSyncSettings(req.params.key, {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncMessage: "Manual sync triggered",
      });

      res.json({ success: true, message: "Sync triggered" });
    } catch (error) {
      console.error("Error triggering sync:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  // Admin: Scrape tours from website and sync to database
  app.post("/api/sync/scrape-website", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log("[SYNC] Starting website scrape...");
      
      // Log sync start
      await storage.createSyncLog({
        operation: "sync_start",
        entityType: "event",
        status: "pending",
        details: { source: "website_scrape", triggeredBy: "admin" },
      });

      // Scrape all tours from the website
      const tours = await scrapeAllTours();
      
      console.log(`[SYNC] Scraped ${tours.length} tours, syncing to database...`);

      // Sync to database with smart update/create/archive logic
      const result = await syncToursToDatabase(tours, storage);

      // Log sync completion with enhanced details
      await storage.createSyncLog({
        operation: "sync_complete",
        entityType: "event",
        status: result.errors.length > 0 ? "partial" : "success",
        details: {
          source: result.source || "website_scrape",
          created: result.created,
          updated: result.updated,
          archived: result.archived,
          errors: result.errors,
          toursScraped: result.toursScraped,
          totalDatesProcessed: result.totalDatesProcessed,
          durationMs: result.durationMs,
          tourActions: result.tourActions,
          warnings: result.warnings,
        },
      });

      // Update sync settings (use tour_sync key for UI consistency)
      await storage.upsertSyncSettings("tour_sync", {
        lastSyncAt: new Date(),
        lastSyncStatus: result.errors.length > 0 ? "partial" : "success",
        lastSyncMessage: `Создано: ${result.created}, Обновлено: ${result.updated}, Архивировано: ${result.archived}`,
      });

      console.log(`[SYNC] Completed. Created: ${result.created}, Updated: ${result.updated}, Archived: ${result.archived}`);

      res.json({
        success: true,
        ...result,
        message: `Синхронизация завершена. Создано: ${result.created}, обновлено: ${result.updated}, архивировано: ${result.archived}`,
      });
    } catch (error) {
      console.error("[SYNC] Error scraping website:", error);

      await storage.createSyncLog({
        operation: "error",
        entityType: "event",
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        details: { source: "website_scrape" },
      });

      res.status(500).json({ 
        error: "Failed to scrape website",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
