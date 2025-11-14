import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Deterministic test event ID
const TEST_EVENT_ID = "aaaaaaaa-test-4444-8888-ffffffffffff";

async function main() {
  console.log("Создаем deterministic Smart Merge Test Event...");

  // Step 1: Clean up existing test data (idempotency)
  await sql`DELETE FROM events WHERE id = ${TEST_EVENT_ID}`;
  console.log("Очищены существующие тестовые данные");

  // Step 2: Create test event
  await sql`
    INSERT INTO events (
      id,
      name,
      country,
      cities,
      tour_type,
      start_date,
      end_date,
      price,
      participant_limit,
      description,
      color
    )
    VALUES (
      ${TEST_EVENT_ID},
      'Smart Merge Test Event',
      'Китай',
      ARRAY['Пекин', 'Шанхай'],
      'group',
      '2025-07-01',
      '2025-07-10',
      150000,
      30,
      'Тестовое событие для проверки smart city data merging',
      'blue'
    )
  `;
  console.log(`✓ Создано событие (ID: ${TEST_EVENT_ID})`);

  // Step 3: Create Family 1 (4 participants) - Семья Иванов
  console.log("\nСоздаем Семью 1 (4 участника)...");
  const [lead1] = await sql`
    INSERT INTO leads (
      first_name, last_name, email, phone,
      status, source, client_category, event_id
    )
    VALUES (
      'Иван', 'Иванов', 'ivan.ivanov@test.com', '+79001111111',
      'converted', 'website', 'family', ${TEST_EVENT_ID}
    )
    RETURNING id
  `;

  const family1Tourists = [
    { name: 'Иван Иванов', type: 'adult', isPrimary: true },
    { name: 'Мария Иванова', type: 'adult', isPrimary: false },
    { name: 'Петр Иванов', type: 'child', isPrimary: false },
    { name: 'Анна Иванова', type: 'child', isPrimary: false }
  ];

  for (const tourist of family1Tourists) {
    const [leadTourist] = await sql`
      INSERT INTO lead_tourists (
        lead_id, first_name, last_name, tourist_type, is_primary,
        date_of_birth, passport_series, passport_issued_by,
        foreign_passport_number, foreign_passport_valid_until,
        email, phone
      )
      VALUES (
        ${lead1.id}, ${tourist.name.split(' ')[0]}, ${tourist.name.split(' ')[1]},
        ${tourist.type}, ${tourist.isPrimary},
        '1990-01-01', '1234 567890', 'УМВД России',
        '500000000', '2030-01-01',
        ${`${tourist.name.toLowerCase().replace(' ', '.')}@test.com`}, '+79001111111'
      )
      RETURNING id
    `;

    const [contact] = await sql`
      INSERT INTO contacts (name, email, phone, lead_id, lead_tourist_id)
      VALUES (
        ${tourist.name}, ${`${tourist.name.toLowerCase().replace(' ', '.')}@test.com`},
        '+79001111111', ${lead1.id}, ${leadTourist.id}
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO deals (contact_id, event_id, status)
      VALUES (${contact.id}, ${TEST_EVENT_ID}, 'confirmed')
    `;

    // NOTE: Family grouping is IMPLICIT through leadId, not explicit through group_id
    // Do NOT create groups table entries for families - only for mini-groups

    console.log(`  ✓ ${tourist.name} (${tourist.type}${tourist.isPrimary ? ', primary' : ''})`);
  }

  // Step 4: Create Family 2 (4 participants) - Семья Петров
  console.log("\nСоздаем Семью 2 (4 участника)...");
  const [lead2] = await sql`
    INSERT INTO leads (
      first_name, last_name, email, phone,
      status, source, client_category, event_id
    )
    VALUES (
      'Сергей', 'Петров', 'sergey.petrov@test.com', '+79002222222',
      'converted', 'referral', 'family', ${TEST_EVENT_ID}
    )
    RETURNING id
  `;

  const family2Tourists = [
    { name: 'Сергей Петров', type: 'adult', isPrimary: true },
    { name: 'Елена Петрова', type: 'adult', isPrimary: false },
    { name: 'Дмитрий Петров', type: 'child', isPrimary: false },
    { name: 'Ольга Петрова', type: 'infant', isPrimary: false }
  ];

  for (const tourist of family2Tourists) {
    const [leadTourist] = await sql`
      INSERT INTO lead_tourists (
        lead_id, first_name, last_name, tourist_type, is_primary,
        date_of_birth, passport_series, passport_issued_by,
        foreign_passport_number, foreign_passport_valid_until,
        email, phone
      )
      VALUES (
        ${lead2.id}, ${tourist.name.split(' ')[0]}, ${tourist.name.split(' ')[1]},
        ${tourist.type}, ${tourist.isPrimary},
        '1985-01-01', '2345 678901', 'УМВД России',
        '510000000', '2030-01-01',
        ${`${tourist.name.toLowerCase().replace(' ', '.')}@test.com`}, '+79002222222'
      )
      RETURNING id
    `;

    const [contact] = await sql`
      INSERT INTO contacts (name, email, phone, lead_id, lead_tourist_id)
      VALUES (
        ${tourist.name}, ${`${tourist.name.toLowerCase().replace(' ', '.')}@test.com`},
        '+79002222222', ${lead2.id}, ${leadTourist.id}
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO deals (contact_id, event_id, status)
      VALUES (${contact.id}, ${TEST_EVENT_ID}, 'confirmed')
    `;

    // NOTE: Family grouping is IMPLICIT through leadId, not explicit through group_id
    // Do NOT create groups table entries for families - only for mini-groups

    console.log(`  ✓ ${tourist.name} (${tourist.type}${tourist.isPrimary ? ', primary' : ''})`);
  }

  // Step 5: Create 6 single-member leads for mini-groups
  console.log("\nСоздаем single-member leads (6 участников)...");
  const singleNames = [
    'Александр Смирнов',
    'Наталья Кузнецова',
    'Михаил Соколов',
    'Татьяна Попова',
    'Андрей Лебедев',
    'Ирина Морозова'
  ];

  for (let i = 0; i < singleNames.length; i++) {
    const fullName = singleNames[i];
    const [firstName, lastName] = fullName.split(' ');
    
    const [singleLead] = await sql`
      INSERT INTO leads (
        first_name, last_name, email, phone,
        status, source, client_category, event_id
      )
      VALUES (
        ${firstName}, ${lastName},
        ${`${fullName.toLowerCase().replace(' ', '.')}@test.com`},
        ${`+7900333${String(i + 1).padStart(4, '0')}`},
        'converted', 'social', 'individual', ${TEST_EVENT_ID}
      )
      RETURNING id
    `;

    const [leadTourist] = await sql`
      INSERT INTO lead_tourists (
        lead_id, first_name, last_name, tourist_type, is_primary,
        date_of_birth, passport_series, passport_issued_by,
        foreign_passport_number, foreign_passport_valid_until,
        email, phone
      )
      VALUES (
        ${singleLead.id}, ${firstName}, ${lastName},
        'adult', true,
        '1980-01-01', ${`345${i} 678901`}, 'УМВД России',
        ${`52000000${i}`}, '2030-01-01',
        ${`${fullName.toLowerCase().replace(' ', '.')}@test.com`},
        ${`+7900333${String(i + 1).padStart(4, '0')}`}
      )
      RETURNING id
    `;

    const [contact] = await sql`
      INSERT INTO contacts (name, email, phone, lead_id, lead_tourist_id)
      VALUES (
        ${fullName},
        ${`${fullName.toLowerCase().replace(' ', '.')}@test.com`},
        ${`+7900333${String(i + 1).padStart(4, '0')}`},
        ${singleLead.id},
        ${leadTourist.id}
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO deals (contact_id, event_id, status)
      VALUES (${contact.id}, ${TEST_EVENT_ID}, 'confirmed')
    `;

    console.log(`  ✓ ${fullName}`);
  }

  // Step 6: Validation
  const participantCount = await sql`
    SELECT COUNT(*) as total
    FROM deals
    WHERE event_id = ${TEST_EVENT_ID}
  `;

  const familyCount = await sql`
    WITH lead_counts AS (
      SELECT c.lead_id, COUNT(*) as count
      FROM contacts c
      JOIN deals d ON d.contact_id = c.id
      WHERE d.event_id = ${TEST_EVENT_ID}
      AND c.lead_id IS NOT NULL
      GROUP BY c.lead_id
    )
    SELECT COUNT(*) as families
    FROM lead_counts
    WHERE count > 1
  `;

  const singleCount = await sql`
    WITH lead_counts AS (
      SELECT c.lead_id, COUNT(*) as count
      FROM contacts c
      JOIN deals d ON d.contact_id = c.id
      WHERE d.event_id = ${TEST_EVENT_ID}
      AND c.lead_id IS NOT NULL
      GROUP BY c.lead_id
    )
    SELECT COUNT(*) as singles
    FROM lead_counts
    WHERE count = 1
  `;

  console.log("\n✅ Smart Merge Test Event успешно создан!");
  console.log(`   Event ID: ${TEST_EVENT_ID}`);
  console.log(`   Total participants: ${participantCount[0].total}`);
  console.log(`   Multi-member families: ${familyCount[0].families}`);
  console.log(`   Single-member leads: ${singleCount[0].singles}`);
  console.log("\nТеперь запустите: npx tsx create-mini-groups.ts");
}

main().catch(console.error);
