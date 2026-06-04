const fs = require('fs');
const path = require('path');
const dir = path.join('frontend', 'src', 'views', 'admin');
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.vue')) {
    const p = path.join(dir, file);
    let c = fs.readFileSync(p, 'utf-8');
    c = c.replace(/'\.\.\/api'/g, "'../../api'");
    fs.writeFileSync(p, c, 'utf-8');
  }
});
console.log('Fixed imports');
