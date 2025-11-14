import { db } from "./server/db";
import { contacts, deals, leadTourists, leads, cityVisits } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed script: Add confirmed participants to an existing event
 * Usage: tsx seed-confirmed-participants.ts [eventId]
 * Example: tsx seed-confirmed-participants.ts aaaaaaaa-test-4444-8888-ffffffffffff
 */

async function seedConfirmedParticipants(eventId: string) {
  console.log(`🌱 Starting seed: Adding confirmed participants to event ${eventId}`);

  // Verify event exists
  const event = await db.query.events.findFirst({
    where: (events, { eq }) => eq(events.id, eventId),
  });

  if (!event) {
    console.error(`❌ Event ${eventId} not found`);
    process.exit(1);
  }

  console.log(`✅ Found event: "${event.name}" (${event.country})`);
  console.log(`   Cities: ${event.cities.join(", ")}`);

  // Create deterministic test participants
  const participants = [
    {
      leadId: "lead-conf-001",
      leadTouristId: "lt-conf-001",
      contactId: "contact-conf-001",
      dealId: "deal-conf-001",
      name: "Иванов Иван Иванович",
      email: "ivanov@example.com",
      phone: "+79001234567",
      touristType: "adult" as const,
      isPrimary: true,
    },
    {
      leadId: "lead-conf-002",
      leadTouristId: "lt-conf-002",
      contactId: "contact-conf-002",
      dealId: "deal-conf-002",
      name: "Петрова Мария Сергеевна",
      email: "petrova@example.com",
      phone: "+79007654321",
      touristType: "adult" as const,
      isPrimary: true,
    },
    {
      leadId: "lead-conf-003",
      leadTouristId: "lt-conf-003",
      contactId: "contact-conf-003",
      dealId: "deal-conf-003",
      name: "Сидоров Петр Александрович",
      email: "sidorov@example.com",
      phone: "+79009876543",
      touristType: "adult" as const,
      isPrimary: true,
    },
  ];

  console.log(`\n📝 Creating ${participants.length} confirmed participants...`);

  for (const p of participants) {
    // Create lead (won status to represent successful conversion)
    await db.insert(leads).values({
      id: p.leadId,
      lastName: p.name.split(" ")[0],
      firstName: p.name.split(" ")[1],
      middleName: p.name.split(" ")[2],
      phone: p.phone,
      email: p.email,
      source: "website",
      status: "won", // Won lead status
      clientCategory: "vip",
      eventId: eventId,
      touristCount: 1,
    }).onConflictDoNothing();

    // Create leadTourist (detailed passport data)
    await db.insert(leadTourists).values({
      id: p.leadTouristId,
      leadId: p.leadId,
      touristType: p.touristType,
      isPrimary: p.isPrimary,
      lastName: p.name.split(" ")[0],
      firstName: p.name.split(" ")[1],
      middleName: p.name.split(" ")[2],
      birthDate: "1985-05-15",
      gender: "male",
      rfPassportSeries: "1234",
      rfPassportNumber: "567890",
      rfPassportIssueDate: "2015-01-01",
      rfPassportIssuedBy: "ОВД района Тестовый",
      foreignPassportNumber: "12AB345678",
      foreignPassportIssueDate: "2020-06-01",
      foreignPassportExpiryDate: "2030-06-01",
    }).onConflictDoNothing();

    // Create contact (linked to leadTourist)
    await db.insert(contacts).values({
      id: p.contactId,
      name: p.name,
      email: p.email,
      phone: p.phone,
      leadId: p.leadId,
      leadTouristId: p.leadTouristId,
    }).onConflictDoNothing();

    // Create CONFIRMED deal (this is the key!)
    await db.insert(deals).values({
      id: p.dealId,
      contactId: p.contactId,
      eventId: eventId,
      status: "confirmed", // ✅ CONFIRMED status - this makes them visible
      amount: event.price,
      isPrimaryInGroup: false,
    }).onConflictDoNothing();

    // Create city visits for all cities in the event
    for (const city of event.cities) {
      await db.insert(cityVisits).values({
        dealId: p.dealId,
        city: city,
        arrivalDate: event.startDate,
        arrivalTime: "10:00",
        transportType: "plane", // Required field
        flightNumber: "SU123",
        hotelName: "Grand Hotel", // Required field
        roomType: "twin",
        departureDate: event.endDate,
        departureTime: "18:00",
      }).onConflictDoNothing();
    }

    console.log(`   ✅ ${p.name}`);
  }

  console.log(`\n✅ Seed completed successfully!`);
  console.log(`📊 Summary:`);
  console.log(`   - Event: ${event.name}`);
  console.log(`   - Confirmed participants: ${participants.length}`);
  console.log(`   - All participants have deal.status = "confirmed"`);
  console.log(`\n🔄 Refresh EventSummary page to see the participants!`);
}

// Get eventId from command line args or use default
const eventId = process.argv[2];

if (!eventId) {
  console.error("❌ Usage: tsx seed-confirmed-participants.ts [eventId]");
  console.log("\nExample:");
  console.log("  tsx seed-confirmed-participants.ts aaaaaaaa-test-4444-8888-ffffffffffff");
  process.exit(1);
}

seedConfirmedParticipants(eventId)
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
