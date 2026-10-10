const fs = require('fs');

module.exports = function injectDynamics() {
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  const now = new Date();
  const optionsDate = { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' };
  const optionsTime = { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  
  const formattedDate = new Intl.DateTimeFormat('en-US', optionsDate).format(now);
  const formattedTimeStatic = new Intl.DateTimeFormat('en-US', optionsTime).format(now) + ' PST';
  const buildTimestampString = `${formattedDate}, ${formattedTimeStatic}`;
  const targetDateMs = new Date('2028-03-01T10:00:00+08:00').getTime();

  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    if (!content.includes('rel="manifest"') && !content.includes('href="manifest.json"')) {
      content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
    }

    if (!content.includes('sw-register.js')) {
      content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
    }

    content = content.replace(/NULL1/g, `<span class="site-last-updated" style="font:inherit; color:inherit;">${buildTimestampString}</span>`);
    
    const liveClockHtml = `<span class="pst-live-clock" style="font:inherit; color:inherit;"><span id="live-clock">Loading clock...</span></span>
    <script>
      (function() {
        function updateClock() {
          const now = new Date();
          const optDate = { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' };
          const optTime = { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
          const dateStr = new Intl.DateTimeFormat('en-US', optDate).format(now);
          const timeStr = new Intl.DateTimeFormat('en-US', optTime).format(now) + ' PST';
          const el = document.getElementById('live-clock');
          if (el) el.innerHTML = dateStr + ", " + timeStr;
        }
        setInterval(updateClock, 1000);
        updateClock();
      })();
    </script>`;
    content = content.replace(/NULL2/g, liveClockHtml);

    const countdownHtml = `<span class="live-countdown-timer" style="font:inherit; color:inherit;"><span id="live-countdown">Loading countdown...</span></span>
    <script>
      (function() {
        const targetTime = ${targetDateMs};
        function updateCountdown() {
          const now = new Date().getTime();
          const distance = targetTime - now;
          const el = document.getElementById('live-countdown');
          if (!el) return;
          if (distance < 0) { el.innerHTML = "Countdown Ended!"; return; }
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          el.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s remaining";
        }
        setInterval(updateCountdown, 1000);
        updateCountdown();
      })();
    </script>`;
    content = content.replace(/NULL3/g, countdownHtml);

    fs.writeFileSync(file, content, 'utf8');
  });
  console.log('Dynamics (NULL1, NULL2, NULL3, manifests) injected successfully.');
};
