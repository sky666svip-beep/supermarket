const { db } = require('./backend/dist/db/index.js');
const { comments, posts } = require('./backend/dist/db/schema.js');
const { eq, sql } = require('drizzle-orm');

async function test() {
  try {
    const newComment = await db.transaction(async (tx) => {
      const inserted = await tx.insert(comments).values({
        userId: 1, 
        postId: 1, 
        parentId: null,
        content: 'test content',
        images: '[]'
      }).returning();
      await tx.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, 1));
      return inserted[0];
    });
    console.log('Success:', newComment);
  } catch (error) {
    console.error('Error in transaction:', error);
  }
}
test();
