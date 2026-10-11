const fs = require('fs');

module.exports = function injectDynamics() {
    const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));
    const now = new Date();
    
    // Build time string for NULL1 using standard medium date style (shortened month)
    const buildTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'medium', hour12: true }) + ' PST';

    htmlFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');

        // 1. Inject Web App Manifest link into <head>
        if (!content.includes('rel="manifest"') && !content.includes('href="manifest.json"')) {
            content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
        }

        // 2. Inject sw-register.js script right before </body>
        if (!content.includes('sw-register.js')) {
            content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
        }

        // 3. Replace NULL1 / NUL1 with build time
        content = content.replace(/NULL1|NUL1/g, `<span class="site-last-updated" style="font:inherit; color:inherit;">${buildTimeString}</span>`);

        // 4. Replace NULL2 / NUL2 with live clock using standard medium style
        const liveClockHtml = '<span class="pst-live-clock" style="font:inherit; color:inherit;"><span id="live-clock">Loading clock...</span></span>' +
            '<script>' +
            '(function() {' +
            '  function updateClock() {' +
            '    const now = new Date();' +
            '    const timeStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "medium", hour12: true }) + " PST";' +
            '    const el = document.getElementById("live-clock");' +
            '    if (el) el.innerHTML = timeStr;' +
            '  }' +
            '  setInterval(updateClock, 1000);' +
            '  updateClock();' +
            '})();' +
            '</script>';
        content = content.replace(/NULL2|NUL2/g, liveClockHtml);

        // 5. Replace NULL3 / NUL3 with live countdown targeting March 1, 2028, 10:00:00 AM UTC+8
        const targetDate = new Date('2028-03-01T10:00:00+08:00').getTime();
        const countdownHtml = '<span class="target-countdown" style="font:inherit; color:inherit;"><span id="live-countdown">Calculating countdown...</span></span>' +
            '<script>' +
            '(function() {' +
            '  const targetTime = ' + targetDate + ';' +
            '  function updateCountdown() {' +
            '    const now = new Date().getTime();' +
            '    const distance = targetTime - now;' +
            '    const el = document.getElementById("live-countdown");' +
            '    if (!el) return;' +
            '    if (distance < 0) {' +
            '      el.innerHTML = "Target Reached";' +
            '      return;' +
            '    }' +
            '    const days = Math.floor(distance / (1000 * 60 * 60 * 24));' +
            '    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));' +
            '    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));' +
            '    const seconds = Math.floor((distance % (1000 * 60)) / 1000);' +
            '    el.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s";' +
            '  }' +
            '  setInterval(updateCountdown, 1000);' +
            '  updateCountdown();' +
            '})();' +
            '</script>';
        content = content.replace(/NULL3|NUL3/g, countdownHtml);

        fs.writeFileSync(file, content, 'utf8');
    });

    console.log('Dynamics, clock, and NULL3 countdown injected successfully.');
};
