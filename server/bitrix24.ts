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

  // Link contact to deal
  async linkContactToDeal(dealId: string, contactId: string): Promise<void> {
    await this.call("crm.deal.contact.add", {
      id: dealId,
      fields: {
        CONTACT_ID: contactId,
      },
    });
  }

  // Update deal user fields with tour route data
  async updateDealUserFields(
    dealId: string,
    routeData: any
  ): Promise<void> {
    const fields: Record<string, any> = {};
    
    // Store route data as JSON in user field
    if (process.env.UF_CRM_TOUR_ROUTE) {
      fields[process.env.UF_CRM_TOUR_ROUTE] = JSON.stringify(routeData);
    }

    await this.call("crm.deal.update", { id: dealId, fields });
  }

  // Get deal user fields
  async getDealUserFields(dealId: string): Promise<any> {
    const deal = await this.call("crm.deal.get", { id: dealId });
    
    if (process.env.UF_CRM_TOUR_ROUTE && deal[process.env.UF_CRM_TOUR_ROUTE]) {
      try {
        return JSON.parse(deal[process.env.UF_CRM_TOUR_ROUTE]);
      } catch (error) {
        console.error("Error parsing tour route data:", error);
        return null;
      }
    }
    
    return null;
  }

  // Delete contact
  async deleteContact(contactId: string): Promise<void> {
    await this.call("crm.contact.delete", { id: contactId });
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
