import { db } from "./db";
import { 
  events, contacts, deals, leads, notifications, cityVisits, 
  leadTourists, eventParticipantExpenses, eventCommonExpenses 
} from "../shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting database seeding...");

  console.log("🗑️  Clearing existing data...");
  await db.delete(notifications);
  await db.delete(eventParticipantExpenses);
  await db.delete(eventCommonExpenses);
  await db.delete(cityVisits);
  await db.delete(deals);
  await db.delete(contacts);
  await db.delete(leadTourists);
  await db.delete(events);
  await db.delete(leads);

  console.log("✅ Existing data cleared");

  console.log("🎫 Creating 8 test events (tours)...");
  const testEvents = await db.insert(events).values([
    {
      name: "Весенний Китай: Пекин–Сиань–Шанхай",
      description: "Классический маршрут по главным городам Китая с посещением Великой Стены и Терракотовой армии",
      country: "Китай",
      cities: ["Пекин", "Сиань", "Шанхай"],
      tourType: "group",
      startDate: "2026-04-15",
      endDate: "2026-04-25",
      participantLimit: 16,
      price: "189000",
      currency: "RUB",
      colorTag: "blue",
    },
    {
      name: "Горы Чжанцзяцзе и Фэнхуан",
      description: "Уникальный тур по горам Аватара и древнему городу Фэнхуан",
      country: "Китай",
      cities: ["Чанша", "Чжанцзяцзе", "Фэнхуан"],
      tourType: "group",
      startDate: "2026-05-10",
      endDate: "2026-05-18",
      participantLimit: 12,
      price: "2150",
      currency: "USD",
      colorTag: "green",
    },
    {
      name: "Шёлковый путь: Сиань–Ланьчжоу–Дуньхуан",
      description: "Путешествие по древнему Шёлковому пути с посещением пещер Могао",
      country: "Китай",
      cities: ["Сиань", "Ланьчжоу", "Цзяюйгуань", "Дуньхуан"],
      tourType: "group",
      startDate: "2026-06-01",
      endDate: "2026-06-12",
      participantLimit: 14,
      price: "15800",
      currency: "CNY",
    },
    {
      name: "Южный Китай: Гуйлинь и Яншо",
      description: "Живописные карстовые горы и река Лицзян",
      country: "Китай",
      cities: ["Гуйлинь", "Яншо", "Лунцзи"],
      tourType: "group",
      startDate: "2026-07-05",
      endDate: "2026-07-12",
      participantLimit: 18,
      price: "145000",
      currency: "RUB",
      colorTag: "yellow",
    },
    {
      name: "Тибет: Лхаса и окрестности",
      description: "Духовное путешествие в Тибет с посещением дворца Потала",
      country: "Китай",
      cities: ["Лхаса", "Шигадзе", "Гьянце"],
      tourType: "group",
      startDate: "2026-08-15",
      endDate: "2026-08-25",
      participantLimit: 10,
      price: "2890",
      currency: "EUR",
    },
    {
      name: "Гонконг и Макао",
      description: "Современные мегаполисы и казино Макао",
      country: "Китай",
      cities: ["Гонконг", "Макао"],
      tourType: "group",
      startDate: "2026-09-10",
      endDate: "2026-09-16",
      participantLimit: 20,
      price: "128000",
      currency: "RUB",
    },
    {
      name: "Юньнань: Лицзян и Шангри-Ла",
      description: "Путешествие в край вечной весны и загадочную Шангри-Лу",
      country: "Китай",
      cities: ["Куньмин", "Дали", "Лицзян", "Шангри-Ла"],
      tourType: "group",
      startDate: "2026-10-01",
      endDate: "2026-10-11",
      participantLimit: 15,
      price: "198000",
      currency: "RUB",
      colorTag: "purple",
    },
    {
      name: "Хайнань: отдых у моря",
      description: "Пляжный отдых на тропическом острове Хайнань",
      country: "Китай",
      cities: ["Санья", "Хайкоу"],
      tourType: "individual",
      startDate: "2026-11-15",
      endDate: "2026-11-25",
      participantLimit: 25,
      price: "95000",
      currency: "RUB",
    },
  ]).returning();

  console.log(`✅ Created ${testEvents.length} test events`);

  console.log("📝 Creating 15 test leads...");
  const testLeads = await db.insert(leads).values([
    {
      lastName: "Петров",
      firstName: "Александр",
      middleName: "Иванович",
      email: "petrov@example.com",
      phone: "+7 (915) 123-45-67",
      status: "converted",
      source: "website",
      notes: "Постоянный клиент, путешествует с семьёй",
      eventId: testEvents[0].id,
      tourCost: "378000",
      tourCostCurrency: "RUB",
      advancePayment: "150000",
      advancePaymentCurrency: "RUB",
      remainingPayment: "228000",
      remainingPaymentCurrency: "RUB",
      category: "family",
      colorTag: "blue",
    },
    {
      lastName: "Сидорова",
      firstName: "Елена",
      middleName: "Павловна",
      email: "sidorova@example.com",
      phone: "+7 (926) 234-56-78",
      status: "converted",
      source: "referral",
      notes: "Рекомендация от Петровых",
      eventId: testEvents[0].id,
      tourCost: "189000",
      tourCostCurrency: "RUB",
      advancePayment: "189000",
      advancePaymentCurrency: "RUB",
      category: "single",
    },
    {
      lastName: "Козлов",
      firstName: "Дмитрий",
      middleName: "Сергеевич",
      email: "kozlov@example.com",
      phone: "+7 (903) 345-67-89",
      status: "converted",
      source: "direct",
      notes: "VIP клиент, требует повышенного внимания",
      eventId: testEvents[1].id,
      tourCost: "4300",
      tourCostCurrency: "USD",
      advancePayment: "2000",
      advancePaymentCurrency: "USD",
      remainingPayment: "2300",
      remainingPaymentCurrency: "USD",
      category: "couple",
      colorTag: "green",
    },
    {
      lastName: "Морозова",
      firstName: "Анна",
      middleName: "Владимировна",
      email: "morozova@example.com",
      phone: "+7 (916) 456-78-90",
      status: "converted",
      source: "website",
      notes: "Любит горные походы",
      eventId: testEvents[1].id,
      tourCost: "2150",
      tourCostCurrency: "USD",
      advancePayment: "1000",
      advancePaymentCurrency: "USD",
      remainingPayment: "1150",
      remainingPaymentCurrency: "USD",
    },
    {
      lastName: "Новиков",
      firstName: "Сергей",
      middleName: "Петрович",
      email: "novikov@example.com",
      phone: "+7 (925) 567-89-01",
      status: "converted",
      source: "social_media",
      notes: "Интересуется историей Шёлкового пути",
      eventId: testEvents[2].id,
      tourCost: "31600",
      tourCostCurrency: "CNY",
      advancePayment: "15000",
      advancePaymentCurrency: "CNY",
      remainingPayment: "16600",
      remainingPaymentCurrency: "CNY",
      category: "couple",
    },
    {
      lastName: "Волкова",
      firstName: "Мария",
      middleName: "Андреевна",
      email: "volkova@example.com",
      phone: "+7 (909) 678-90-12",
      status: "qualified",
      source: "website",
      notes: "Планирует поездку на юг Китая с подругой",
      eventId: testEvents[3].id,
      selectedCities: ["Гуйлинь", "Яншо"],
      tourCost: "290000",
      tourCostCurrency: "RUB",
      category: "friends",
    },
    {
      lastName: "Федоров",
      firstName: "Игорь",
      middleName: "Викторович",
      email: "fedorov@example.com",
      phone: "+7 (917) 789-01-23",
      status: "qualified",
      source: "referral",
      notes: "Мечтает о Тибете, готов к сложному маршруту",
      eventId: testEvents[4].id,
      tourCost: "2890",
      tourCostCurrency: "EUR",
    },
    {
      lastName: "Григорьева",
      firstName: "Ольга",
      middleName: "Николаевна",
      email: "grigorieva@example.com",
      phone: "+7 (905) 890-12-34",
      status: "contacted",
      source: "website",
      notes: "Интересуется Гонконгом и шоппингом",
      eventId: testEvents[5].id,
    },
    {
      lastName: "Соколов",
      firstName: "Андрей",
      middleName: "Михайлович",
      email: "sokolov@example.com",
      phone: "+7 (919) 901-23-45",
      status: "contacted",
      source: "direct",
      notes: "Был в офисе, взял каталоги",
    },
    {
      lastName: "Лебедева",
      firstName: "Татьяна",
      middleName: "Сергеевна",
      email: "lebedeva@example.com",
      phone: "+7 (906) 012-34-56",
      status: "new",
      source: "website",
      notes: "Оставила заявку на сайте на тур в Юньнань",
    },
    {
      lastName: "Кузнецов",
      firstName: "Владимир",
      middleName: "Александрович",
      email: "kuznetsov@example.com",
      phone: "+7 (916) 123-45-67",
      status: "new",
      source: "social_media",
      notes: "Написал в WhatsApp, интересуется Хайнанем",
    },
    {
      lastName: "Попов",
      firstName: "Николай",
      middleName: "Дмитриевич",
      email: "popov@example.com",
      phone: "+7 (925) 234-56-78",
      status: "new",
      source: "referral",
      notes: "Рекомендация от Соколова",
    },
    {
      lastName: "Орлова",
      firstName: "Светлана",
      middleName: "Владимировна",
      email: "orlova@example.com",
      phone: "+7 (903) 345-67-89",
      status: "postponed",
      source: "website",
      postponedUntil: new Date("2026-03-01"),
      notes: "Отложила решение до весны",
    },
    {
      lastName: "Белов",
      firstName: "Евгений",
      middleName: "Павлович",
      email: "belov@example.com",
      phone: "+7 (909) 456-78-90",
      status: "lost",
      source: "direct",
      notes: "Выбрал другое агентство из-за цены",
    },
    {
      lastName: "Крылова",
      firstName: "Ирина",
      middleName: "Игоревна",
      email: "krylova@example.com",
      phone: "+7 (917) 567-89-01",
      status: "new",
      source: "booking",
      notes: "Заявка через онлайн-бронирование",
    },
  ]).returning();

  console.log(`✅ Created ${testLeads.length} test leads`);

  console.log("👨‍👩‍👧‍👦 Creating lead tourists...");
  const testLeadTourists = await db.insert(leadTourists).values([
    {
      leadId: testLeads[0].id,
      lastName: "Петров",
      firstName: "Александр",
      middleName: "Иванович",
      email: "petrov@example.com",
      phone: "+7 (915) 123-45-67",
      dateOfBirth: "1980-05-15",
      passportSeries: "4515 123456",
      foreignPassportName: "PETROV ALEKSANDR",
      foreignPassportNumber: "75 1234567",
      foreignPassportValidUntil: "2030-05-15",
      touristType: "main",
    },
    {
      leadId: testLeads[0].id,
      lastName: "Петрова",
      firstName: "Наталья",
      middleName: "Сергеевна",
      email: "petrova@example.com",
      phone: "+7 (915) 123-45-68",
      dateOfBirth: "1982-08-22",
      passportSeries: "4515 123457",
      foreignPassportName: "PETROVA NATALIA",
      foreignPassportNumber: "75 1234568",
      foreignPassportValidUntil: "2030-08-22",
      touristType: "family",
    },
    {
      leadId: testLeads[1].id,
      lastName: "Сидорова",
      firstName: "Елена",
      middleName: "Павловна",
      email: "sidorova@example.com",
      phone: "+7 (926) 234-56-78",
      dateOfBirth: "1975-11-03",
      passportSeries: "4612 234567",
      foreignPassportName: "SIDOROVA ELENA",
      foreignPassportNumber: "76 2345678",
      foreignPassportValidUntil: "2029-11-03",
      touristType: "main",
    },
    {
      leadId: testLeads[2].id,
      lastName: "Козлов",
      firstName: "Дмитрий",
      middleName: "Сергеевич",
      email: "kozlov@example.com",
      phone: "+7 (903) 345-67-89",
      dateOfBirth: "1978-03-28",
      foreignPassportName: "KOZLOV DMITRY",
      foreignPassportNumber: "77 3456789",
      foreignPassportValidUntil: "2031-03-28",
      touristType: "main",
    },
    {
      leadId: testLeads[2].id,
      lastName: "Козлова",
      firstName: "Ирина",
      middleName: "Александровна",
      dateOfBirth: "1980-07-15",
      foreignPassportName: "KOZLOVA IRINA",
      foreignPassportNumber: "77 3456790",
      foreignPassportValidUntil: "2031-07-15",
      touristType: "family",
    },
    {
      leadId: testLeads[3].id,
      lastName: "Морозова",
      firstName: "Анна",
      middleName: "Владимировна",
      email: "morozova@example.com",
      phone: "+7 (916) 456-78-90",
      dateOfBirth: "1990-12-10",
      foreignPassportName: "MOROZOVA ANNA",
      foreignPassportNumber: "78 4567890",
      foreignPassportValidUntil: "2032-12-10",
      touristType: "main",
    },
    {
      leadId: testLeads[4].id,
      lastName: "Новиков",
      firstName: "Сергей",
      middleName: "Петрович",
      email: "novikov@example.com",
      phone: "+7 (925) 567-89-01",
      dateOfBirth: "1985-01-20",
      foreignPassportName: "NOVIKOV SERGEY",
      foreignPassportNumber: "79 5678901",
      foreignPassportValidUntil: "2030-01-20",
      touristType: "main",
    },
    {
      leadId: testLeads[4].id,
      lastName: "Новикова",
      firstName: "Екатерина",
      middleName: "Дмитриевна",
      dateOfBirth: "1987-06-08",
      foreignPassportName: "NOVIKOVA EKATERINA",
      foreignPassportNumber: "79 5678902",
      foreignPassportValidUntil: "2030-06-08",
      touristType: "family",
    },
  ]).returning();

  console.log(`✅ Created ${testLeadTourists.length} lead tourists`);

  console.log("👥 Creating contacts from converted leads...");
  const testContacts = await db.insert(contacts).values([
    {
      name: "Петров Александр Иванович",
      email: "petrov@example.com",
      phone: "+7 (915) 123-45-67",
      passport: "4515 123456",
      birthDate: "1980-05-15",
      leadId: testLeads[0].id,
      leadTouristId: testLeadTourists[0].id,
      notes: "Глава семьи, постоянный клиент",
    },
    {
      name: "Петрова Наталья Сергеевна",
      email: "petrova@example.com",
      phone: "+7 (915) 123-45-68",
      passport: "4515 123457",
      birthDate: "1982-08-22",
      leadId: testLeads[0].id,
      leadTouristId: testLeadTourists[1].id,
      notes: "Жена Петрова А.И.",
    },
    {
      name: "Сидорова Елена Павловна",
      email: "sidorova@example.com",
      phone: "+7 (926) 234-56-78",
      passport: "4612 234567",
      birthDate: "1975-11-03",
      leadId: testLeads[1].id,
      leadTouristId: testLeadTourists[2].id,
      notes: "Путешествует одна",
    },
    {
      name: "Козлов Дмитрий Сергеевич",
      email: "kozlov@example.com",
      phone: "+7 (903) 345-67-89",
      passport: "4718 345678",
      birthDate: "1978-03-28",
      leadId: testLeads[2].id,
      leadTouristId: testLeadTourists[3].id,
      notes: "VIP клиент",
    },
    {
      name: "Козлова Ирина Александровна",
      phone: "+7 (903) 345-67-90",
      birthDate: "1980-07-15",
      leadId: testLeads[2].id,
      leadTouristId: testLeadTourists[4].id,
      notes: "Жена Козлова Д.С.",
    },
    {
      name: "Морозова Анна Владимировна",
      email: "morozova@example.com",
      phone: "+7 (916) 456-78-90",
      birthDate: "1990-12-10",
      leadId: testLeads[3].id,
      leadTouristId: testLeadTourists[5].id,
      notes: "Любитель горных походов",
    },
    {
      name: "Новиков Сергей Петрович",
      email: "novikov@example.com",
      phone: "+7 (925) 567-89-01",
      birthDate: "1985-01-20",
      leadId: testLeads[4].id,
      leadTouristId: testLeadTourists[6].id,
      notes: "Историк, интересуется Шёлковым путём",
    },
    {
      name: "Новикова Екатерина Дмитриевна",
      phone: "+7 (925) 567-89-02",
      birthDate: "1987-06-08",
      leadId: testLeads[4].id,
      leadTouristId: testLeadTourists[7].id,
      notes: "Жена Новикова С.П.",
    },
  ]).returning();

  console.log(`✅ Created ${testContacts.length} contacts`);

  console.log("💰 Creating deals for converted leads...");
  const testDeals = await db.insert(deals).values([
    {
      contactId: testContacts[0].id,
      eventId: testEvents[0].id,
      leadId: testLeads[0].id,
      status: "confirmed",
      amount: "189000",
      paidAmount: "75000",
    },
    {
      contactId: testContacts[1].id,
      eventId: testEvents[0].id,
      leadId: testLeads[0].id,
      status: "confirmed",
      amount: "189000",
      paidAmount: "75000",
    },
    {
      contactId: testContacts[2].id,
      eventId: testEvents[0].id,
      leadId: testLeads[1].id,
      status: "confirmed",
      amount: "189000",
      paidAmount: "189000",
    },
    {
      contactId: testContacts[3].id,
      eventId: testEvents[1].id,
      leadId: testLeads[2].id,
      status: "confirmed",
      amount: "2150",
      paidAmount: "1000",
    },
    {
      contactId: testContacts[4].id,
      eventId: testEvents[1].id,
      leadId: testLeads[2].id,
      status: "confirmed",
      amount: "2150",
      paidAmount: "1000",
    },
    {
      contactId: testContacts[5].id,
      eventId: testEvents[1].id,
      leadId: testLeads[3].id,
      status: "confirmed",
      amount: "2150",
      paidAmount: "1000",
    },
    {
      contactId: testContacts[6].id,
      eventId: testEvents[2].id,
      leadId: testLeads[4].id,
      status: "confirmed",
      amount: "15800",
      paidAmount: "7500",
    },
    {
      contactId: testContacts[7].id,
      eventId: testEvents[2].id,
      leadId: testLeads[4].id,
      status: "pending",
      amount: "15800",
      paidAmount: "7500",
    },
  ]).returning();

  console.log(`✅ Created ${testDeals.length} deals`);

  console.log("🗺️ Creating city visits...");
  const cityVisitsList = [];
  
  const event1Cities = testEvents[0].cities;
  for (let i = 0; i < 3; i++) {
    const deal = testDeals[i];
    for (let j = 0; j < event1Cities.length; j++) {
      const city = event1Cities[j];
      cityVisitsList.push({
        dealId: deal.id,
        city,
        arrivalDate: `2026-04-${15 + j * 3}`,
        departureDate: `2026-04-${18 + j * 3}`,
        hotelName: `${city} Grand Hotel`,
        roomType: i === 0 || i === 1 ? "twin" : "single",
        transportType: j === 0 ? "plane" : "train",
      });
    }
  }

  const event2Cities = testEvents[1].cities;
  for (let i = 3; i < 6; i++) {
    const deal = testDeals[i];
    for (let j = 0; j < event2Cities.length; j++) {
      const city = event2Cities[j];
      cityVisitsList.push({
        dealId: deal.id,
        city,
        arrivalDate: `2026-05-${10 + j * 2}`,
        departureDate: `2026-05-${12 + j * 2}`,
        hotelName: `${city} Mountain Resort`,
        roomType: i === 3 || i === 4 ? "double" : "single",
        transportType: j === 0 ? "plane" : "bus",
      });
    }
  }

  const testCityVisits = await db.insert(cityVisits).values(cityVisitsList).returning();
  console.log(`✅ Created ${testCityVisits.length} city visits`);

  console.log("💵 Creating participant expenses...");
  const participantExpensesList = [];
  
  for (let i = 0; i < 3; i++) {
    const deal = testDeals[i];
    for (const city of testEvents[0].cities) {
      participantExpensesList.push({
        eventId: testEvents[0].id,
        dealId: deal.id,
        city,
        expenseType: "accommodation",
        amount: String(15000 + Math.floor(Math.random() * 5000)),
        currency: "RUB",
        comment: "Отель 4*",
      });
      participantExpensesList.push({
        eventId: testEvents[0].id,
        dealId: deal.id,
        city,
        expenseType: "excursions",
        amount: String(5000 + Math.floor(Math.random() * 3000)),
        currency: "RUB",
      });
      if (city === "Пекин") {
        participantExpensesList.push({
          eventId: testEvents[0].id,
          dealId: deal.id,
          city,
          expenseType: "transport",
          amount: String(25000 + Math.floor(Math.random() * 5000)),
          currency: "RUB",
          comment: "Авиабилеты Москва-Пекин",
        });
      }
    }
  }

  for (let i = 3; i < 6; i++) {
    const deal = testDeals[i];
    for (const city of testEvents[1].cities) {
      participantExpensesList.push({
        eventId: testEvents[1].id,
        dealId: deal.id,
        city,
        expenseType: "accommodation",
        amount: String(150 + Math.floor(Math.random() * 50)),
        currency: "USD",
      });
      participantExpensesList.push({
        eventId: testEvents[1].id,
        dealId: deal.id,
        city,
        expenseType: "meals",
        amount: String(30 + Math.floor(Math.random() * 20)),
        currency: "USD",
      });
    }
  }

  const testParticipantExpenses = await db.insert(eventParticipantExpenses).values(participantExpensesList).returning();
  console.log(`✅ Created ${testParticipantExpenses.length} participant expenses`);

  console.log("💰 Creating common expenses...");
  const commonExpensesList = [];
  
  for (const city of testEvents[0].cities) {
    commonExpensesList.push({
      eventId: testEvents[0].id,
      city,
      expenseType: "guide",
      amount: String(25000 + Math.floor(Math.random() * 10000)),
      currency: "RUB",
      comment: "Русскоязычный гид",
    });
    commonExpensesList.push({
      eventId: testEvents[0].id,
      city,
      expenseType: "bus",
      amount: String(15000 + Math.floor(Math.random() * 5000)),
      currency: "RUB",
    });
    if (city === "Пекин") {
      commonExpensesList.push({
        eventId: testEvents[0].id,
        city,
        expenseType: "visa",
        amount: "45000",
        currency: "RUB",
        comment: "Групповая виза",
      });
    }
  }

  for (const city of testEvents[1].cities) {
    commonExpensesList.push({
      eventId: testEvents[1].id,
      city,
      expenseType: "guide",
      amount: String(300 + Math.floor(Math.random() * 100)),
      currency: "USD",
    });
    commonExpensesList.push({
      eventId: testEvents[1].id,
      city,
      expenseType: "insurance",
      amount: String(50 + Math.floor(Math.random() * 30)),
      currency: "USD",
    });
  }

  const testCommonExpenses = await db.insert(eventCommonExpenses).values(commonExpensesList).returning();
  console.log(`✅ Created ${testCommonExpenses.length} common expenses`);

  console.log("🔔 Creating notifications...");
  const testNotifications = await db.insert(notifications).values([
    {
      type: "group_filled",
      message: `Группа "${testEvents[0].name}" набирает участников! Забронировано 3 из 16 мест.`,
      eventId: testEvents[0].id,
      isRead: false,
    },
    {
      type: "booking",
      message: `Новое бронирование: ${testContacts[0].name} на тур "${testEvents[0].name}"`,
      eventId: testEvents[0].id,
      contactId: testContacts[0].id,
      isRead: false,
    },
    {
      type: "upcoming_event",
      message: `Тур "${testEvents[0].name}" начинается ${testEvents[0].startDate}`,
      eventId: testEvents[0].id,
      isRead: false,
    },
    {
      type: "birthday",
      message: `День рождения участника ${testContacts[5].name} в текущем месяце`,
      contactId: testContacts[5].id,
      isRead: true,
    },
  ]).returning();

  console.log(`✅ Created ${testNotifications.length} notifications`);

  console.log("\n✨ Database seeding completed successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${testEvents.length} events (tours)`);
  console.log(`   - ${testLeads.length} leads`);
  console.log(`   - ${testLeadTourists.length} lead tourists`);
  console.log(`   - ${testContacts.length} contacts`);
  console.log(`   - ${testDeals.length} deals`);
  console.log(`   - ${testCityVisits.length} city visits`);
  console.log(`   - ${testParticipantExpenses.length} participant expenses`);
  console.log(`   - ${testCommonExpenses.length} common expenses`);
  console.log(`   - ${testNotifications.length} notifications`);
}

seed()
  .catch((error) => {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("👋 Seeding process finished");
    process.exit(0);
  });
