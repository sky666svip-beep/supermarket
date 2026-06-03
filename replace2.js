const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else if (dirPath.endsWith('.vue')) {
            let content = fs.readFileSync(dirPath, 'utf8');
            if (content.includes('text-on-primary-container')) {
                let newContent = content.replace(/text-on-primary-container/g, 'text-white');
                fs.writeFileSync(dirPath, newContent, 'utf8');
                console.log('Updated: ' + dirPath);
            }
        }
    });
}

walkDir(path.join(__dirname, 'frontend/src'));
