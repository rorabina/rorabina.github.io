const fs = require('fs');
const path = require('path');

function processHtmlFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== '.git' && file !== '.github' && file !== 'assets') {
        processHtmlFiles(fullPath);
      }
    } else if (path.extname(fullPath) === '.html') {
      let content = fs.readFileSync(fullPath, 'utf8');

      // 1. Generate current date/time values for NULL1 and NULL2 in UTC+8
      const now = new Date();
      const optionsDate = { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' };
      const optionsTime = { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      
      const formattedDate = new Intl.DateTimeFormat('en-US', optionsDate).format(now);
      const formattedTime = new Intl.DateTimeFormat('en-US', optionsTime).format(now) + ' PST';

      // Replace NULL1 and NULL2 placeholders
      content = content.replace(/NULL1/g, formattedDate);
      content = content.replace(/NULL2/g, formattedTime);

      // 2. Replace NULL3 with a live countdown script pointing to March 1, 2028 10:00:00 AM UTC+8
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

      // 3. Inject CSS to style the footer background color to #0f172a
      const customStyle = `
        <style>
          section.cid-s48MC36cej, footer, .mbr-section, .mbr-footer {
            background-color: #0f172a !important;
          }
        </style>
      `;
      if (!content.includes('#0f172a')) {
        content = content.replace('</head>', `${customStyle}\n</head>`);
      }

      // 4. Ensure service worker registration script is injected before </body>
      const scriptTag = '<script src="/sw-register.js"></script>';
      if (!content.includes('sw-register.js')) {
        content = content.replace('</body>', `${scriptTag}\n</body>`);
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Successfully updated: ${fullPath}`);
    }
  });
}

processHtmlFiles('./');
