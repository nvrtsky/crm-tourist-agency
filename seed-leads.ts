import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Список туров
const eventIds = [
  "6dcdefde-07a0-4a94-9d4b-c0ce2c9352df",
  "f18ed894-2d7f-4066-a460-f097234b43c8",
  "6e32724a-05da-4336-ad0a-103009916e97",
  "ddc2d154-8761-45a8-ab70-fb0d71fef228",
  "85beea94-2f8f-4e8b-89f5-1548902c75ad",
  "dcbb3dbf-bf90-47e2-8435-465f49b2feba",
  "df292f0d-b653-4abd-abee-3ac36d0cb715",
  "b07be2bc-1786-4fdb-b80a-c94f132ecc16",
  "060df214-70ec-4c3c-ada3-0381a76095e5",
];

const statuses = ["new", "contacted", "qualified", "converted"];
const sources = ["website", "referral", "social", "email"];
const colors = ["red", "blue", "green", "yellow", "purple", null, null, null];
const firstNames = ["Иван", "Мария", "Александр", "Елена", "Дмитрий", "Ольга", "Сергей", "Анна", "Михаил", "Татьяна", "Андрей", "Наталья", "Владимир", "Светлана", "Николай", "Екатерина", "Алексей", "Ирина", "Петр", "Юлия"];
const lastNames = ["Иванов", "Петров", "Сидоров", "Козлов", "Смирнов", "Попов", "Соколов", "Лебедев", "Новиков", "Морозов", "Волков", "Алексеев", "Лебедев", "Семенов", "Егоров", "Павлов", "Кузнецов", "Захаров", "Соловьев", "Борисов"];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
}

function generatePhone(): string {
  return `+7${randomInt(900, 999)}${randomInt(1000000, 9999999)}`;
}

function generatePassport(): string {
  return `${randomInt(1000, 9999)} ${randomInt(100000, 999999)}`;
}

function generateDate(yearsBack: number): string {
  const now = new Date();
  const year = now.getFullYear() - yearsBack;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function main() {
  console.log("Начинаем генерацию тестовых данных...");

  for (let i = 0; i < 20; i++) {
    const touristsCount = randomInt(1, 4);
    const status = randomElement(statuses);
    const source = randomElement(sources);
    const color = randomElement(colors);
    const eventId = randomElement(eventIds);

    const leadFirstName = randomElement(firstNames);
    const leadLastName = randomElement(lastNames);
    const leadEmail = generateEmail(leadFirstName, leadLastName);
    const leadPhone = generatePhone();

    console.log(`\nСоздаем лид ${i + 1}/20: ${leadFirstName} ${leadLastName}, туристов: ${touristsCount}`);

    // Создаем лид
    const [lead] = await sql`
      INSERT INTO leads (
        first_name,
        last_name,
        email, 
        phone, 
        status, 
        source, 
        client_category, 
        event_id,
        color,
        notes
      )
      VALUES (
        ${leadFirstName},
        ${leadLastName},
        ${leadEmail},
        ${leadPhone},
        ${status},
        ${source},
        ${touristsCount > 2 ? "family" : "individual"},
        ${eventId},
        ${color},
        ${`Тестовый лид ${i + 1}`}
      )
      RETURNING id
    `;

    console.log(`  Лид создан с ID: ${lead.id}`);

    // Создаем туристов для этого лида
    for (let t = 0; t < touristsCount; t++) {
      const touristFirstName = randomElement(firstNames);
      const touristLastName = randomElement(lastNames);
      const isPrimary = t === 0;
      const touristType = t < 2 ? "adult" : randomElement(["adult", "child", "infant"]);

      await sql`
        INSERT INTO lead_tourists (
          lead_id,
          first_name,
          last_name,
          tourist_type,
          is_primary,
          date_of_birth,
          passport_series,
          passport_issued_by,
          foreign_passport_number,
          foreign_passport_valid_until,
          email,
          phone
        )
        VALUES (
          ${lead.id},
          ${touristFirstName},
          ${touristLastName},
          ${touristType},
          ${isPrimary},
          ${generateDate(touristType === "adult" ? randomInt(25, 65) : randomInt(3, 15))},
          ${generatePassport()},
          ${"УМВД России"},
          ${String(randomInt(500000000, 599999999))},
          ${generateDate(-randomInt(3, 8))},
          ${generateEmail(touristFirstName, touristLastName)},
          ${generatePhone()}
        )
      `;

      console.log(`    Турист ${t + 1}: ${touristFirstName} ${touristLastName} (${touristType}${isPrimary ? ", основной" : ""})`);
    }
  }

  console.log("\n✅ Генерация завершена! Создано 20 лидов с туристами.");
  console.log("Теперь нужно запустить автоконвертацию через API...");
}

main().catch(console.error);
