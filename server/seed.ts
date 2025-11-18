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

  // Create 15 test leads with variety
  console.log("📝 Creating 15 test leads...");
  const testLeads = await db.insert(leads).values([
    {
      lastName: "Иванов",
      firstName: "Петр",
      middleName: "Сергеевич",
      email: "ivanov@example.com",
      phone: "+7 (999) 123-45-67",
      status: "new",
      source: "website",
      notes: "Интересуется групповым туром в Китай",
    },
    {
      lastName: "Сидорова",
      firstName: "Анна",
      middleName: "Михайловна",
      email: "sidorova@example.com",
      phone: "+7 (999) 234-56-78",
      status: "contacted",
      source: "referral",
      notes: "Звонила по телефону, хочет индивидуальный тур",
    },
    {
      lastName: "Козлов",
      firstName: "Дмитрий",
      middleName: "Александрович",
      email: "kozlov@example.com",
      phone: "+7 (999) 345-67-89",
      status: "qualified",
      source: "direct",
      notes: "Готов бронировать, ждет подтверждения дат",
    },
    {
      lastName: "Морозова",
      firstName: "Елена",
      middleName: "Владимировна",
      email: "morozova@example.com",
      phone: "+7 (999) 456-78-90",
      status: "converted",
      source: "website",
      notes: "Конвертирована в контакт, забронирован тур в Таиланд",
    },
    {
      lastName: "Новиков",
      firstName: "Сергей",
      middleName: "Петрович",
      email: "novikov@example.com",
      phone: "+7 (999) 567-89-01",
      status: "lost",
      source: "referral",
      notes: "Решил отложить поездку на следующий год",
    },
    {
      lastName: "Попова",
      firstName: "Наталья",
      middleName: "Ивановна",
      email: "popova@example.com",
      phone: "+7 (999) 678-90-12",
      status: "new",
      source: "website",
      notes: "Интересуется турами в Японию",
    },
    {
      lastName: "Васильев",
      firstName: "Игорь",
      middleName: "Викторович",
      email: "vasiliev@example.com",
      phone: "+7 (999) 789-01-23",
      status: "contacted",
      source: "social_media",
      notes: "Написал в Instagram, хочет тур на двоих",
    },
    {
      lastName: "Федорова",
      firstName: "Марина",
      middleName: "Александровна",
      email: "fedorova@example.com",
      phone: "+7 (999) 890-12-34",
      status: "qualified",
      source: "website",
      notes: "Обсудили детали, готова бронировать Вьетнам",
    },
    {
      lastName: "Григорьев",
      firstName: "Алексей",
      middleName: "Петрович",
      email: "grigoriev@example.com",
      phone: "+7 (999) 901-23-45",
      status: "converted",
      source: "direct",
      notes: "Постоянный клиент, забронирован тур в Корею",
    },
    {
      lastName: "Соколова",
      firstName: "Ольга",
      middleName: "Дмитриевна",
      email: "sokolova@example.com",
      phone: "+7 (999) 012-34-56",
      status: "new",
      source: "referral",
      notes: "Порекомендовали друзья, интересуется Индией",
    },
    {
      lastName: "Лебедев",
      firstName: "Владимир",
      middleName: "Иванович",
      email: "lebedev@example.com",
      phone: "+7 (999) 111-22-33",
      status: "contacted",
      source: "website",
      notes: "Звонок запланирован на завтра",
    },
    {
      lastName: "Павлова",
      firstName: "Татьяна",
      middleName: "Сергеевна",
      email: "pavlova@example.com",
      phone: "+7 (999) 222-33-44",
      status: "qualified",
      source: "social_media",
      notes: "Готова к бронированию, ждет скидку для группы",
    },
    {
      lastName: "Орлов",
      firstName: "Николай",
      middleName: "Михайлович",
      email: "orlov@example.com",
      phone: "+7 (999) 333-44-55",
      status: "new",
      source: "direct",
      notes: "Пришел в офис, взял каталог туров",
    },
    {
      lastName: "Белова",
      firstName: "Екатерина",
      middleName: "Андреевна",
      email: "belova@example.com",
      phone: "+7 (999) 444-55-66",
      status: "contacted",
      source: "website",
      notes: "Запросила детальную программу тура",
    },
    {
      lastName: "Захаров",
      firstName: "Андрей",
      middleName: "Владимирович",
      email: "zakharov@example.com",
      phone: "+7 (999) 555-66-77",
      status: "lost",
      source: "referral",
      notes: "Выбрал другое агентство из-за цены",
    },
  ]).returning();

  console.log(`✅ Created ${testLeads.length} test leads`);

  // Create 5 test events (tours)
  console.log("🎫 Creating 5 test events...");
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
      name: "Таиланд: Бангкок и острова",
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
  ]).returning();

  console.log(`✅ Created ${testEvents.length} test events`);

  // Create test contacts (converted from leads + additional)
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
      name: "Григорьев Алексей Петрович",
      email: "grigoriev@example.com",
      phone: "+7 (999) 901-23-45",
      passport: "2345 678901",
      birthDate: "1990-03-22",
      leadId: testLeads[8].id,
      notes: "Постоянный клиент, требует особого внимания",
    },
    {
      name: "Смирнов Алексей Викторович",
      email: "smirnov@example.com",
      phone: "+7 (999) 222-33-44",
      passport: "3456 789012",
      birthDate: "1978-11-30",
      notes: "Едет с женой",
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
    {
      name: "Петров Максим Андреевич",
      email: "petrov@example.com",
      phone: "+7 (999) 777-88-99",
      passport: "8901 234567",
      birthDate: "1988-05-20",
      notes: "Часто ездит в командировки по Азии",
    },
    {
      name: "Николаева Ирина Владимировна",
      email: "nikolaeva@example.com",
      phone: "+7 (999) 888-99-00",
      passport: "9012 345678",
      birthDate: "1993-09-14",
      notes: "VIP клиент, бронирует туры на всю семью",
    },
    {
      name: "Романов Дмитрий Сергеевич",
      email: "romanov@example.com",
      phone: "+7 (999) 999-00-11",
      passport: "0123 456789",
      birthDate: "1986-02-28",
      notes: "Интересуется дополнительными экскурсиями",
    },
  ]).returning();

  console.log(`✅ Created ${testContacts.length} test contacts`);

  // Create test deals (bookings) for various tours
  console.log("💰 Creating test deals...");
  const testDeals = await db.insert(deals).values([
    // Китай - почти полная группа (16/20)
    ...Array.from({ length: 16 }, (_, i) => ({
      contactId: testContacts[i % testContacts.length].id,
      eventId: testEvents[0].id,
      status: i < 14 ? ("confirmed" as const) : ("pending" as const),
      amount: "125000",
    })),

    // Таиланд - средняя заполненность (9/15)
    ...Array.from({ length: 9 }, (_, i) => ({
      contactId: testContacts[i % testContacts.length].id,
      eventId: testEvents[1].id,
      status: i < 7 ? ("confirmed" as const) : (i === 8 ? ("cancelled" as const) : ("pending" as const)),
      amount: "95000",
    })),

    // Вьетнам - мало участников (4/18)
    ...Array.from({ length: 4 }, (_, i) => ({
      contactId: testContacts[i].id,
      eventId: testEvents[2].id,
      status: i < 3 ? ("confirmed" as const) : ("pending" as const),
      amount: "105000",
    })),

    // Япония - полностью забронирована (12/12)
    ...Array.from({ length: 12 }, (_, i) => ({
      contactId: testContacts[i % testContacts.length].id,
      eventId: testEvents[3].id,
      status: "confirmed" as const,
      amount: "185000",
    })),

    // Корея - средняя (6/16)
    ...Array.from({ length: 6 }, (_, i) => ({
      contactId: testContacts[i].id,
      eventId: testEvents[4].id,
      status: i < 5 ? ("confirmed" as const) : ("pending" as const),
      amount: "115000",
    })),
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
        arrivalDate: isFirstCity ? "2025-03-15" : `2025-03-${16 + j}`,
        arrivalTime: isFirstCity ? "14:30" : "10:00",
        departureDate: isLastCity ? "2025-03-25" : `2025-03-${17 + j}`,
        departureTime: isLastCity ? "18:00" : "15:00",
        transportType: isFirstCity ? "plane" : (j % 2 === 0 ? "plane" : "train"),
        departureTransportType: isLastCity ? "plane" : (j % 2 === 0 ? "train" : "plane"),
        flightNumber: isFirstCity ? "SU221" : (j % 2 === 0 ? `CA${100 + j}` : undefined),
        airport: isFirstCity ? "Sheremetyevo" : undefined,
        departureFlightNumber: isLastCity ? "SU222" : (j % 2 === 0 ? undefined : `CA${400 + j}`),
        hotelName: `${city} Grand Hotel`,
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
      message: `Группа "${testEvents[0].name}" почти заполнена! Осталось только 4 места из 20.`,
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
      message: `Тур "${testEvents[1].name}" начинается через 10 дней (${testEvents[1].startDate})`,
      eventId: testEvents[1].id,
      isRead: false,
    },
    {
      type: "birthday",
      message: `День рождения участника ${testContacts[6].name} в текущем месяце`,
      contactId: testContacts[6].id,
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
