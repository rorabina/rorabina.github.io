const workboxBuild = require('workbox-build');
const fs = require('fs');

async function buildSW() {
  console.log('Automated Build Pipeline: Injecting layout controls, dynamic theme color, & cleaning output...');
  
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  const now = new Date();
  const buildTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  }) + ' PST';

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

    // 3. Inject CSS Fail-Safe + Disable Text Selection + Anti-Zoom & Context Locks
    if (!content.includes('/* Mobirise Fail-Safe */')) {
      const styleInject = `
<style id="mobirise-cleaner">
  /* Mobirise Fail-Safe */
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

  /* Keep input fields operable */
  input, textarea {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }
</style>
<script id="anti-zoom-and-copy-lock">
  // Prevent iOS / Safari Pinch-to-Zoom Touch Gestures
  document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1 && event.scale !== undefined) {
      event.preventDefault();
    }
  }, { passive: false });

  // Prevent Double-Tap Zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent Clipboard Actions & Context Menus
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
</script>
`;
      content = content.replace(/<\/head>/i, `${styleInject}\n</head>`);
    }

    // 4. Inject Web App Manifest link into <head>
    if (!content.includes('rel="manifest"') && !content.includes('href="manifest.json"')) {
      content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
    }

    // 5. Inject sw-register.js script right before </body>
    if (!content.includes('sw-register.js')) {
      content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
    }

    // 6. Inline replacement for NUL features
    content = content.replace(/NUL1/g, `<span class="site-last-updated" style="font:inherit; color:inherit;">${buildTimeString}</span>`);
    content = content.replace(/NUL2/g, '<span class="pst-live-clock" style="font:inherit; color:inherit;">Loading PST...</span>');

    fs.writeFileSync(file, content, 'utf8');
  });

  // 7. Generate Workbox Service Worker
  const { count, size } = await workboxBuild.generateSW({
    globDirectory: './',
    globPatterns: [
      '**/*.html',
      'assets/**/*.css',
      'assets/**/*.js',
      'assets/**/*.{png,jpg,jpeg,svg,gif,woff,woff2,ttf,eot}',
      'manifest.json'
    ],
    globIgnores: [
      'node_modules/**/*',
      'build-sw.js',
      'sw.js',
      'workbox-*.js',
      'releases/**/*',
      '.github/**/*'
    ],
    swDest: 'sw.js',
    inlineWorkboxRuntime: true,
    ignoreURLParametersMatching: [/./],
    clientsClaim: true,
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rorabina-html-pages',
          expiration: { maxEntries: 50 },
        },
      },
      {
        urlPattern: ({ request, url }) =>
          request.destination === 'style' ||
          request.destination === 'script' ||
          request.destination === 'image' ||
          request.destination === 'font' ||
          url.pathname.includes('/assets/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'rorabina-assets',
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 60 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  });

  console.log(`Successfully generated sw.js: precached ${count} files (${size} bytes).`);
}

buildSW().catch(console.error);
