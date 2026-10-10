const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== '.git' && file !== '.github') walkDir(fullPath);
    } else if (path.extname(fullPath) === '.html') {
      let content = fs.readFileSync(fullPath, 'utf8');
      const scriptTag = '<script src="/sw-register.js"></script>';
      if (!content.includes('sw-register.js')) {
        content = content.replace('</body>', `${scriptTag}\n</body>`);
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}
walkDir('./');
