import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LeadTourist } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CompletenessStatus = "complete" | "partial" | "empty" | "not_required";

export interface TouristDataCompleteness {
  personal: CompletenessStatus;
  russianPassport: CompletenessStatus;
  foreignPassport: CompletenessStatus;
}

export function calculateTouristDataCompleteness(tourist: LeadTourist): TouristDataCompleteness {
  const checkFields = (fields: (string | null | undefined | Date)[]): CompletenessStatus => {
    const nonEmptyCount = fields.filter(f => {
      if (f === null || f === undefined) return false;
      if (f instanceof Date) return true;
      if (typeof f === "string") return f.trim() !== "";
      return true;
    }).length;
    const totalCount = fields.length;
    
    if (nonEmptyCount === 0) return "empty";
    if (nonEmptyCount === totalCount) return "complete";
    return "partial";
  };

  const checkArrayField = (arr: string[] | null | undefined): boolean => {
    return arr !== null && arr !== undefined && arr.length > 0;
  };

  // Для личных данных: middleName, email и телефон обязательны только для основного туриста
  const personalFields: (string | null | undefined | Date)[] = [
    tourist.lastName,
    tourist.firstName,
    tourist.dateOfBirth,
  ];
  
  // Добавляем middleName, email и phone только если это основной турист (явная проверка на true)
  if (tourist.isPrimary === true) {
    personalFields.push(tourist.middleName, tourist.email, tourist.phone);
  }
  
  const personal = checkFields(personalFields);

  // Паспорт РФ обязателен только для основных туристов
  let russianPassport: CompletenessStatus;
  if (tourist.isPrimary === true) {
    russianPassport = checkFields([
      tourist.passportSeries,
      tourist.passportIssuedBy,
      tourist.registrationAddress,
    ]);
  } else {
    // Для неосновных туристов паспорт РФ необязателен
    // Проверяем заполненность и возвращаем not_required если пусто, или статус заполненности если есть данные
    const rfPassportStatus = checkFields([
      tourist.passportSeries,
      tourist.passportIssuedBy,
      tourist.registrationAddress,
    ]);
    russianPassport = rfPassportStatus === "empty" ? "not_required" : rfPassportStatus;
  }

  // Загранпаспорт обязателен для всех туристов (ФИО латиницей + номер + срок + сканы)
  const foreignPassportFields = [
    tourist.foreignPassportName,
    tourist.foreignPassportNumber,
    tourist.foreignPassportValidUntil,
  ];
  
  // Проверяем наличие сканов загранпаспорта
  const hasScans = checkArrayField(tourist.passportScans);
  
  const foreignPassportStatus = checkFields(foreignPassportFields);
  
  // Если все поля заполнены И есть сканы - complete
  // Если нет ничего И нет сканов - empty
  // Иначе - partial
  let foreignPassport: CompletenessStatus;
  if (foreignPassportStatus === "complete" && hasScans) {
    foreignPassport = "complete";
  } else if (foreignPassportStatus === "empty" && !hasScans) {
    foreignPassport = "empty";
  } else {
    foreignPassport = "partial";
  }

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
