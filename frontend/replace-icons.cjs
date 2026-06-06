const fs = require('fs');
const path = require('path');
const iconsJson = require('@iconify-json/material-symbols/icons.json');

const availableIcons = new Set(Object.keys(iconsJson.icons));

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const vueFiles = [];
walkDir('d:/Projects/supermarket/frontend/src', (filePath) => {
    if (filePath.endsWith('.vue')) {
        vueFiles.push(filePath);
    }
});

let totalReplaced = 0;

vueFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Match <span class="material-symbols-outlined"...>icon_name</span>
    // Sometimes there are other classes or styles.
    // Regex explanation:
    // <span [^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>([^<]+)</span>
    const regex = /<span([^>]*)class="([^"]*material-symbols-outlined[^"]*)"([^>]*)>\s*([a-zA-Z0-9_]+)\s*<\/span>/g;
    
    const newContent = content.replace(regex, (match, beforeClass, classAttr, afterClass, iconName) => {
        let kebabIcon = iconName.replace(/_/g, '-');
        
        let targetIcon = `material-symbols:${kebabIcon}-outline`;
        let componentName = `i-material-symbols-${kebabIcon}-outline`;
        
        if (!availableIcons.has(`${kebabIcon}-outline`)) {
            // fallback to non-outline
            if (availableIcons.has(kebabIcon)) {
                targetIcon = `material-symbols:${kebabIcon}`;
                componentName = `i-material-symbols-${kebabIcon}`;
            } else {
                console.log(`WARNING: Icon not found in either outline or base: ${iconName} in ${file}`);
            }
        }
        
        // Remove material-symbols-outlined from class list
        let newClassAttr = classAttr.replace(/\bmaterial-symbols-outlined\b/g, '').replace(/\s{2,}/g, ' ').trim();
        
        let attributes = `${beforeClass} ${afterClass}`.trim();
        if (newClassAttr) {
            attributes += ` class="${newClassAttr}"`;
        }
        
        totalReplaced++;
        return `<${componentName} ${attributes}></${componentName}>`.replace(/\s+>/g, '>');
    });
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf-8');
        console.log(`Updated ${file}`);
    }
});

console.log(`Done. Total replacements: ${totalReplaced}`);
