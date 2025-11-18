import { eq, and, or, sql, desc, count } from "drizzle-orm";
import { db } from "./db";
import {
  type Event,
  type InsertEvent,
  type UpdateEvent,
  type EventWithStats,
  type Contact,
  type InsertContact,
  type UpdateContact,
  type ContactWithDeals,
  type Deal,
  type InsertDeal,
  type UpdateDeal,
  type DealWithDetails,
  type CityVisit,
  type InsertCityVisit,
  type Notification,
  type InsertNotification,
  type UpdateNotification,
  type User,
  type InsertUser,
  type Form,
  type InsertForm,
  type FormField,
  type InsertFormField,
  type Lead,
  type InsertLead,
  type UpdateLead,
  type LeadWithTouristCount,
  type LeadStatusHistoryEntry,
  type InsertLeadStatusHistory,
  type FormSubmission,
  type InsertFormSubmission,
  type LeadStatus,
  type Group,
  type InsertGroup,
  type UpdateGroup,
  type LeadTourist,
  type InsertLeadTourist,
  type UpdateLeadTourist,
  events,
  contacts,
  deals,
  cityVisits,
  notifications,
  users,
  forms,
  formFields,
  leads,
  leadStatusHistory,
  formSubmissions,
  groups,
  leadTourists,
} from "@shared/schema";

export interface IStorage {
  // Event operations
  getEvent(id: string): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventWithStats(id: string): Promise<EventWithStats | undefined>;
  getAllEventsWithStats(): Promise<EventWithStats[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<UpdateEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  archiveExpiredEvents(): Promise<void>;
  archiveEvent(id: string): Promise<Event | undefined>;
  unarchiveEvent(id: string): Promise<Event | undefined>;

  // Contact operations
  getContact(id: string): Promise<Contact | undefined>;
  getAllContacts(): Promise<Contact[]>;
  getContactsByLead(leadId: string): Promise<Contact[]>;
  getContactByLeadTourist(leadTouristId: string): Promise<Contact | undefined>;
  getContactWithDeals(id: string): Promise<ContactWithDeals | undefined>;
  getContactDetails(id: string): Promise<{ contact: Contact; leadTourist: LeadTourist } | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<UpdateContact>): Promise<Contact | undefined>;
  updateContactDetails(id: string, touristData: UpdateLeadTourist): Promise<void>;
  deleteContact(id: string): Promise<boolean>;

  // Deal operations
  getDeal(id: string): Promise<Deal | undefined>;
  getDealsByEvent(eventId: string): Promise<Deal[]>;
  getDealsByContact(contactId: string): Promise<Deal[]>;
  getDealWithDetails(id: string): Promise<DealWithDetails | undefined>;
  getDealsWithDetailsByEvent(eventId: string): Promise<DealWithDetails[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<UpdateDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<boolean>;

  // City visit operations
  getCityVisitsByDeal(dealId: string): Promise<CityVisit[]>;
  createCityVisit(visit: InsertCityVisit): Promise<CityVisit>;
  updateCityVisit(id: string, visit: Partial<InsertCityVisit>): Promise<CityVisit | undefined>;
  deleteCityVisit(id: string): Promise<boolean>;

  // Notification operations
  getNotification(id: string): Promise<Notification | undefined>;
  getAllNotifications(): Promise<Notification[]>;
  getUnreadNotifications(): Promise<Notification[]>;
  getNotificationsByEvent(eventId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: Partial<UpdateNotification>): Promise<Notification | undefined>;
  markAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Form operations
  getForm(id: string): Promise<Form | undefined>;
  getFormsByUser(userId: string): Promise<Form[]>;
  getAllForms(): Promise<Form[]>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, form: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: string): Promise<boolean>;

  // Form field operations
  getFieldsByForm(formId: string): Promise<FormField[]>;
  createFormField(field: InsertFormField): Promise<FormField>;
  updateFormField(id: string, field: Partial<InsertFormField>): Promise<FormField | undefined>;
  deleteFormField(id: string): Promise<boolean>;

