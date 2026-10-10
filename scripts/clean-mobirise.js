const fs = require('fs');

function cleanMobiriseFiles() {
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));
  
  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Force Disable Mobile Zooming (Viewport Lock)
    const zoomLockViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">';
    if (content.includes('<meta name="viewport"')) {
      content = content.replace(/<meta name="viewport"[^>]*>/i, zoomLockViewport);
    } else {
      content = content.replace(/<\/head>/i, `  ${zoomLockViewport}\n</head>`);
    }

    // 2. Remove Mobirise backlinks AND parent wrapping tags
    content = content.replace(/<(p|div|section|span)[^>]*>\s*<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/\1>/gi, '');
    content = content.replace(/<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    content = content.replace(/<section[^>]*class="[^"]*engine[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');

    // 3. Inject CSS Fail-Safe, Copy Locks, & #0f172a Footer Background Styling
    if (!content.includes('/* Mobirise Fail-Safe */')) {
      const styleInject = `
<style id="mobirise-cleaner">
  /* Mobirise Fail-Safe & Footer Background */
  .engine, [class*="engine"], a[href*="mobiri.se"], a[href*="mobirise.com"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    overflow: hidden !important;
  }

  section.cid-s48MC36cej, footer, .mbr-section, .mbr-footer {
    background-color: #0f172a !important;
  }

  /* Disable Selection & Touch Callouts for PWA */
  *, html, body {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    touch-action: manipulation;
    -webkit-text-size-adjust: 100%;
  }

  input, textarea {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }
</style>
<script id="anti-zoom-and-copy-lock">
  document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1 && event.scale !== undefined) {
      event.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
</script>
`;
      content = content.replace(/<\/head>/i, `${styleInject}\n</head>`);
    }

    fs.writeFileSync(file, content, 'utf8');
  });
  console.log('Mobirise cleaner and layout protection script executed successfully.');
}

cleanMobiriseFiles();
