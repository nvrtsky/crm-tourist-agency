import type { InsertTourist } from "@shared/schema";

interface Bitrix24Config {
  webhookUrl: string;
}

export class Bitrix24Service {
  private webhookUrl: string;

  constructor(config: Bitrix24Config) {
    this.webhookUrl = config.webhookUrl;
  }

  private async call(method: string, params: Record<string, any> = {}): Promise<any> {
    const url = `${this.webhookUrl}${method}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Bitrix24 API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Bitrix24 error: ${data.error_description || data.error}`);
      }

      return data.result;
    } catch (error) {
      console.error(`Bitrix24 API call failed (${method}):`, error);
      throw error;
    }
  }

  // Create contact in Bitrix24 CRM
  async createContact(tourist: InsertTourist): Promise<string> {
    const params = {
      fields: {
        NAME: tourist.name.split(" ")[0] || tourist.name,
        LAST_NAME: tourist.name.split(" ").slice(1).join(" ") || "",
        EMAIL: tourist.email ? [{ VALUE: tourist.email, VALUE_TYPE: "WORK" }] : [],
        PHONE: tourist.phone ? [{ VALUE: tourist.phone, VALUE_TYPE: "WORK" }] : [],
      },
    };

    const contactId = await this.call("crm.contact.add", params);
    return String(contactId);
  }

  // Update contact in Bitrix24 CRM
  async updateContact(contactId: string, tourist: Partial<InsertTourist>): Promise<void> {
    const fields: Record<string, any> = {};

    if (tourist.name) {
      fields.NAME = tourist.name.split(" ")[0] || tourist.name;
      fields.LAST_NAME = tourist.name.split(" ").slice(1).join(" ") || "";
    }
    if (tourist.email !== undefined) {
      fields.EMAIL = tourist.email ? [{ VALUE: tourist.email, VALUE_TYPE: "WORK" }] : [];
    }
    if (tourist.phone !== undefined) {
      fields.PHONE = tourist.phone ? [{ VALUE: tourist.phone, VALUE_TYPE: "WORK" }] : [];
    }

    await this.call("crm.contact.update", { id: contactId, fields });
  }

  // Link contact to smart process entity
  async linkContactToEntity(entityId: string, entityTypeId: string, contactId: string): Promise<void> {
    await this.call("crm.item.contact.add", {
      entityTypeId: Number(entityTypeId),
      id: Number(entityId),
      fields: {
        CONTACT_ID: Number(contactId),
      },
    });
  }

  // Update entity user fields with tour route data
  async updateEntityUserFields(
    entityId: string,
    entityTypeId: string,
    routeData: any
  ): Promise<void> {
    const fields: Record<string, any> = {};
    
    // Store route data as JSON in user field
    if (process.env.UF_CRM_TOUR_ROUTE) {
      fields[process.env.UF_CRM_TOUR_ROUTE] = JSON.stringify(routeData);
    }

    await this.call("crm.item.update", { 
      entityTypeId: Number(entityTypeId),
      id: Number(entityId), 
      fields 
    });
  }

  // Get entity user fields
  async getEntityUserFields(entityId: string, entityTypeId: string): Promise<any> {
    const item = await this.call("crm.item.get", { 
      entityTypeId: Number(entityTypeId),
      id: Number(entityId)
    });
    
    if (process.env.UF_CRM_TOUR_ROUTE && item[process.env.UF_CRM_TOUR_ROUTE]) {
      try {
        return JSON.parse(item[process.env.UF_CRM_TOUR_ROUTE]);
      } catch (error) {
        console.error("Error parsing tour route data:", error);
        return null;
      }
    }
    
    return null;
  }

  // Get contact from Bitrix24 CRM
  async getContact(contactId: string): Promise<any> {
    return await this.call("crm.contact.get", { id: contactId });
  }

  // Update contact user fields (custom fields like passport)
  async updateContactUserFields(contactId: string, userFields: Record<string, any>): Promise<void> {
    await this.call("crm.contact.update", { 
      id: contactId, 
      fields: userFields 
    });
  }

  // Delete contact
  async deleteContact(contactId: string): Promise<void> {
    await this.call("crm.contact.delete", { id: contactId });
  }

  // Get deal from Bitrix24 CRM
  async getDeal(dealId: string): Promise<any> {
    return await this.call("crm.deal.get", { id: dealId });
  }

  // List deals with filter
  async listDeals(filter: Record<string, any> = {}): Promise<any[]> {
    const result = await this.call("crm.deal.list", { 
      filter,
      select: ["*", "UF_*"]  // Include all fields and user fields
    });
    return result || [];
  }

  // Get entity (smart process item) with all fields
  async getEntity(entityId: string, entityTypeId: string): Promise<any> {
    return await this.call("crm.item.get", { 
      entityTypeId: Number(entityTypeId),
      id: Number(entityId)
    });
  }
}

// Create singleton instance
let bitrix24Service: Bitrix24Service | null = null;

export function getBitrix24Service(): Bitrix24Service | null {
  const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;
  
  // Return null if webhook URL is not configured (development mode)
  if (!webhookUrl) {
    console.log("Bitrix24 integration disabled - BITRIX24_WEBHOOK_URL not set");
    return null;
  }

  if (!bitrix24Service) {
    bitrix24Service = new Bitrix24Service({ webhookUrl });
  }

  return bitrix24Service;
}