  // Lead operations
  getLead(id: string): Promise<Lead | undefined>;
  getAllLeads(userId?: string, userRole?: string): Promise<LeadWithTouristCount[]>;
  getLeadsByUser(userId: string): Promise<Lead[]>;
  getLeadsByStatus(status: LeadStatus): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  updateLeadCostsByEventPrice(eventId: string, newPrice: string): Promise<void>;

  // Lead status history operations
  getHistoryByLead(leadId: string): Promise<LeadStatusHistoryEntry[]>;
  createHistoryEntry(entry: InsertLeadStatusHistory): Promise<LeadStatusHistoryEntry>;

  // Form submission operations
  getSubmission(id: string): Promise<FormSubmission | undefined>;
  getSubmissionsByForm(formId: string): Promise<FormSubmission[]>;
  createSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  updateSubmission(id: string, submission: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined>;

  // Group operations
  getGroup(id: string): Promise<Group | undefined>;
  getGroupsByEvent(eventId: string): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, group: Partial<UpdateGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  addDealToGroup(dealId: string, groupId: string, isPrimary?: boolean): Promise<Deal | undefined>;
  removeDealFromGroup(dealId: string): Promise<Deal | undefined>;

  // Lead tourist operations
  getTouristsByLead(leadId: string): Promise<LeadTourist[]>;
  getTourist(id: string): Promise<LeadTourist | undefined>;
  createTourist(tourist: InsertLeadTourist): Promise<LeadTourist>;
  updateTourist(id: string, tourist: Partial<UpdateLeadTourist>): Promise<LeadTourist | undefined>;
  deleteTourist(id: string): Promise<boolean>;
  togglePrimaryTourist(leadId: string, touristId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ==================== EVENT OPERATIONS ====================

  async getEvent(id: string): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.startDate));
  }

  async getEventWithStats(id: string): Promise<EventWithStats | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;

    // Get all deals with their lead statuses
    const allDeals = await db
      .select({
        leadStatus: leads.status,
      })
      .from(deals)
      .innerJoin(contacts, eq(deals.contactId, contacts.id))
      .innerJoin(leads, eq(contacts.leadId, leads.id))
      .where(eq(deals.eventId, id));

    // Count by status categories (support both English and Russian values for backward compatibility)
    const confirmedCount = allDeals.filter(d => 
      d.leadStatus === 'converted' || d.leadStatus === 'Подтвержден'
    ).length;
    const cancelledCount = allDeals.filter(d => 
      d.leadStatus === 'lost' || d.leadStatus === 'Потерян' || d.leadStatus === 'Отменён'
    ).length;
    const pendingCount = allDeals.filter(d => 
      d.leadStatus !== 'converted' && d.leadStatus !== 'Подтвержден' &&
      d.leadStatus !== 'lost' && d.leadStatus !== 'Потерян' && d.leadStatus !== 'Отменён'
    ).length;

    const bookedCount = confirmedCount; // Only confirmed participants count as booked
    const availableSpots = event.participantLimit - bookedCount;

    return {
      ...event,
      bookedCount,
      availableSpots,
      statusCounts: {
        pending: pendingCount,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
      },
    };
  }

  async getAllEventsWithStats(): Promise<EventWithStats[]> {
    const allEvents = await this.getAllEvents();
    return Promise.all(
      allEvents.map(async (event) => {
        const stats = await this.getEventWithStats(event.id);
        return stats!;
      })
    );
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [result] = await db.insert(events).values(event).returning();
    return result;
  }

  async updateEvent(id: string, updates: Partial<UpdateEvent>): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    return result[0];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  async archiveExpiredEvents(): Promise<void> {
    await db
      .update(events)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(
        sql`${events.endDate} < CURRENT_DATE`,
        eq(events.isArchived, false)
      ));
  }

  async archiveEvent(id: string): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  async unarchiveEvent(id: string): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  // ==================== CONTACT OPERATIONS ====================

  async getContact(id: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async getContactsByLead(leadId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.leadId, leadId));
  }

  async getContactByLeadTourist(leadTouristId: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.leadTouristId, leadTouristId));
    return result[0];
  }

  async getContactWithDeals(id: string): Promise<ContactWithDeals | undefined> {
    const contact = await this.getContact(id);
    if (!contact) return undefined;

    const contactDeals = await this.getDealsByContact(id);
    const dealsWithDetails = await Promise.all(
      contactDeals.map(async (deal) => {
        const details = await this.getDealWithDetails(deal.id);
        return details!;
      })
    );

    return {
      ...contact,
      deals: dealsWithDetails,
    };
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [result] = await db.insert(contacts).values(contact).returning();
    return result;
  }

  async updateContact(id: string, updates: Partial<UpdateContact>): Promise<Contact | undefined> {
    const result = await db
      .update(contacts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    return result[0];
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  async getContactDetails(id: string): Promise<{ contact: Contact; leadTourist: LeadTourist | null } | undefined> {
    const contact = await this.getContact(id);
    if (!contact) {
      return undefined;
    }

    // Return contact with null leadTourist if not linked
    // This allows frontend to open dialog and seed data
    if (!contact.leadTouristId) {
      return { contact, leadTourist: null };
    }

    const tourist = await this.getTourist(contact.leadTouristId);
    // If linked but tourist missing (data integrity issue), return null
    return { contact, leadTourist: tourist || null };
  }

  async updateContactDetails(id: string, touristData: UpdateLeadTourist): Promise<void> {
    // Use transaction to handle both linked and unlinked contacts
    await db.transaction(async (tx) => {
      // Fetch contact within transaction
      const [contact] = await tx.select().from(contacts).where(eq(contacts.id, id));
      if (!contact) {
        throw new Error('Contact not found');
      }

      let touristId = contact.leadTouristId;
      let currentTourist: LeadTourist | null = null;

      // Fetch existing leadTourist if linked (within transaction)
      if (touristId) {
        const [tourist] = await tx.select().from(leadTourists).where(eq(leadTourists.id, touristId));
        currentTourist = tourist || null;
      }

      // If contact has no leadTourist or link is broken, create one from contact data
      if (!touristId || !currentTourist) {
        // Parse contact name into parts - handle single-token names gracefully
        const nameParts = (contact.name || '').trim().split(/\s+/).filter(Boolean);
        let seedFirstName = '';
        let seedLastName = '';
        let seedMiddleName: string | null = null;

        if (nameParts.length === 1) {
          // Single name - replicate to both fields to satisfy validation
          seedFirstName = nameParts[0];
          seedLastName = nameParts[0];
        } else if (nameParts.length === 2) {
          // Two names - treat as lastName firstName (Russian convention)
          seedLastName = nameParts[0];
          seedFirstName = nameParts[1];
        } else if (nameParts.length >= 3) {
          // Three or more - first is lastName (Russian convention)
          seedLastName = nameParts[0];
          seedFirstName = nameParts[1];
          seedMiddleName = nameParts[2];
        }

        // Use touristData values if provided, otherwise use seeds
        const [newTourist] = await tx.insert(leadTourists).values({
          leadId: null, // No lead association for legacy contacts
          lastName: touristData.lastName || seedLastName || '',
          firstName: touristData.firstName || seedFirstName || '',
          middleName: touristData.middleName !== undefined ? touristData.middleName : seedMiddleName,
          email: contact.email,
          phone: contact.phone,
          dateOfBirth: contact.birthDate,
          foreignPassportNumber: contact.passport,
          passportSeries: null,
          passportIssuedBy: null,
          registrationAddress: null,
          foreignPassportName: null,
          foreignPassportValidUntil: null,
          touristType: 'adult',
          isPrimary: false,
          notes: null,
          order: 0,
          ...touristData, // Apply updates on top of seed (touristData overrides seeds)
        }).returning();

        touristId = newTourist.id;
        currentTourist = newTourist;

        // Link contact to new leadTourist
        await tx.update(contacts).set({ leadTouristId: touristId }).where(eq(contacts.id, id));
      } else {
        // Update existing leadTourist
        await tx
          .update(leadTourists)
          .set({
            ...touristData,
            updatedAt: new Date(),
          })
          .where(eq(leadTourists.id, touristId));

        // Refresh currentTourist with updates for sync
        const [updated] = await tx.select().from(leadTourists).where(eq(leadTourists.id, touristId));
        currentTourist = updated;
      }

      // Sync denormalized fields back to contact
      const firstName = currentTourist.firstName;
      const lastName = currentTourist.lastName;
      const middleName = currentTourist.middleName;
      const fullName = `${lastName || ''} ${firstName || ''}${middleName ? ' ' + middleName : ''}`.trim();

      await tx
        .update(contacts)
        .set({
          name: fullName || contact.name, // Fallback to original if empty
          email: currentTourist.email,
          phone: currentTourist.phone,
          birthDate: currentTourist.dateOfBirth,
          passport: currentTourist.foreignPassportNumber,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id));
    });
  }

  // ==================== DEAL OPERATIONS ====================

  async getDeal(id: string): Promise<Deal | undefined> {
    const result = await db.select().from(deals).where(eq(deals.id, id));
    return result[0];
  }

  async getDealsByEvent(eventId: string): Promise<Deal[]> {
    return await db.select().from(deals).where(eq(deals.eventId, eventId));
  }

  async getDealsByContact(contactId: string): Promise<Deal[]> {
    return await db.select().from(deals).where(eq(deals.contactId, contactId));
  }

  async getDealWithDetails(id: string): Promise<DealWithDetails | undefined> {
    const deal = await this.getDeal(id);
    if (!deal) return undefined;

    const contact = await this.getContact(deal.contactId);
    const event = await this.getEvent(deal.eventId);
    const visits = await this.getCityVisitsByDeal(deal.id);

    if (!contact || !event) return undefined;

    return {
      ...deal,
      contact,
      event,
      visits,
    };
  }

  async getDealsWithDetailsByEvent(eventId: string): Promise<DealWithDetails[]> {
    const eventDeals = await this.getDealsByEvent(eventId);
    const dealsWithDetails = await Promise.all(
      eventDeals.map(async (deal) => {
        const details = await this.getDealWithDetails(deal.id);
        return details!;
      })
    );

    return dealsWithDetails.filter(d => d !== undefined);
  }

  // Helper: Update event isFull flag based on confirmed deals
  private async updateEventIsFull(eventId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event) return;

    const eventDeals = await this.getDealsByEvent(eventId);
    const confirmedCount = eventDeals.filter(d => d.status === "confirmed").length;
    const isFull = confirmedCount >= event.participantLimit;

    // Update only if status changed
    if (event.isFull !== isFull) {
      await db.update(events).set({ isFull }).where(eq(events.id, eventId));
    }
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [result] = await db.insert(deals).values(deal).returning();
    
    // Create notification for new booking
    const event = await this.getEvent(deal.eventId);
    const contact = await this.getContact(deal.contactId);
    
    if (event && contact) {
      await this.createNotification({
        type: 'new_booking',
        message: `Новое бронирование: ${contact.name} на событие "${event.name}"`,
        eventId: deal.eventId,
        contactId: deal.contactId,
      });

      // Check if group is nearly full (90% or more)
      const stats = await this.getEventWithStats(deal.eventId);
      if (stats && stats.availableSpots <= event.participantLimit * 0.1) {
        await this.createNotification({
          type: 'group_filled',
          message: `Группа почти заполнена: "${event.name}" (осталось ${stats.availableSpots} мест)`,
          eventId: deal.eventId,
        });
      }
    }

    // Auto-update isFull if status is confirmed
    if (deal.status === "confirmed") {
      await this.updateEventIsFull(deal.eventId);
    }

    return result;
  }

  async updateDeal(id: string, updates: Partial<UpdateDeal>): Promise<Deal | undefined> {
    const oldDeal = await this.getDeal(id);
    
    const result = await db
      .update(deals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();

    if (oldDeal) {
      // Auto-update isFull if status changed to/from confirmed
      const statusChanged = oldDeal.status !== updates.status && (oldDeal.status === "confirmed" || updates.status === "confirmed");
      // Auto-update isFull if eventId changed (move deal between events)
      const eventChanged = updates.eventId && updates.eventId !== oldDeal.eventId;

      if (statusChanged || eventChanged) {
        await this.updateEventIsFull(oldDeal.eventId);
        // If event changed, also update new event's isFull
        if (eventChanged && updates.eventId) {
          await this.updateEventIsFull(updates.eventId);
        }
      }
    }

    return result[0];
  }

  async deleteDeal(id: string): Promise<boolean> {
    const deal = await this.getDeal(id);
    const result = await db.delete(deals).where(eq(deals.id, id)).returning();
    
    // Auto-update isFull if deleted deal was confirmed
    if (deal && deal.status === "confirmed") {
      await this.updateEventIsFull(deal.eventId);
    }
    
    return result.length > 0;
  }

  // ==================== CITY VISIT OPERATIONS ====================

  async getCityVisitsByDeal(dealId: string): Promise<CityVisit[]> {
    return await db
      .select()
      .from(cityVisits)
      .where(eq(cityVisits.dealId, dealId));
  }

  async createCityVisit(visit: InsertCityVisit): Promise<CityVisit> {
    const [result] = await db.insert(cityVisits).values(visit).returning();
    return result;
  }

  async updateCityVisit(id: string, updates: Partial<InsertCityVisit>): Promise<CityVisit | undefined> {
    const result = await db
      .update(cityVisits)
      .set(updates)
      .where(eq(cityVisits.id, id))
      .returning();

    return result[0];
  }

  async deleteCityVisit(id: string): Promise<boolean> {
    const result = await db.delete(cityVisits).where(eq(cityVisits.id, id)).returning();
    return result.length > 0;
  }

  // ==================== NOTIFICATION OPERATIONS ====================

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async getAllNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.isRead, false))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByEvent(eventId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, eventId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async updateNotification(id: string, updates: Partial<UpdateNotification>): Promise<Notification | undefined> {
    const result = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();

    return result[0];
  }

  async markAsRead(id: string): Promise<Notification | undefined> {
    return await this.updateNotification(id, { isRead: true });
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  // ==================== USER OPERATIONS ====================

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // ==================== FORM OPERATIONS ====================

  async getForm(id: string): Promise<Form | undefined> {
    const result = await db.select().from(forms).where(eq(forms.id, id));
    return result[0];
  }

  async getFormsByUser(userId: string): Promise<Form[]> {
    return await db.select().from(forms).where(eq(forms.userId, userId));
  }

  async getAllForms(): Promise<Form[]> {
    return await db.select().from(forms);
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [result] = await db.insert(forms).values(form).returning();
    return result;
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form | undefined> {
    const result = await db
      .update(forms)
      .set(updates)
      .where(eq(forms.id, id))
      .returning();

    return result[0];
  }

  async deleteForm(id: string): Promise<boolean> {
    await db.delete(formFields).where(eq(formFields.formId, id));
    const result = await db.delete(forms).where(eq(forms.id, id)).returning();
    return result.length > 0;
  }

  // ==================== FORM FIELD OPERATIONS ====================

  async getFieldsByForm(formId: string): Promise<FormField[]> {
    return await db.select().from(formFields).where(eq(formFields.formId, formId));
  }

  async createFormField(field: InsertFormField): Promise<FormField> {
    const [result] = await db.insert(formFields).values(field).returning();
    return result;
  }

  async updateFormField(id: string, updates: Partial<InsertFormField>): Promise<FormField | undefined> {
    const result = await db
      .update(formFields)
      .set(updates)
      .where(eq(formFields.id, id))
      .returning();

    return result[0];
  }

  async deleteFormField(id: string): Promise<boolean> {
    const result = await db.delete(formFields).where(eq(formFields.id, id)).returning();
    return result.length > 0;
  }

  // ==================== LEAD OPERATIONS ====================

  async getLead(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }

  async getAllLeads(userId?: string, userRole?: string): Promise<LeadWithTouristCount[]> {
    // Auto-reactivate postponed leads whose date has passed
    const now = new Date();
    await db
      .update(leads)
      .set({ 
        status: 'new', 
        hasBeenContacted: true,
        postponedUntil: null 
      })
      .where(
        and(
          eq(leads.status, 'lost'),
          sql`${leads.postponedUntil} IS NOT NULL`,
          sql`${leads.postponedUntil} <= ${now}`
        )
      );
    
    // Build query with optional filtering for managers
    let query = db
      .select({
        id: leads.id,
        lastName: leads.lastName,
        firstName: leads.firstName,
        middleName: leads.middleName,
        phone: leads.phone,
        email: leads.email,
        clientCategory: leads.clientCategory,
        status: leads.status,
        source: leads.source,
        eventId: leads.eventId,
        tourCost: leads.tourCost,
        advancePayment: leads.advancePayment,
        remainingPayment: leads.remainingPayment,
        formId: leads.formId,
        color: leads.color,
        notes: leads.notes,
        assignedUserId: leads.assignedUserId,
        createdByUserId: leads.createdByUserId,
        postponedUntil: leads.postponedUntil,
        postponeReason: leads.postponeReason,
        hasBeenContacted: leads.hasBeenContacted,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        touristCount: sql<number>`cast(count(${leadTourists.id}) as int)`.as('touristCount')
      })
      .from(leads)
      .leftJoin(leadTourists, eq(leads.id, leadTourists.leadId));
    
    // Apply role-based filtering: managers see only their assigned leads
    if (userRole === 'manager' && userId) {
      query = query.where(eq(leads.assignedUserId, userId)) as typeof query;
    }
    
    const result = await query
      .groupBy(leads.id, leads.createdAt, leads.updatedAt)
      .orderBy(desc(leads.createdAt));
    
    return result;
  }

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(
        or(
          eq(leads.assignedUserId, userId),
          eq(leads.createdByUserId, userId)
        )
      );
  }

  async getLeadsByStatus(status: LeadStatus): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [result] = await db.insert(leads).values(lead).returning();
    
    await this.createHistoryEntry({
      leadId: result.id,
      oldStatus: null,
      newStatus: result.status,
      changedByUserId: lead.createdByUserId,
      note: "Lead created",
    });

    return result;
  }

  async createLeadWithAutoTourist(lead: InsertLead): Promise<Lead> {
    return await db.transaction(async (tx) => {
      // Create the lead
      const [createdLead] = await tx.insert(leads).values(lead).returning();
      
      // Create history entry
      await tx.insert(leadStatusHistory).values({
        leadId: createdLead.id,
        oldStatus: null,
        newStatus: createdLead.status,
        changedByUserId: lead.createdByUserId,
        note: "Lead created",
      });

      // Auto-create first tourist from lead contact data
      console.log(`[CREATE_LEAD_TX] Auto-creating first tourist for lead ${createdLead.id}`);
      await tx.insert(leadTourists).values({
        leadId: createdLead.id,
        lastName: createdLead.lastName,
        firstName: createdLead.firstName,
        middleName: createdLead.middleName,
        email: createdLead.email,
        phone: createdLead.phone,
        touristType: 'adult',
        isPrimary: true,
        isAutoCreated: true,
        order: 0,
      });
      console.log(`[CREATE_LEAD_TX] Auto-created tourist successfully`);

      return createdLead;
    });
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const currentLead = await this.getLead(id);
    if (!currentLead) return undefined;

    const result = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    if (updates.status && updates.status !== currentLead.status) {
      await this.createHistoryEntry({
        leadId: id,
        oldStatus: currentLead.status,
        newStatus: updates.status,
        changedByUserId: updates.assignedUserId || currentLead.assignedUserId || currentLead.createdByUserId,
        note: null,
      });
    }

    return result[0];
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(leadStatusHistory).where(eq(leadStatusHistory.leadId, id));
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  async updateLeadCostsByEventPrice(eventId: string, newPrice: string): Promise<void> {
    // Find all leads linked to this event
    const affectedLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.eventId, eventId));

    // Update each lead's tourCost based on tourist count
    for (const lead of affectedLeads) {
      // Count tourists for this lead
      const touristCount = await db
        .select({ count: count() })
        .from(leadTourists)
        .where(eq(leadTourists.leadId, lead.id));

      const numberOfTourists = touristCount[0]?.count || 1; // Minimum 1 tourist
      const calculatedCost = String(Number(newPrice) * numberOfTourists);

      // Update lead tourCost
      await db
        .update(leads)
        .set({
          tourCost: calculatedCost,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));
    }
  }

  // ==================== LEAD STATUS HISTORY OPERATIONS ====================

  async getHistoryByLead(leadId: string): Promise<LeadStatusHistoryEntry[]> {
    return await db
      .select()
      .from(leadStatusHistory)
      .where(eq(leadStatusHistory.leadId, leadId));
  }

  async createHistoryEntry(entry: InsertLeadStatusHistory): Promise<LeadStatusHistoryEntry> {
    const [result] = await db.insert(leadStatusHistory).values(entry).returning();
    return result;
  }

  // ==================== FORM SUBMISSION OPERATIONS ====================

  async getSubmission(id: string): Promise<FormSubmission | undefined> {
    const result = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
    return result[0];
  }

  async getSubmissionsByForm(formId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions).where(eq(formSubmissions.formId, formId));
  }

  async createSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const [result] = await db.insert(formSubmissions).values(submission).returning();
    return result;
  }

  async updateSubmission(id: string, updates: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined> {
    const result = await db
      .update(formSubmissions)
      .set(updates)
      .where(eq(formSubmissions.id, id))
      .returning();

    return result[0];
  }

  // ==================== GROUP OPERATIONS ====================

  async getGroup(id: string): Promise<Group | undefined> {
    const result = await db.select().from(groups).where(eq(groups.id, id));
    return result[0];
  }

  async getGroupsByEvent(eventId: string): Promise<Group[]> {
    return await db.select().from(groups).where(eq(groups.eventId, eventId));
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [result] = await db.insert(groups).values(group).returning();
    return result;
  }

  async updateGroup(id: string, updates: Partial<UpdateGroup>): Promise<Group | undefined> {
    const result = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();

    return result[0];
  }

  async deleteGroup(id: string): Promise<boolean> {
    await db.update(deals).set({ groupId: null, isPrimaryInGroup: false }).where(eq(deals.groupId, id));
    const result = await db.delete(groups).where(eq(groups.id, id)).returning();
    return result.length > 0;
  }

  async addDealToGroup(dealId: string, groupId: string, isPrimary: boolean = false): Promise<Deal | undefined> {
    const result = await db
      .update(deals)
      .set({
        groupId,
        isPrimaryInGroup: isPrimary,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId))
      .returning();

    return result[0];
  }

  async removeDealFromGroup(dealId: string): Promise<Deal | undefined> {
    const result = await db
      .update(deals)
      .set({
        groupId: null,
        isPrimaryInGroup: false,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId))
      .returning();

    return result[0];
  }

  // ==================== LEAD TOURIST OPERATIONS ====================

  async getTouristsByLead(leadId: string): Promise<LeadTourist[]> {
    return await db
      .select()
      .from(leadTourists)
      .where(eq(leadTourists.leadId, leadId))
      .orderBy(leadTourists.order);
  }

  async getTourist(id: string): Promise<LeadTourist | undefined> {
    const result = await db.select().from(leadTourists).where(eq(leadTourists.id, id));
    return result[0];
  }

  async createTourist(tourist: InsertLeadTourist): Promise<LeadTourist> {
    // Check if this is the first tourist for this lead
    const existingTourists = await db
      .select()
      .from(leadTourists)
      .where(eq(leadTourists.leadId, tourist.leadId));

    // If no existing tourists, make this one primary automatically
    const touristData = {
      ...tourist,
      isPrimary: existingTourists.length === 0 ? true : (tourist.isPrimary || false)
    };

    const [result] = await db.insert(leadTourists).values(touristData).returning();
    return result;
  }

  async updateTourist(id: string, updates: Partial<UpdateLeadTourist>): Promise<LeadTourist | undefined> {
    const result = await db
      .update(leadTourists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leadTourists.id, id))
      .returning();

    return result[0];
  }

  async deleteTourist(id: string): Promise<boolean> {
    // Get the tourist to be deleted
    const tourist = await this.getTourist(id);
    if (!tourist) return false;

    const wasPrimary = tourist.isPrimary;
    const leadId = tourist.leadId;

    // Delete the tourist
    const result = await db.delete(leadTourists).where(eq(leadTourists.id, id)).returning();
    
    // If the deleted tourist was primary, assign a new primary
    if (wasPrimary && result.length > 0) {
      const remainingTourists = await db
        .select()
        .from(leadTourists)
        .where(eq(leadTourists.leadId, leadId))
        .orderBy(leadTourists.createdAt)
        .limit(1);

      if (remainingTourists.length > 0) {
        await db
          .update(leadTourists)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(leadTourists.id, remainingTourists[0].id));
      }
    }

    return result.length > 0;
  }

  async togglePrimaryTourist(leadId: string, touristId: string): Promise<void> {
    console.log(`[TOGGLE_PRIMARY] Starting toggle for tourist ${touristId} in lead ${leadId}`);
    
    await db.transaction(async (tx) => {
      // Step 1: Unset isPrimary for all tourists in this lead
      console.log(`[TOGGLE_PRIMARY] Step 1: Demoting all tourists in lead ${leadId}`);
      const demoted = await tx
        .update(leadTourists)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(leadTourists.leadId, leadId))
        .returning();
      console.log(`[TOGGLE_PRIMARY] Demoted ${demoted.length} tourists`);

      // Step 2: Set isPrimary=true for the selected tourist
      console.log(`[TOGGLE_PRIMARY] Step 2: Promoting tourist ${touristId}`);
      const promoted = await tx
        .update(leadTourists)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(leadTourists.id, touristId))
        .returning();
      console.log(`[TOGGLE_PRIMARY] Promoted ${promoted.length} tourists`);
    });
    
    console.log(`[TOGGLE_PRIMARY] Transaction completed successfully`);
    
    // Verify the result
    const allTourists = await db
      .select()
      .from(leadTourists)
      .where(eq(leadTourists.leadId, leadId));
    const primaryCount = allTourists.filter(t => t.isPrimary).length;
    console.log(`[TOGGLE_PRIMARY] Verification: ${primaryCount} primary tourist(s) in lead ${leadId}`);
    
    if (primaryCount !== 1) {
      console.error(`[TOGGLE_PRIMARY] ERROR: Expected 1 primary tourist, but found ${primaryCount}!`);
    }
  }
}

export const storage = new DatabaseStorage();
