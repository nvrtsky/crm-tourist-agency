import {
  type Tourist,
  type InsertTourist,
  type CityVisit,
  type InsertCityVisit,
  type TouristWithVisits,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Tourist operations
  getTourist(id: string): Promise<Tourist | undefined>;
  getTouristsByDeal(dealId: string): Promise<TouristWithVisits[]>;
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
}

export class MemStorage implements IStorage {
  private tourists: Map<string, Tourist>;
  private cityVisits: Map<string, CityVisit>;

  constructor() {
    this.tourists = new Map();
    this.cityVisits = new Map();
  }

  async getTourist(id: string): Promise<Tourist | undefined> {
    return this.tourists.get(id);
  }

  async getTouristsByDeal(dealId: string): Promise<TouristWithVisits[]> {
    const tourists = Array.from(this.tourists.values()).filter(
      (tourist) => tourist.dealId === dealId
    );
    
    return Promise.all(
      tourists.map(async (tourist) => ({
        ...tourist,
        visits: await this.getCityVisitsByTourist(tourist.id),
      }))
    );
  }

  async getAllTourists(): Promise<TouristWithVisits[]> {
    const tourists = Array.from(this.tourists.values());
    return Promise.all(
      tourists.map(async (tourist) => ({
        ...tourist,
        visits: await this.getCityVisitsByTourist(tourist.id),
      }))
    );
  }

  async createTourist(insertTourist: InsertTourist): Promise<Tourist> {
    const id = randomUUID();
    const tourist: Tourist = {
      id,
      dealId: insertTourist.dealId,
      bitrixContactId: insertTourist.bitrixContactId ?? null,
      name: insertTourist.name,
      email: insertTourist.email ?? null,
      phone: insertTourist.phone ?? null,
    };
    this.tourists.set(id, tourist);
    return tourist;
  }

  async updateTourist(id: string, updates: Partial<InsertTourist>): Promise<Tourist | undefined> {
    const tourist = this.tourists.get(id);
    if (!tourist) return undefined;
    
    const updated: Tourist = {
      ...tourist,
      ...updates,
      email: updates.email !== undefined ? updates.email ?? null : tourist.email,
      phone: updates.phone !== undefined ? updates.phone ?? null : tourist.phone,
      bitrixContactId: updates.bitrixContactId !== undefined ? updates.bitrixContactId ?? null : tourist.bitrixContactId,
    };
    this.tourists.set(id, updated);
    return updated;
  }

  async deleteTourist(id: string): Promise<boolean> {
    await this.deleteCityVisitsByTourist(id);
    return this.tourists.delete(id);
  }

  async getCityVisitsByTourist(touristId: string): Promise<CityVisit[]> {
    return Array.from(this.cityVisits.values()).filter(
      (visit) => visit.touristId === touristId
    );
  }

  async createCityVisit(insertVisit: InsertCityVisit): Promise<CityVisit> {
    const id = randomUUID();
    const visit: CityVisit = { ...insertVisit, id };
    this.cityVisits.set(id, visit);
    return visit;
  }

  async updateCityVisit(id: string, updates: Partial<InsertCityVisit>): Promise<CityVisit | undefined> {
    const visit = this.cityVisits.get(id);
    if (!visit) return undefined;
    
    const updated = { ...visit, ...updates };
    this.cityVisits.set(id, updated);
    return updated;
  }

  async deleteCityVisit(id: string): Promise<boolean> {
    return this.cityVisits.delete(id);
  }

  async deleteCityVisitsByTourist(touristId: string): Promise<void> {
    const visits = await this.getCityVisitsByTourist(touristId);
    visits.forEach((visit) => this.cityVisits.delete(visit.id));
  }
}

export const storage = new MemStorage();
