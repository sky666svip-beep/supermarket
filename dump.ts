import { db } from './backend/src/db/index.js';
import { users, checklists, feedbacks } from './backend/src/db/schema.js';

async function main() {
  const allUsers = await db.select().from(users);
  console.log('--- Users ---');
  console.log(allUsers);

  const allChecklists = await db.select().from(checklists);
  console.log('--- Checklists ---');
  console.log(allChecklists);

  const allFeedbacks = await db.select().from(feedbacks);
  console.log('--- Feedbacks ---');
  console.log(allFeedbacks);

  process.exit(0);
}

main().catch(console.error);
