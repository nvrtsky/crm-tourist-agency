import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LeadTourist } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CompletenessStatus = "complete" | "partial" | "empty";

export interface TouristDataCompleteness {
  personal: CompletenessStatus;
  russianPassport: CompletenessStatus;
  foreignPassport: CompletenessStatus;
}

export function calculateTouristDataCompleteness(tourist: LeadTourist): TouristDataCompleteness {
  const checkFields = (fields: (string | null | undefined)[]): CompletenessStatus => {
    const nonEmptyCount = fields.filter(f => f !== null && f !== undefined && f.trim() !== "").length;
    const totalCount = fields.length;
    
    if (nonEmptyCount === 0) return "empty";
    if (nonEmptyCount === totalCount) return "complete";
    return "partial";
  };

  // Для личных данных: email и телефон обязательны только для основного туриста
  const personalFields = [
    tourist.lastName,
    tourist.firstName,
    tourist.dateOfBirth,
  ];
  
  // Добавляем email и phone только если это основной турист (явная проверка на true)
  if (tourist.isPrimary === true) {
    personalFields.push(tourist.email, tourist.phone);
  }
  
  const personal = checkFields(personalFields);

  const russianPassport = checkFields([
    tourist.passportSeries,
    tourist.passportIssuedBy,
    tourist.registrationAddress,
  ]);

  const foreignPassport = checkFields([
    tourist.foreignPassportName,
    tourist.foreignPassportNumber,
    tourist.foreignPassportValidUntil,
  ]);

  return {
    personal,
    russianPassport,
    foreignPassport,
  };
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "0";
  }
  
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numValue);
}
