const fs = require('fs');
const path = require('path');

function processHtmlFiles(dir) {
  let htmlFiles = [];

  function walk(currentDir) {
    fs.readdirSync(currentDir).forEach(file => {
      const fullPath = path.join(currentDir, file);
      
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== '.git' && file !== '.github' && file !== 'assets') {
          walk(fullPath);
        }
      } else if (path.extname(fullPath) === '.html') {
        let content = fs.readFileSync(fullPath, 'utf8');

        // 1. Generate date & time for NULL1 (Static build stamp)
        const now = new Date();
        const optionsDate = { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' };
        const optionsTime = { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        
        const formattedDate = new Intl.DateTimeFormat('en-US', optionsDate).format(now);
        const formattedTimeStatic = new Intl.DateTimeFormat('en-US', optionsTime).format(now) + ' PST';
        content = content.replace(/NULL1/g, `${formattedDate}, ${formattedTimeStatic}`);

        // 2. Replace NULL2 with live ticking clock script
        const null2Html = `
          <span id="live-clock">Loading clock...</span>
          <script>
            (function() {
              function updateClock() {
                const now = new Date();
                const optionsDate = { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' };
                const optionsTime = { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
                const dateStr = new Intl.DateTimeFormat('en-US', optionsDate).format(now);
                const timeStr = new Intl.DateTimeFormat('en-US', optionsTime).format(now) + ' PST';
                const el = document.getElementById('live-clock');
                if (el) el.innerHTML = dateStr + ", " + timeStr;
              }
              setInterval(updateClock, 1000);
              updateClock();
            })();
          </script>
        `;
        content = content.replace(/NULL2/g, null2Html);

        // 3. Replace NULL3 with live countdown pointing to March 1, 2028 10:00:00 AM UTC+8
        const targetDate = new Date('2028-03-01T10:00:00+08:00').getTime();
        const countdownHtml = `
          <span id="live-countdown">Loading countdown...</span>
          <script>
            (function() {
              const targetTime = ${targetDate};
              function updateCountdown() {
                const now = new Date().getTime();
                const distance = targetTime - now;
                const el = document.getElementById('live-countdown');
                if (!el) return;
                if (distance < 0) {
                  el.innerHTML = "Countdown Ended!";
                  return;
                }
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                el.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s remaining";
              }
              setInterval(updateCountdown, 1000);
              updateCountdown();
            })();
          </script>
        `;
        content = content.replace(/NULL3/g, countdownHtml);

        // 4. Inject manifest link and footer background color styling
        const headInjections = `
          <link rel="manifest" href="./manifest.json">
          <style>
            section.cid-s48MC36cej, footer, .mbr-section, .mbr-footer {
              background-color: #0f172a !important;
            }
          </style>
        `;
        if (!content.includes('manifest.json')) {
          content = content.replace('</head>', `${headInjections}\n</head>`);
        }

        // 5. Ensure service worker registration script is injected before </body>
        const scriptTag = '<script src="./sw-register.js"></script>';
        if (!content.includes('sw-register.js')) {
          content = content.replace('</body>', `${scriptTag}\n</body>`);
        }

        fs.writeFileSync(fullPath, content, 'utf8');

        const relPath = path.relative(dir, fullPath).replace(/\\/g, '/');
        htmlFiles.push(relPath);
      }
    });
  }

  walk(dir);
  return htmlFiles;
}

const discoveredHtmls = processHtmlFiles('./');

// Generate a clean, standard service worker that reliably caches all discovered files
const swContent = `
const CACHE_NAME = 'rorabina-pwa-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  ${discoveredHtmls.map(file => `'./' + '${file}'`).join(',\n  ')}
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('Cache addAll error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
`;

fs.writeFileSync('./sw.js', swContent, 'utf8');
console.log('Successfully generated robust sw.js with files:', discoveredHtmls.length);
