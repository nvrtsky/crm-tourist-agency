import * as XLSX from 'xlsx';
import { db } from './db';
import { baseExpenses } from '@shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

const EXPENSE_DATA = [
  { name: "Авиаперелет СПБ-Пекин-СПБ", amount: 3500, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет МСК-Пекин-МСК", amount: 3500, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Пекин-Гуанчжоу", amount: 850, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Гуанчжоу-Пекин", amount: 850, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Пекин-Санья", amount: 1200, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Санья-Пекин", amount: 1200, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Пекин-Шанхай", amount: 700, currency: "CNY", category: "Авиаперелет" },
  { name: "Авиаперелет Шанхай-Пекин", amount: 700, currency: "CNY", category: "Авиаперелет" },
  { name: "ЖД Пекин-Шанхай (скоростной)", amount: 550, currency: "CNY", category: "Транспорт" },
  { name: "ЖД Шанхай-Пекин (скоростной)", amount: 550, currency: "CNY", category: "Транспорт" },
  { name: "ЖД Пекин-Сиань", amount: 500, currency: "CNY", category: "Транспорт" },
  { name: "ЖД Сиань-Пекин", amount: 500, currency: "CNY", category: "Транспорт" },
  { name: "Трансфер аэропорт-отель (Пекин)", amount: 200, currency: "CNY", category: "Трансфер" },
  { name: "Трансфер отель-аэропорт (Пекин)", amount: 200, currency: "CNY", category: "Трансфер" },
  { name: "Трансфер аэропорт-отель (Шанхай)", amount: 250, currency: "CNY", category: "Трансфер" },
  { name: "Трансфер отель-аэропорт (Шанхай)", amount: 250, currency: "CNY", category: "Трансфер" },
  { name: "Трансфер ЖД вокзал-отель", amount: 150, currency: "CNY", category: "Трансфер" },
  { name: "Трансфер отель-ЖД вокзал", amount: 150, currency: "CNY", category: "Трансфер" },
  { name: "Гид русскоговорящий (полный день)", amount: 800, currency: "CNY", category: "Гид" },
  { name: "Гид русскоговорящий (полдня)", amount: 500, currency: "CNY", category: "Гид" },
  { name: "Гид англоговорящий (полный день)", amount: 600, currency: "CNY", category: "Гид" },
  { name: "Гид англоговорящий (полдня)", amount: 400, currency: "CNY", category: "Гид" },
  { name: "Входной билет Запретный город", amount: 60, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Великая стена (Бадалин)", amount: 45, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Великая стена (Мутяньюй)", amount: 45, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Храм Неба", amount: 35, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Летний дворец", amount: 30, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Терракотовая армия", amount: 150, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Шанхай Тауэр", amount: 180, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Сад Юй Юань", amount: 40, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Парк Чжанцзяцзе", amount: 225, currency: "CNY", category: "Билеты" },
  { name: "Входной билет Парк Гуйлинь", amount: 100, currency: "CNY", category: "Билеты" },
  { name: "Круиз по реке Ли (Гуйлинь)", amount: 350, currency: "CNY", category: "Экскурсии" },
  { name: "Круиз по реке Хуанпу (Шанхай)", amount: 120, currency: "CNY", category: "Экскурсии" },
  { name: "Пекинская утка (ужин)", amount: 180, currency: "CNY", category: "Питание" },
  { name: "Обед традиционный китайский", amount: 80, currency: "CNY", category: "Питание" },
  { name: "Ужин традиционный китайский", amount: 100, currency: "CNY", category: "Питание" },
  { name: "Шоу Кунг-фу (Пекин)", amount: 280, currency: "CNY", category: "Развлечения" },
  { name: "Шоу акробатов (Шанхай)", amount: 200, currency: "CNY", category: "Развлечения" },
  { name: "Пекинская опера", amount: 150, currency: "CNY", category: "Развлечения" },
  { name: "Отель 3* (Пекин) за ночь", amount: 350, currency: "CNY", category: "Проживание" },
  { name: "Отель 4* (Пекин) за ночь", amount: 500, currency: "CNY", category: "Проживание" },
  { name: "Отель 5* (Пекин) за ночь", amount: 800, currency: "CNY", category: "Проживание" },
  { name: "Отель 3* (Шанхай) за ночь", amount: 400, currency: "CNY", category: "Проживание" },
  { name: "Отель 4* (Шанхай) за ночь", amount: 600, currency: "CNY", category: "Проживание" },
  { name: "Отель 5* (Шанхай) за ночь", amount: 1000, currency: "CNY", category: "Проживание" },
  { name: "Отель 3* (Сиань) за ночь", amount: 300, currency: "CNY", category: "Проживание" },
  { name: "Отель 4* (Сиань) за ночь", amount: 450, currency: "CNY", category: "Проживание" },
  { name: "Отель 3* (Гуйлинь) за ночь", amount: 280, currency: "CNY", category: "Проживание" },
  { name: "Отель 4* (Гуйлинь) за ночь", amount: 400, currency: "CNY", category: "Проживание" },
  { name: "Виза китайская (срочная)", amount: 150, currency: "EUR", category: "Документы" },
  { name: "Виза китайская (обычная)", amount: 100, currency: "EUR", category: "Документы" },
  { name: "Страховка туристическая (неделя)", amount: 30, currency: "EUR", category: "Страхование" },
  { name: "Страховка туристическая (2 недели)", amount: 50, currency: "EUR", category: "Страхование" },
];

async function seedBaseExpenses() {
  console.log('Seeding base expenses...');
  
  try {
    for (const expense of EXPENSE_DATA) {
      await db.insert(baseExpenses).values({
        name: expense.name,
        amount: String(expense.amount),
        currency: expense.currency,
        category: expense.category,
      });
    }
    
    console.log(`Successfully seeded ${EXPENSE_DATA.length} base expenses`);
  } catch (error) {
    console.error('Error seeding base expenses:', error);
    throw error;
  }
}

seedBaseExpenses()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
