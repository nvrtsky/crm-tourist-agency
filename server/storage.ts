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
  type LeadStatusHistoryEntry,
  type InsertLeadStatusHistory,
  type FormSubmission,
  type InsertFormSubmission,
  type LeadStatus,
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

  // Contact operations
  getContact(id: string): Promise<Contact | undefined>;
  getAllContacts(): Promise<Contact[]>;
  getContactsByLead(leadId: string): Promise<Contact[]>;
  getContactWithDeals(id: string): Promise<ContactWithDeals | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<UpdateContact>): Promise<Contact | undefined>;
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
  getAllLeads(): Promise<Lead[]>;
  getLeadsByUser(userId: string): Promise<Lead[]>;
  getLeadsByStatus(status: LeadStatus): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Lead status history operations
  getHistoryByLead(leadId: string): Promise<LeadStatusHistoryEntry[]>;
  createHistoryEntry(entry: InsertLeadStatusHistory): Promise<LeadStatusHistoryEntry>;

  // Form submission operations
  getSubmission(id: string): Promise<FormSubmission | undefined>;
  getSubmissionsByForm(formId: string): Promise<FormSubmission[]>;
  createSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  updateSubmission(id: string, submission: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined>;
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

    const dealsCount = await db
      .select({ count: count() })
      .from(deals)
      .where(and(
        eq(deals.eventId, id),
        eq(deals.status, 'confirmed')
      ));

    const bookedCount = dealsCount[0]?.count || 0;
    const availableSpots = event.participantLimit - Number(bookedCount);

    return {
      ...event,
      bookedCount: Number(bookedCount),
      availableSpots,
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

    return result;
  }

  async updateDeal(id: string, updates: Partial<UpdateDeal>): Promise<Deal | undefined> {
    const result = await db
      .update(deals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();

    return result[0];
  }

  async deleteDeal(id: string): Promise<boolean> {
    const result = await db.delete(deals).where(eq(deals.id, id)).returning();
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

  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
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
}

export const storage = new DatabaseStorage();
