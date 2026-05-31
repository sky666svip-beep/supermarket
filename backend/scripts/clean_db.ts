import { db } from '../src/db/index.js'
import { checklists, feedbacks } from '../src/db/schema.js'

async function clean() {
  await db.delete(checklists)
  await db.delete(feedbacks)
  console.log('Old dirty data cleaned successfully.')
  process.exit(0)
}

clean().catch(console.error)
