const fs = require('fs');
const path = require('path');

function processHtmlFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip hidden directories like .git and .github
      if (file !== '.git' && file !== '.github' && file !== 'assets') {
        processHtmlFiles(fullPath);
      }
    } else if (path.extname(fullPath) === '.html') {
      let content = fs.readFileSync(fullPath, 'utf8');

      // 1. Inject CSS to style the footer background color to #0f172a
      const customStyle = `
        <style>
          /* Force footer and dynamic link section background to #0f172a */
          section.cid-s48MC36cej, footer, .mbr-section, .mbr-footer {
            background-color: #0f172a !important;
          }
        </style>
      `;

      if (!content.includes('#0f172a')) {
        content = content.replace('</head>', `${customStyle}\n</head>`);
      }

      // 2. Ensure the service worker registration script is injected before </body>
      const scriptTag = '<script src="/sw-register.js"></script>';
      if (!content.includes('sw-register.js')) {
        content = content.replace('</body>', `${scriptTag}\n</body>`);
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Processed and updated: ${fullPath}`);
    }
  });
}

processHtmlFiles('./');
