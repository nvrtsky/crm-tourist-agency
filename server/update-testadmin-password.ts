import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

const sql = neon(process.env.DATABASE_URL!);

async function updateTestAdminPassword() {
  console.log('Обновление пароля для testadmin на "123456"...');
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  await sql`
    UPDATE users
    SET password_hash = ${hashedPassword}
    WHERE username = 'testadmin'
  `;
  
  console.log('✅ Пароль успешно обновлен!');
  console.log('   Логин: testadmin');
  console.log('   Пароль: 123456');
}

updateTestAdminPassword()
  .catch(console.error)
  .finally(() => process.exit(0));
