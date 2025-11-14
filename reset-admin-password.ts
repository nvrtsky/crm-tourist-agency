import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

const sql = neon(process.env.DATABASE_URL!);

async function resetAdminPassword() {
  console.log('Resetting admin password to "admin123"...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await sql`
    UPDATE users
    SET password_hash = ${hashedPassword}
    WHERE username = 'admin'
  `;
  
  console.log('✅ Admin password reset successfully!');
  console.log('   Username: admin');
  console.log('   Password: admin123');
}

resetAdminPassword().catch(console.error);
