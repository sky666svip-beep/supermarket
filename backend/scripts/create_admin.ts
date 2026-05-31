import { db } from '../src/db/index.js'
import { users } from '../src/db/schema.js'

async function createAdmin() {
  await db.insert(users).values({
    username: 'admin',
    password: 'admin123',
    nickname: '超级管理员',
    role: 'admin'
  }).onConflictDoNothing()
  console.log('=================================')
  console.log('✅ Admin account seeded successfully!')
  console.log('Username: admin')
  console.log('Password: admin123')
  console.log('=================================')
  process.exit(0)
}
createAdmin().catch(console.error)
