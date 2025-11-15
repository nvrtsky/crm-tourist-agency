import { z } from "zod";

export type TouristFieldKey =
  | "lastName"
  | "firstName"
  | "middleName"
  | "dateOfBirth"
  | "email"
  | "phone"
  | "passportSeries"
  | "passportIssuedBy"
  | "registrationAddress"
  | "foreignPassportName"
  | "foreignPassportNumber"
  | "foreignPassportValidUntil"
  | "passportScans"
  | "touristType"
  | "notes"
  | "guideComment";

export interface TouristFieldDescriptor {
  key: TouristFieldKey;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "date" | "select" | "textarea" | "file";
  testId: string;
  section: "personal" | "passport" | "foreign" | "additional";
  selectOptions?: { value: string; label: string }[];
  required?: boolean;
  visibleForViewer?: boolean; // Видно для роли "Наблюдатель" (гид)
}

export const TOURIST_FIELD_DESCRIPTORS: readonly TouristFieldDescriptor[] = [
  // Personal section
  {
    key: "lastName",
    label: "Фамилия",
    placeholder: "Иванов",
    type: "text",
    testId: "input-tourist-lastName",
    section: "personal",
    required: true,
  },
  {
    key: "firstName",
    label: "Имя",
    placeholder: "Иван",
    type: "text",
    testId: "input-tourist-firstName",
    section: "personal",
    required: true,
  },
  {
    key: "middleName",
    label: "Отчество",
    placeholder: "Иванович",
    type: "text",
    testId: "input-tourist-middleName",
    section: "personal",
  },
  {
    key: "dateOfBirth",
    label: "Дата рождения",
    type: "date",
    testId: "input-tourist-dob",
    section: "personal",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "email@example.com",
    type: "email",
    testId: "input-tourist-email",
    section: "personal",
  },
  {
    key: "phone",
    label: "Телефон",
    placeholder: "+7 (999) 123-45-67",
    type: "text",
    testId: "input-tourist-phone",
    section: "personal",
    visibleForViewer: true,
  },
  // Passport section
  {
    key: "passportSeries",
    label: "Серия и номер паспорта РФ",
    placeholder: "1234 567890",
    type: "text",
    testId: "input-tourist-passport",
    section: "passport",
  },
  {
    key: "passportIssuedBy",
    label: "Кем выдан паспорт",
    placeholder: "ГУ МВД России",
    type: "text",
    testId: "input-tourist-passportIssuedBy",
    section: "passport",
  },
  {
    key: "registrationAddress",
    label: "Адрес регистрации",
    placeholder: "г. Москва, ул. Ленина, д. 1",
    type: "text",
    testId: "input-tourist-registration",
    section: "passport",
  },
  // Foreign passport section
  {
    key: "foreignPassportName",
    label: "ФИО латиницей (как в загранпаспорте)",
    placeholder: "IVANOV IVAN",
    type: "text",
    testId: "input-tourist-foreignName",
    section: "foreign",
    visibleForViewer: true,
  },
  {
    key: "foreignPassportNumber",
    label: "Номер загранпаспорта",
    placeholder: "72 1234567",
    type: "text",
    testId: "input-tourist-foreignPassport",
    section: "foreign",
    visibleForViewer: true,
  },
  {
    key: "foreignPassportValidUntil",
    label: "Действителен до",
    type: "date",
    testId: "input-tourist-foreignValidUntil",
    section: "foreign",
  },
  {
    key: "passportScans",
    label: "Скан загранпаспорта",
    type: "file",
    testId: "file-tourist-passportScans",
    section: "foreign",
    visibleForViewer: true,
  },
  // Additional section
  {
    key: "touristType",
    label: "Тип туриста",
    type: "select",
    testId: "select-tourist-type",
    section: "additional",
    visibleForViewer: true,
    selectOptions: [
      { value: "adult", label: "Взрослый" },
      { value: "child", label: "Ребенок" },
      { value: "infant", label: "Младенец" },
    ],
  },
  {
    key: "notes",
    label: "Примечания",
    placeholder: "Дополнительная информация",
    type: "textarea",
    testId: "textarea-tourist-notes",
    section: "additional",
  },
  {
    key: "guideComment",
    label: "Комментарий для гида",
    placeholder: "Особые требования, пожелания, важная информация для гида",
    type: "textarea",
    testId: "textarea-tourist-guideComment",
    section: "additional",
    visibleForViewer: true,
  },
] as const;

export const SECTION_TITLES = {
  personal: "Личные данные",
  passport: "Паспортные данные",
  foreign: "Загранпаспорт",
  additional: "Дополнительно",
} as const;

export function getFieldsBySection(section: TouristFieldDescriptor["section"]) {
  return TOURIST_FIELD_DESCRIPTORS.filter((f) => f.section === section);
}

export function getFieldDescriptor(key: TouristFieldKey): TouristFieldDescriptor | undefined {
  return TOURIST_FIELD_DESCRIPTORS.find((f) => f.key === key);
}
