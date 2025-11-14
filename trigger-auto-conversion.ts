import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Запуск автоконвертации для всех лидов с eventId...");

  // Получаем все лиды, у которых есть eventId
  const leads = await sql`
    SELECT id, event_id, first_name, last_name 
    FROM leads 
    WHERE event_id IS NOT NULL
    ORDER BY created_at
  `;

  console.log(`Найдено ${leads.length} лидов с привязкой к турам`);

  for (const lead of leads) {
    try {
      console.log(`\nОбработка лида ${lead.first_name} ${lead.last_name} (${lead.id})`);
      
      // Шаг 1: Очищаем eventId
      const clearResponse = await fetch(`http://localhost:5000/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: null,
        }),
      });

      if (!clearResponse.ok) {
        const error = await clearResponse.text();
        console.error(`  ❌ Ошибка при очистке: ${error}`);
        continue;
      }

      console.log(`  📝 EventId очищен`);

      // Шаг 2: Восстанавливаем eventId - это запустит автоконвертацию
      const response = await fetch(`http://localhost:5000/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: lead.event_id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Ошибка при установке: ${error}`);
        continue;
      }

      const result = await response.json();
      console.log(`  ✅ Автоконвертация выполнена`);
    } catch (error) {
      console.error(`  ❌ Исключение:`, error);
    }
  }

  // Проверяем результаты
  const [contactsCount] = await sql`SELECT COUNT(*) as count FROM contacts`;
  const [dealsCount] = await sql`SELECT COUNT(*) as count FROM deals`;
  const [groupsCount] = await sql`SELECT COUNT(*) as count FROM groups`;

  console.log("\n=== Результаты ===");
  console.log(`Создано контактов: ${contactsCount.count}`);
  console.log(`Создано сделок: ${dealsCount.count}`);
  console.log(`Создано групп: ${groupsCount.count}`);
}

main().catch(console.error);
