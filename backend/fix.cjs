const fs = require('fs');
['posts.ts', 'comments.ts', 'community-admin.ts'].forEach(f => {
  const p = 'src/routes/' + f;
  let code = fs.readFileSync(p, 'utf-8');
  code = code.replace(/c\.req\.param\('id'\)/g, "c.req.param('id') || ''");
  code = code.replace(/c\.req\.param\('postId'\)/g, "c.req.param('postId') || ''");
  fs.writeFileSync(p, code);
});
console.log('done');
