import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function resetAdminPassword() {
  console.log('Resetting admin password to "admin123"...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2',
    [hashedPassword, 'admin']
  );
  
  console.log('✅ Admin password reset successfully!');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  
  await pool.end();
}

resetAdminPassword().catch(console.error);
