import { db } from "./db";
import { events, contacts, deals, leads, notifications, cityVisits } from "../shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await db.delete(notifications);
  await db.delete(cityVisits);
  await db.delete(deals);
  await db.delete(contacts);
  await db.delete(events);
  await db.delete(leads);

  console.log("✅ Existing data cleared");

  // Create test leads
  console.log("📝 Creating test leads...");
  const testLeads = await db.insert(leads).values([
    {
      name: "Иванов Петр Сергеевич",
      email: "ivanov@example.com",
      phone: "+7 (999) 123-45-67",
      status: "new",
      source: "website",
      notes: "Интересуется групповым туром в Китай",
    },
    {
      name: "Сидорова Анна Михайловна",
      email: "sidorova@example.com",
      phone: "+7 (999) 234-56-78",
      status: "contacted",
      source: "referral",
      notes: "Звонила по телефону, хочет индивидуальный тур",
    },
    {
      name: "Козлов Дмитрий Александрович",
      email: "kozlov@example.com",
      phone: "+7 (999) 345-67-89",
      status: "qualified",
      source: "direct",
      notes: "Готов бронировать, ждет подтверждения дат",
    },
    {
      name: "Морозова Елена Владимировна",
      email: "morozova@example.com",
      phone: "+7 (999) 456-78-90",
      status: "converted",
      source: "website",
      notes: "Конвертирована в контакт, забронирован тур в Таиланд",
    },
    {
      name: "Новиков Сергей Петрович",
      email: "novikov@example.com",
      phone: "+7 (999) 567-89-01",
      status: "lost",
      source: "referral",
      notes: "Решил отложить поездку на следующий год",
    },
  ]).returning();

  console.log(`✅ Created ${testLeads.length} test leads`);

  // Create test events (tours)
  console.log("🎫 Creating test events...");
  const testEvents = await db.insert(events).values([
    {
      name: "Классический Китай: 5 городов",
      description: "Путешествие по знаменитым городам Китая: Пекин, Лоян, Сиань, Чжанцзяцзе, Шанхай",
      country: "Китай",
      cities: ["Пекин", "Лоян", "Сиань", "Чжанцзяцзе", "Шанхай"],
      tourType: "group",
      startDate: "2025-03-15",
      endDate: "2025-03-25",
      participantLimit: 20,
      price: "125000",
    },
    {
      name: "Тайланд: Бангкок и острова",
      description: "Экскурсионный тур по Бангкоку с отдыхом на островах Пхукет и Краби",
      country: "Таиланд",
      cities: ["Бангкок", "Пхукет", "Краби"],
      tourType: "group",
      startDate: "2025-02-10",
      endDate: "2025-02-20",
      participantLimit: 15,
      price: "95000",
    },
    {
      name: "Вьетнам: от Ханоя до Хошимина",
      description: "Полный тур по Вьетнаму с посещением главных достопримечательностей",
      country: "Вьетнам",
      cities: ["Ханой", "Халонг", "Хюэ", "Хойан", "Хошимин"],
      tourType: "group",
      startDate: "2025-04-05",
      endDate: "2025-04-15",
      participantLimit: 18,
      price: "105000",
    },
    {
      name: "Япония: Сакура весной",
      description: "Весенний тур по Японии в период цветения сакуры",
      country: "Япония",
      cities: ["Токио", "Киото", "Осака", "Нара"],
      tourType: "group",
      startDate: "2025-03-28",
      endDate: "2025-04-07",
      participantLimit: 12,
      price: "185000",
    },
    {
      name: "Корея: Сеул и окрестности",
      description: "Знакомство с современным Сеулом и традиционной культурой Кореи",
      country: "Южная Корея",
      cities: ["Сеул", "Пусан", "Кёнджу"],
      tourType: "group",
      startDate: "2025-05-12",
      endDate: "2025-05-19",
      participantLimit: 16,
      price: "115000",
    },
    {
      name: "Индия: Золотой треугольник",
      description: "Классический маршрут: Дели, Агра (Тадж-Махал), Джайпур",
      country: "Индия",
      cities: ["Дели", "Агра", "Джайпур"],
      tourType: "group",
      startDate: "2025-02-01",
      endDate: "2025-02-08",
      participantLimit: 10,
      price: "89000",
    },
  ]).returning();

  console.log(`✅ Created ${testEvents.length} test events`);

  // Create test contacts (converted from leads)
  console.log("👥 Creating test contacts...");
  const testContacts = await db.insert(contacts).values([
    {
      name: "Морозова Елена Владимировна",
      email: "morozova@example.com",
      phone: "+7 (999) 456-78-90",
      passport: "1234 567890",
      birthDate: "1985-06-15",
      leadId: testLeads[3].id,
      notes: "Предпочитает отели 4*, аллергия на морепродукты",
    },
    {
      name: "Петрова Мария Ивановна",
      email: "petrova@example.com",
      phone: "+7 (999) 111-22-33",
      passport: "2345 678901",
      birthDate: "1990-03-22",
      notes: "VIP клиент, требует особого внимания",
    },
    {
      name: "Смирнов Алексей Викторович",
      email: "smirnov@example.com",
      phone: "+7 (999) 222-33-44",
      passport: "3456 789012",
      birthDate: "1978-11-30",
      notes: "Постоянный клиент, едет с женой",
    },
    {
      name: "Смирнова Ольга Петровна",
      email: "smirnova@example.com",
      phone: "+7 (999) 222-33-45",
      passport: "3456 789013",
      birthDate: "1980-07-12",
      notes: "Жена Алексея Смирнова",
    },
    {
      name: "Волков Игорь Сергеевич",
      email: "volkov@example.com",
      phone: "+7 (999) 333-44-55",
      passport: "4567 890123",
      birthDate: "1995-01-08",
      notes: "Первая поездка, нужна помощь с визой",
    },
    {
      name: "Соколова Татьяна Андреевна",
      email: "sokolova@example.com",
      phone: "+7 (999) 444-55-66",
      passport: "5678 901234",
      birthDate: "1988-09-25",
      notes: "Интересуется дополнительными экскурсиями",
    },
    {
      name: "Кузнецов Владимир Михайлович",
      email: "kuznetsov@example.com",
      phone: "+7 (999) 555-66-77",
      passport: "6789 012345",
      birthDate: "1972-04-18",
      notes: "Пенсионер, нужны удобства для людей в возрасте",
    },
    {
      name: "Лебедева Наталья Викторовна",
      email: "lebedeva@example.com",
      phone: "+7 (999) 666-77-88",
      passport: "7890 123456",
      birthDate: "1992-12-03",
      notes: "Молодая пара, медовый месяц",
    },
  ]).returning();

  console.log(`✅ Created ${testContacts.length} test contacts`);

  // Create test deals (bookings)
  console.log("💰 Creating test deals...");
  const testDeals = await db.insert(deals).values([
    // Китай - почти полная группа (18/20)
    {
      contactId: testContacts[0].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[1].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[2].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[3].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[4].id,
      eventId: testEvents[0].id,
      status: "pending",
      amount: "125000",
    },
    {
      contactId: testContacts[5].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[6].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    {
      contactId: testContacts[7].id,
      eventId: testEvents[0].id,
      status: "confirmed",
      amount: "125000",
    },
    // Добавим еще 10 для Китая (всего 18)
    ...Array.from({ length: 10 }, (_, i) => ({
      contactId: testContacts[i % testContacts.length].id,
      eventId: testEvents[0].id,
      status: "confirmed" as const,
      amount: "125000",
    })),

    // Таиланд - средняя заполненность (8/15)
    {
      contactId: testContacts[0].id,
      eventId: testEvents[1].id,
      status: "confirmed",
      amount: "95000",
    },
    {
      contactId: testContacts[1].id,
      eventId: testEvents[1].id,
      status: "confirmed",
      amount: "95000",
    },
    {
      contactId: testContacts[2].id,
      eventId: testEvents[1].id,
      status: "pending",
      amount: "95000",
    },
    {
      contactId: testContacts[3].id,
      eventId: testEvents[1].id,
      status: "confirmed",
      amount: "95000",
    },
    {
      contactId: testContacts[4].id,
      eventId: testEvents[1].id,
      status: "confirmed",
      amount: "95000",
    },
    {
      contactId: testContacts[5].id,
      eventId: testEvents[1].id,
      status: "pending",
      amount: "95000",
    },
    {
      contactId: testContacts[6].id,
      eventId: testEvents[1].id,
      status: "confirmed",
      amount: "95000",
    },
    {
      contactId: testContacts[7].id,
      eventId: testEvents[1].id,
      status: "cancelled",
      amount: "95000",
    },

    // Вьетнам - мало участников (3/18)
    {
      contactId: testContacts[0].id,
      eventId: testEvents[2].id,
      status: "confirmed",
      amount: "105000",
    },
    {
      contactId: testContacts[1].id,
      eventId: testEvents[2].id,
      status: "pending",
      amount: "105000",
    },
    {
      contactId: testContacts[2].id,
      eventId: testEvents[2].id,
      status: "confirmed",
      amount: "105000",
    },

    // Япония - полностью забронирована (12/12)
    ...Array.from({ length: 12 }, (_, i) => ({
      contactId: testContacts[i % testContacts.length].id,
      eventId: testEvents[3].id,
      status: "confirmed" as const,
      amount: "185000",
    })),

    // Корея - средняя (5/16)
    ...Array.from({ length: 5 }, (_, i) => ({
      contactId: testContacts[i].id,
      eventId: testEvents[4].id,
      status: i < 4 ? ("confirmed" as const) : ("pending" as const),
      amount: "115000",
    })),

    // Индия - низкая (2/10)
    {
      contactId: testContacts[0].id,
      eventId: testEvents[5].id,
      status: "confirmed",
      amount: "89000",
    },
    {
      contactId: testContacts[1].id,
      eventId: testEvents[5].id,
      status: "pending",
      amount: "89000",
    },
  ]).returning();

  console.log(`✅ Created ${testDeals.length} test deals`);

  // Create city visits for China tour participants
  console.log("🗺️ Creating city visits for China tour...");
  const chinaCities = ["Beijing", "Luoyang", "Xi'an", "Zhangjiajie", "Shanghai"];
  
  const cityVisitsList = [];
  
  // Create visits for first 5 participants of China tour
  for (let i = 0; i < Math.min(5, testDeals.length); i++) {
    const deal = testDeals[i];
    
    for (let j = 0; j < chinaCities.length; j++) {
      const city = chinaCities[j];
      const isFirstCity = j === 0;
      const isLastCity = j === chinaCities.length - 1;
      
      cityVisitsList.push({
        dealId: deal.id,
        city,
        arrivalDate: isFirstCity ? "2025-06-01" : `2025-06-0${j + 1}`,
        arrivalTime: isFirstCity ? "14:30" : "10:00",
        departureDate: isLastCity ? "2025-06-10" : `2025-06-0${j + 2}`,
        departureTime: isLastCity ? "18:00" : "15:00",
        transportType: isFirstCity ? "plane" : (j % 2 === 0 ? "plane" : "train"),
        departureTransportType: isLastCity ? "plane" : (j % 2 === 0 ? "train" : "plane"),
        flightNumber: isFirstCity ? "SU221" : (j % 2 === 0 ? `CA${100 + j}` : `G${200 + j}`),
        airport: isFirstCity ? "Sheremetyevo" : undefined,
        departureFlightNumber: isLastCity ? "SU222" : (j % 2 === 0 ? `G${300 + j}` : `CA${400 + j}`),
        hotelName: `Hotel ${city} ${i + 1}`,
        roomType: i % 3 === 0 ? "single" : (i % 3 === 1 ? "twin" : "double"),
      });
    }
  }
  
  const testCityVisits = await db.insert(cityVisits).values(cityVisitsList).returning();
  console.log(`✅ Created ${testCityVisits.length} city visits`);

  // Create test notifications
  console.log("🔔 Creating test notifications...");
  const testNotifications = await db.insert(notifications).values([
    {
      type: "group_filled",
      message: `Группа "${testEvents[0].name}" почти заполнена! Осталось только 2 места из 20.`,
      eventId: testEvents[0].id,
      isRead: false,
    },
    {
      type: "booking",
      message: `Новое бронирование: ${testContacts[0].name} на тур "${testEvents[1].name}"`,
      eventId: testEvents[1].id,
      contactId: testContacts[0].id,
      isRead: false,
    },
    {
      type: "upcoming_event",
      message: `Тур "${testEvents[5].name}" начинается через 5 дней (${testEvents[5].startDate})`,
      eventId: testEvents[5].id,
      isRead: false,
    },
    {
      type: "birthday",
      message: `День рождения участника ${testContacts[7].name} в текущем месяце`,
      contactId: testContacts[7].id,
      isRead: true,
    },
  ]).returning();

  console.log(`✅ Created ${testNotifications.length} test notifications`);

  console.log("\n✨ Database seeding completed successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${testLeads.length} leads`);
  console.log(`   - ${testEvents.length} events (tours)`);
  console.log(`   - ${testContacts.length} contacts`);
  console.log(`   - ${testDeals.length} deals`);
  console.log(`   - ${testCityVisits.length} city visits`);
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
