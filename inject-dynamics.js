const fs = require('fs');

module.exports = function injectDynamics() {
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  const now = new Date();
  // Using your original trusted date/time styling configuration
  const buildTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  }) + ' PST';

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

    // 3. Match your old NUL placeholders (supporting both NUL1/NULL1 and NUL2/NULL2 for safety)
    content = content.replace(/NULL1|NUL1/g, `<span class="site-last-updated" style="font:inherit; color:inherit;">${buildTimeString}</span>`);
    
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

    fs.writeFileSync(file, content, 'utf8');
  });
  console.log('Dynamics injected successfully using the stable dateStyle configuration.');
};
