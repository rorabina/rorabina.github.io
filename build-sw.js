const workboxBuild = require('workbox-build');
const fs = require('fs');

async function buildSW() {
  console.log('Cleaning HTML files, injecting manifest, adding sw-register, and building SW...');
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  // Pre-format UTC/PST Build Time for Site Last Updated
  const now = new Date();
  const buildTimeString = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZoneName: 'short'
  });

  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Strip Mobirise backlinks and engine badges cleanly
    content = content.replace(/<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    content = content.replace(/<section[^>]*class="[^"]*engine[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');

    // 2. Fix broken Capgo CapacitorUpdater CDN import if present
    content = content.replace(
      /<script[^>]*type="module"[^>]*>[\s\S]*?import\s*\{\s*CapacitorUpdater\s*\}\s*from\s*['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@capgo\/capacitor-updater[^'"]*['"];?[\s\S]*?<\/script>/gi,
      `<script>
  document.addEventListener('deviceready', () => {
    const { CapacitorUpdater } = window.Capacitor?.Plugins || {};
    if (CapacitorUpdater) {
      CapacitorUpdater.notifyAppReady();
    }
  });
</script>`
    );

    // 3. Inject CSS Fail-Safe to force-hide lingering Mobirise overlays
    if (!content.includes('/* Mobirise Fail-Safe */')) {
      const styleInject = `
<style id="mobirise-cleaner">
  /* Mobirise Fail-Safe */
  .engine, [class*="engine"], a[href*="mobiri.se"], a[href*="mobirise.com"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
  }
</style>
`;
      content = content.replace(/<\/head>/i, `${styleInject}\n</head>`);
    }

    // 4. Inject Web App Manifest link safely inside <head> if missing
    if (!content.includes('rel="manifest"') && !content.includes('href="manifest.json"')) {
      content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
    }

    // 5. Inject Service Worker registration script before </body>
    if (!content.includes('sw-register.js')) {
      content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
    }

    // 6. Direct global replacement for NUL1 and NUL2 placeholders
    content = content.replace(/NUL1/g, `<span id="site-last-updated">${buildTimeString}</span>`);
    content = content.replace(/NUL2/g, '<span id="pst-live-clock">Loading PST...</span>');

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
    navigateFallback: 'index.html',
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

  console.log(`Generated sw.js: precatching ${count} files (${size} bytes).`);
}

buildSW().catch(console.error);
