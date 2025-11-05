import { eq, and, or } from "drizzle-orm";
import { db } from "./db";
import {
  type Tourist,
  type InsertTourist,
  type CityVisit,
  type InsertCityVisit,
  type TouristWithVisits,
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
  tourists,
  cityVisits,
  users,
  forms,
  formFields,
  leads,
  leadStatusHistory,
  formSubmissions,
} from "@shared/schema";

export interface IStorage {
  // Tourist operations
  getTourist(id: string): Promise<Tourist | undefined>;
  getTouristsByEntity(entityId: string): Promise<TouristWithVisits[]>;
  getAllTourists(): Promise<TouristWithVisits[]>;
  createTourist(tourist: InsertTourist): Promise<Tourist>;
  updateTourist(id: string, tourist: Partial<InsertTourist>): Promise<Tourist | undefined>;
  deleteTourist(id: string): Promise<boolean>;

  // City visit operations
  getCityVisitsByTourist(touristId: string): Promise<CityVisit[]>;
  createCityVisit(visit: InsertCityVisit): Promise<CityVisit>;
  updateCityVisit(id: string, visit: Partial<InsertCityVisit>): Promise<CityVisit | undefined>;
  deleteCityVisit(id: string): Promise<boolean>;
  deleteCityVisitsByTourist(touristId: string): Promise<void>;

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
}

export class DatabaseStorage implements IStorage {
  // ==================== TOURIST OPERATIONS ====================
  
  async getTourist(id: string): Promise<Tourist | undefined> {
    const result = await db.select().from(tourists).where(eq(tourists.id, id));
    return result[0];
  }

  async getTouristsByEntity(entityId: string): Promise<TouristWithVisits[]> {
    const touristList = await db
      .select()
      .from(tourists)
      .where(eq(tourists.entityId, entityId));

    return Promise.all(
      touristList.map(async (tourist) => ({
        ...tourist,
        visits: await this.getCityVisitsByTourist(tourist.id),
      }))
    );
  }

  async getAllTourists(): Promise<TouristWithVisits[]> {
    const touristList = await db.select().from(tourists);

    return Promise.all(
      touristList.map(async (tourist) => ({
        ...tourist,
        visits: await this.getCityVisitsByTourist(tourist.id),
      }))
    );
  }

  async createTourist(insertTourist: InsertTourist): Promise<Tourist> {
    const { visits, ...touristData } = insertTourist as InsertTourist & { visits?: any[] };
    
    return await db.transaction(async (tx) => {
      const [tourist] = await tx
        .insert(tourists)
        .values(touristData)
        .returning();

      if (visits && visits.length > 0) {
        await tx.insert(cityVisits).values(
          visits.map((visit) => ({
            ...visit,
            touristId: tourist.id,
          }))
        );
      }

      return tourist;
    });
  }

  async updateTourist(id: string, updates: Partial<InsertTourist>): Promise<Tourist | undefined> {
    const result = await db
      .update(tourists)
      .set(updates)
      .where(eq(tourists.id, id))
      .returning();

    return result[0];
  }

  async deleteTourist(id: string): Promise<boolean> {
    // No need to manually delete cityVisits - FK constraint with onDelete: 'cascade' handles it
    const result = await db.delete(tourists).where(eq(tourists.id, id)).returning();
    return result.length > 0;
  }

  // ==================== CITY VISIT OPERATIONS ====================

  async getCityVisitsByTourist(touristId: string): Promise<CityVisit[]> {
    return await db
      .select()
      .from(cityVisits)
      .where(eq(cityVisits.touristId, touristId));
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

  async deleteCityVisitsByTourist(touristId: string): Promise<void> {
    await db.delete(cityVisits).where(eq(cityVisits.touristId, touristId));
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
}

export const storage = new DatabaseStorage();
