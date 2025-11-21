import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function updateTestAdminPassword() {
  console.log('Обновление пароля для testadmin на "123456"...');
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2',
    [hashedPassword, 'testadmin']
  );
  
  console.log('✅ Пароль успешно обновлен!');
  console.log('   Логин: testadmin');
  console.log('   Пароль: 123456');
  
  await pool.end();
}

updateTestAdminPassword()
  .catch(console.error)
  .finally(() => process.exit(0));
