import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Deterministic test event ID (from seed-smart-merge.ts)
const DEFAULT_TEST_EVENT_ID = "aaaaaaaa-test-4444-8888-ffffffffffff";

async function main() {
  console.log("Создаем тестовые мини-группы...");

  // Step 1: Try using default test event, fallback to auto-discovery
  let targetEvent = await sql`
    WITH lead_member_counts AS (
      SELECT 
        d.event_id,
        c.lead_id,
        COUNT(DISTINCT d.id) as member_count
      FROM deals d
      JOIN contacts c ON c.id = d.contact_id
      WHERE d.event_id = ${DEFAULT_TEST_EVENT_ID}
      AND c.lead_id IS NOT NULL
      GROUP BY d.event_id, c.lead_id
    ),
    single_lead_counts AS (
      SELECT 
        event_id,
        COUNT(DISTINCT lead_id) as single_lead_count
      FROM lead_member_counts
      WHERE member_count = 1
      GROUP BY event_id
    )
    SELECT 
      slc.event_id,
      slc.single_lead_count,
      e.name as event_name
    FROM single_lead_counts slc
    JOIN events e ON e.id = slc.event_id
    WHERE slc.event_id = ${DEFAULT_TEST_EVENT_ID}
    AND slc.single_lead_count >= 5
  `;

  // Fallback to auto-discovery if default test event not found
  if (targetEvent.length === 0) {
    console.log(`Default test event не найден, ищем другое событие...`);
    const eventsWithSingleLeads = await sql`
      WITH lead_member_counts AS (
        SELECT 
          d.event_id,
          c.lead_id,
          COUNT(DISTINCT d.id) as member_count
        FROM deals d
        JOIN contacts c ON c.id = d.contact_id
        WHERE c.lead_id IS NOT NULL
        GROUP BY d.event_id, c.lead_id
      ),
      single_lead_counts AS (
        SELECT 
          event_id,
          COUNT(DISTINCT lead_id) as single_lead_count
        FROM lead_member_counts
        WHERE member_count = 1
        GROUP BY event_id
      )
      SELECT 
        slc.event_id,
        slc.single_lead_count,
        e.name as event_name
      FROM single_lead_counts slc
      JOIN events e ON e.id = slc.event_id
      WHERE slc.single_lead_count >= 5
      ORDER BY slc.single_lead_count DESC
      LIMIT 1
    `;

    if (eventsWithSingleLeads.length === 0) {
      console.error("Не найдено событий с достаточным количеством single-member leads (нужно ≥5)");
      console.error("Создайте больше лидов с 1 туристом или используйте разные события");
      return;
    }

    targetEvent = eventsWithSingleLeads;
  }

  const finalEvent = targetEvent[0];
  console.log(`Используем событие: ${finalEvent.event_name} (${finalEvent.single_lead_count} single-member leads)`);

  // Step 2: Clear existing mini-groups for this event (idempotency)
  const deletedGroups = await sql`
    DELETE FROM groups 
    WHERE type = 'mini_group' 
    AND event_id = ${finalEvent.event_id}
    RETURNING id
  `;
  console.log(`Удалено ${deletedGroups.length} существующих мини-групп для этого события`);

  // Step 3: Get deterministically ordered single-member lead participants
  const singleMemberContacts = await sql`
    WITH lead_member_counts AS (
      SELECT 
        c.lead_id,
        COUNT(DISTINCT d.id) as member_count
      FROM contacts c
      JOIN deals d ON d.contact_id = c.id
      WHERE d.event_id = ${finalEvent.event_id}
      AND c.lead_id IS NOT NULL
      GROUP BY c.lead_id
    )
    SELECT 
      c.id as contact_id,
      d.id as deal_id,
      d.event_id,
      lt.first_name,
      lt.last_name,
      c.lead_id
    FROM contacts c
    JOIN deals d ON d.contact_id = c.id
    JOIN lead_tourists lt ON lt.id = c.lead_tourist_id
    JOIN lead_member_counts lmc ON lmc.lead_id = c.lead_id
    WHERE d.event_id = ${finalEvent.event_id}
    AND c.lead_id IS NOT NULL
    AND lmc.member_count = 1
    ORDER BY c.lead_id, c.id
  `;

  if (singleMemberContacts.length < 5) {
    console.error(`Недостаточно single-member participants (найдено ${singleMemberContacts.length}, нужно ≥5)`);
    return;
  }

  console.log(`Найдено ${singleMemberContacts.length} participants из single-member leads`);

  // Step 4: Create mini-group 1 with first 2 unique leads (deterministic)
  const miniGroup1Contacts = singleMemberContacts.slice(0, 2);
  
  if (new Set(miniGroup1Contacts.map(c => c.lead_id)).size !== 2) {
    console.error("Mini-group 1: participants не из уникальных leads!");
    return;
  }

  const [group1] = await sql`
    INSERT INTO groups (name, type, event_id)
    VALUES (
      'Тестовая мини-группа 1',
      'mini_group',
      ${finalEvent.event_id}
    )
    RETURNING id
  `;

  console.log(`\nМини-группа 1 создана (ID: ${group1.id})`);

  for (let i = 0; i < miniGroup1Contacts.length; i++) {
    const contact = miniGroup1Contacts[i];
    await sql`
      UPDATE deals
      SET group_id = ${group1.id},
          is_primary_in_group = ${i === 0}
      WHERE id = ${contact.deal_id}
    `;
    console.log(`  Добавлен: ${contact.first_name} ${contact.last_name} (lead: ${contact.lead_id?.substring(0, 8)}...${i === 0 ? ', primary' : ''})`);
  }

  // Create city visits for mini-group 1
  const eventCities = await sql`
    SELECT UNNEST(cities) as city
    FROM events
    WHERE id = ${finalEvent.event_id}
    LIMIT 1
  `;

  for (const contact of miniGroup1Contacts) {
    for (const { city } of eventCities) {
      // Delete existing city_visits first (idempotency)
      await sql`
        DELETE FROM city_visits
        WHERE deal_id = ${contact.deal_id}
        AND city = ${city}
      `;
      
      await sql`
        INSERT INTO city_visits (deal_id, city, arrival_date, transport_type, hotel_name)
        VALUES (
          ${contact.deal_id},
          ${city},
          '2025-06-01',
          'flight',
          ''
        )
      `;
    }
  }

  console.log(`  City visits созданы для всех городов`);

  // Step 5: Create mini-group 2 with next 3 unique leads (deterministic)
  if (singleMemberContacts.length >= 5) {
    const miniGroup2Contacts = singleMemberContacts.slice(2, 5);
    
    if (new Set(miniGroup2Contacts.map(c => c.lead_id)).size !== 3) {
      console.error("Mini-group 2: participants не из уникальных leads!");
      return;
    }

    const [group2] = await sql`
      INSERT INTO groups (name, type, event_id)
      VALUES (
        'Тестовая мини-группа 2',
        'mini_group',
        ${finalEvent.event_id}
      )
      RETURNING id
    `;

    console.log(`\nМини-группа 2 создана (ID: ${group2.id})`);

    for (let i = 0; i < miniGroup2Contacts.length; i++) {
      const contact = miniGroup2Contacts[i];
      await sql`
        UPDATE deals
        SET group_id = ${group2.id},
            is_primary_in_group = ${i === 0}
        WHERE id = ${contact.deal_id}
      `;
      console.log(`  Добавлен: ${contact.first_name} ${contact.last_name} (lead: ${contact.lead_id?.substring(0, 8)}...${i === 0 ? ', primary' : ''})`);
    }

    // Create city visits for mini-group 2
    for (const contact of miniGroup2Contacts) {
      for (const { city } of eventCities) {
        // Delete existing city_visits first (idempotency)
        await sql`
          DELETE FROM city_visits
          WHERE deal_id = ${contact.deal_id}
          AND city = ${city}
        `;
        
        await sql`
          INSERT INTO city_visits (deal_id, city, arrival_date, transport_type, hotel_name)
          VALUES (
            ${contact.deal_id},
            ${city},
            '2025-06-01',
            'flight',
            ''
          )
        `;
      }
    }

    console.log(`  City visits созданы для всех городов`);
  }

  // Step 6: Validation - ensure no overlap with multi-member leads
  const overlapCheck = await sql`
    WITH multi_member_leads AS (
      SELECT c.lead_id
      FROM contacts c
      JOIN deals d ON d.contact_id = c.id
      WHERE d.event_id = ${finalEvent.event_id}
      AND c.lead_id IS NOT NULL
      GROUP BY c.lead_id
      HAVING COUNT(DISTINCT d.id) > 1
    )
    SELECT COUNT(*) as overlap_count
    FROM deals d
    JOIN contacts c ON c.id = d.contact_id
    JOIN multi_member_leads mml ON mml.lead_id = c.lead_id
    WHERE d.event_id = ${finalEvent.event_id}
    AND d.group_id IS NOT NULL
  `;

  if (Number(overlapCheck[0].overlap_count) > 0) {
    console.error(`\n⚠️  ПРЕДУПРЕЖДЕНИЕ: Найдено ${overlapCheck[0].overlap_count} participants в BOTH multi-member lead AND mini-group!`);
    return;
  }

  console.log("\n✅ Мини-группы успешно созданы!");
  console.log("✅ Валидация пройдена: нет overlap между multi-member leads и mini-groups");
  console.log(`✅ Используйте событие "${finalEvent.event_name}" (ID: ${finalEvent.event_id}) для e2e тестов`);
}

main().catch(console.error);
