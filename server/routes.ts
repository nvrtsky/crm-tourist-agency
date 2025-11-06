import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== EVENT ROUTES ====================

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEventsWithStats();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get single event with stats
  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEventWithStats(id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Get event participants (deals with contacts)
  app.get("/api/events/:id/participants", async (req, res) => {
    try {
      const { id } = req.params;
      const deals = await storage.getDealsByEvent(id);
      
      // Batch fetch all related data to avoid N+1 queries
      const contactIds = [...new Set(deals.map(d => d.contactId))];
      const dealIds = deals.map(d => d.id);
      const groupIds = [...new Set(deals.map(d => d.groupId).filter(Boolean))];
      
      // Fetch all contacts, visits, and groups in parallel
      const [allContacts, allVisits, allGroups] = await Promise.all([
        Promise.all(contactIds.map(cId => storage.getContact(cId))),
        Promise.all(dealIds.map(dId => storage.getCityVisitsByDeal(dId))),
        groupIds.length > 0 ? Promise.all(groupIds.map(gId => storage.getGroup(gId))) : Promise.resolve([])
      ]);
      
      // Create lookup maps
      const contactMap = new Map(allContacts.filter(Boolean).map(c => [c!.id, c!]));
      const visitsMap = new Map(dealIds.map((dId, idx) => [dId, allVisits[idx]]));
      const groupMap = new Map(allGroups.filter(Boolean).map(g => [g!.id, g!]));
      
      // Assemble participants using lookups
      const participants = deals
        .map((deal) => {
          const contact = contactMap.get(deal.contactId);
          if (!contact) {
            console.warn(`Contact ${deal.contactId} not found for deal ${deal.id}`);
            return null;
          }
          
          return {
            deal,
            contact,
            visits: visitsMap.get(deal.id) || [],
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

  // Create event
  app.post("/api/events", async (req, res) => {
    try {
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
  app.patch("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = updateEventSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const event = await storage.updateEvent(id, validation.data);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", async (req, res) => {
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

  // Delete contact
  app.delete("/api/contacts/:id", async (req, res) => {
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
        for (const city of event.cities) {
          await storage.createCityVisit({
            dealId: deal.id,
            city,
            arrivalDate: event.startDate,
            transportType: "plane",
            hotelName: `Hotel ${city}`,
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

  // Delete deal
  app.delete("/api/deals/:id", async (req, res) => {
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

      const visit = await storage.createCityVisit(validation.data);
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

  // Delete city visit
  app.delete("/api/visits/:id", async (req, res) => {
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

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
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

  // Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
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
      const validation = insertLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const lead = await storage.createLead(validation.data);
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
      const validation = updateLeadSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors,
        });
      }

      const lead = await storage.updateLead(id, validation.data);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req, res) => {
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

  // Convert lead to contact + deal
  app.post("/api/leads/:id/convert", async (req, res) => {
    try {
      const { id } = req.params;
      const { eventId } = req.body;

      if (!eventId) {
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

      // Create contact from lead
      const contact = await storage.createContact({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        leadId: lead.id,
        notes: lead.notes,
      });

      // Create deal
      const deal = await storage.createDeal({
        contactId: contact.id,
        eventId: eventId,
        status: 'pending',
        amount: event.price,
      });

      // Auto-create city visits for all cities in the event route
      if (event.cities && event.cities.length > 0) {
        for (const city of event.cities) {
          await storage.createCityVisit({
            dealId: deal.id,
            city,
            arrivalDate: event.startDate,
            transportType: "plane",
            hotelName: `Hotel ${city}`,
          });
        }
      }

      // Update lead status to 'won'
      await storage.updateLead(id, { status: 'won' });

      res.json({ contact, deal });
    } catch (error) {
      console.error("Error converting lead:", error);
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
          name: groupName || `Семья ${lead.name}`,
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

      // Auto-create lead from form data
      const lead = await storage.createLead({
        name: data.name || 'Unknown',
        email: data.email,
        phone: data.phone,
        source: 'form',
        formId: id,
        status: 'new',
        createdByUserId: form.userId, // Assign to form owner
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

  // Delete group
  app.delete("/api/groups/:id", async (req, res) => {
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

  // Remove deal from group
  app.delete("/api/groups/:groupId/members/:dealId", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
