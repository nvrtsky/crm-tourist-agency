import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LeadTourist } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CompletenessStatus = "complete" | "partial" | "empty" | "not_required";

export interface CategoryCompleteness {
  status: CompletenessStatus;
  missingFields: string[];
}

export interface TouristDataCompleteness {
  personal: CategoryCompleteness;
  russianPassport: CategoryCompleteness;
  foreignPassport: CategoryCompleteness;
}

const fieldLabels: Record<string, string> = {
  lastName: "Фамилия",
  firstName: "Имя",
  middleName: "Отчество",
  dateOfBirth: "Дата рождения",
  email: "Email",
  phone: "Телефон",
  passportSeries: "Серия и номер",
  passportIssuedBy: "Кем выдан",
  registrationAddress: "Адрес регистрации",
  foreignPassportName: "ФИО",
  foreignPassportNumber: "Номер",
  foreignPassportValidUntil: "Действ. до",
  passportScans: "Скан",
};

export function calculateTouristDataCompleteness(tourist: LeadTourist): TouristDataCompleteness {
  const checkFieldsWithNames = (
    fields: { name: string; value: string | null | undefined | Date | string[] }[]
  ): CategoryCompleteness => {
    const missingFields: string[] = [];
    
    fields.forEach(({ name, value }) => {
      let isEmpty = false;
      if (value === null || value === undefined) {
        isEmpty = true;
      } else if (value instanceof Date) {
        isEmpty = false;
      } else if (Array.isArray(value)) {
        isEmpty = value.length === 0;
      } else if (typeof value === "string") {
        isEmpty = value.trim() === "";
      }
      
      if (isEmpty) {
        missingFields.push(fieldLabels[name] || name);
      }
    });
    
    const totalCount = fields.length;
    const filledCount = totalCount - missingFields.length;
    
    let status: CompletenessStatus;
    if (filledCount === 0) {
      status = "empty";
    } else if (filledCount === totalCount) {
      status = "complete";
    } else {
      status = "partial";
    }
    
    return { status, missingFields };
  };

  const personalFields: { name: string; value: string | null | undefined | Date }[] = [
    { name: "lastName", value: tourist.lastName },
    { name: "firstName", value: tourist.firstName },
    { name: "dateOfBirth", value: tourist.dateOfBirth },
  ];
  
  if (tourist.isPrimary === true) {
    personalFields.push(
      { name: "middleName", value: tourist.middleName },
      { name: "email", value: tourist.email },
      { name: "phone", value: tourist.phone }
    );
  }
  
  const personal = checkFieldsWithNames(personalFields);

  let russianPassport: CategoryCompleteness;
  if (tourist.isPrimary === true) {
    russianPassport = checkFieldsWithNames([
      { name: "passportSeries", value: tourist.passportSeries },
      { name: "passportIssuedBy", value: tourist.passportIssuedBy },
    ]);
  } else {
    const rfFields = [
      { name: "passportSeries", value: tourist.passportSeries },
      { name: "passportIssuedBy", value: tourist.passportIssuedBy },
    ];
    const result = checkFieldsWithNames(rfFields);
    if (result.status === "empty") {
      russianPassport = { status: "not_required", missingFields: [] };
    } else {
      russianPassport = result;
    }
  }

  const foreignPassport = checkFieldsWithNames([
    { name: "foreignPassportName", value: tourist.foreignPassportName },
    { name: "foreignPassportNumber", value: tourist.foreignPassportNumber },
    { name: "foreignPassportValidUntil", value: tourist.foreignPassportValidUntil },
    { name: "passportScans", value: tourist.passportScans },
  ]);

  return {
    personal,
    russianPassport,
    foreignPassport,
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  CNY: "¥",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function formatCurrency(value: string | number | null | undefined, currency?: string): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "0";
  }
  
  const formattedNumber = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numValue);
  
  if (currency) {
    const symbol = getCurrencySymbol(currency);
    return `${formattedNumber} ${symbol}`;
  }
  
  return formattedNumber;
}

export function formatTouristName(
  leadTourist: LeadTourist | null | undefined, 
  contactName: string | null | undefined
): string {
  if (!leadTourist) {
    return contactName || "—";
  }

  if (leadTourist.foreignPassportName) {
    return leadTourist.foreignPassportName;
  }

  const parts: string[] = [];
  if (leadTourist.lastName) parts.push(leadTourist.lastName);
  if (leadTourist.firstName) parts.push(leadTourist.firstName);
  if (leadTourist.middleName) parts.push(leadTourist.middleName);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return contactName || "—";
}
