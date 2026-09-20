const workboxBuild = require('workbox-build');
const fs = require('fs');

async function buildSW() {
  console.log('Automated Build Pipeline: Injecting mobile layout protections, copy locks, & cleaning output...');
  
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));
  const now = new Date();
  const buildTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  }) + ' PST';

  // Target timestamp: March 1, 2028, 10:00:00 AM UTC+8 (Philippine Standard Time)
  const nul3TargetDate = '2028-03-01T10:00:00+08:00';

  const nul3CountdownScript = `
<span id="nul3-countdown" style="font:inherit; color:inherit;">Loading countdown...</span>
<script id="nul3-timer-script">
  (function startNul3Countdown() {
    const targetTime = new Date("${nul3TargetDate}").getTime();

    function updateCountdown() {
      const now = new Date().getTime();
      const distance = targetTime - now;
      const el = document.getElementById("nul3-countdown");

      if (!el) return;

      if (distance < 0) {
        el.textContent = "Event Started";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      el.textContent = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  })();
</script>
`;

  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Force Disable Mobile Zooming (Viewport Lock)
    const zoomLockViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">';
    if (content.includes('<meta name="viewport"')) {
      content = content.replace(/<meta name="viewport"[^>]*>/i, zoomLockViewport);
    } else {
      content = content.replace(/<\/head>/i, `  ${zoomLockViewport}\n</head>`);
    }

    // 2. Inject CSS, Matching Mobirise Link Background to Footer, & Copy Lock Rules
    if (!content.includes('/* PWA Protections */')) {
      const styleInject = `
  <style id="pwa-protections">
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
    /* Match Mobirise dynamic link container background to black footer */
    section[class*="cid-"],
    section.engine,
    div[style*="mobiri.se"],
    a[href*="mobiri.se"] {
      background-color: #000000 !important;
      color: #ffffff !important;
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

    // 3. Inject Web App Manifest link into <head>
    if (!content.includes('rel="manifest"') && !content.includes('href="manifest.json"')) {
      content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
    }

    // 4. Inject sw-register.js script right before </body>
    if (!content.includes('sw-register.js')) {
      content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
    }

    // 5. Inline replacement for NUL features
    content = content.replace(/NUL1/g, `<span class="site-last-updated" style="font:inherit; color:inherit;">${buildTimeString}</span>`);
    content = content.replace(/NUL2/g, '<span class="pst-live-clock" style="font:inherit; color:inherit;">Loading PST...</span>');
    content = content.replace(/NUL3/g, nul3CountdownScript);

    fs.writeFileSync(file, content, 'utf8');
  });

  // 6. Generate Workbox Service Worker
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
          expiration: {
            maxEntries: 50
          },
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
