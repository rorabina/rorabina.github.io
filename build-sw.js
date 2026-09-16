const workboxBuild = require('workbox-build');
const fs = require('fs');

async function buildSW() {
  console.log('Automated Build Pipeline: Injecting mobile layout optimizations & cleaning Mobirise output...');
  
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

    // 1. Restore Standard Mobile Viewport (Proper 1:1 scale for smooth responsiveness)
    const standardViewport = '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">';
    if (content.includes('<meta name="viewport"')) {
      content = content.replace(/<meta name="viewport"[^>]*>/i, standardViewport);
    } else {
      content = content.replace(/<\/head>/i, `  ${standardViewport}\n</head>`);
    }

    // 2. Remove Mobirise backlinks AND parent elements
    content = content.replace(/<(p|div|section|span)[^>]*>\s*<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/\1>/gi, '');
    content = content.replace(/<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    content = content.replace(/<section[^>]*class="[^"]*engine[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');

    // 3. Inject Mobile Responsive Layout & Fluid Typography Rules
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

  /* Optimized Mobile Typography (Proportional & Readable) */
  @media (max-width: 767px) {
    h1, .display-1 {
      font-size: clamp(2rem, 6vw, 2.75rem) !important;
      line-height: 1.2 !important;
    }
    h2, .display-2 {
      font-size: clamp(1.6rem, 5vw, 2.2rem) !important;
      line-height: 1.3 !important;
    }
    h3, .display-5 {
      font-size: clamp(1.3rem, 4vw, 1.75rem) !important;
    }
    p, span, li, div {
      font-size: clamp(1.05rem, 3.5vw, 1.2rem) !important;
      line-height: 1.6 !important;
    }
    .btn {
      font-size: 1.05rem !important;
      padding: 10px 20px !important;
    }
    /* Section padding normalization to prevent excessive vertical gaps on small displays */
    section {
      padding-top: 2rem !important;
      padding-bottom: 2rem !important;
    }
  }
</style>
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

  console.log(`Successfully generated sw.js: precached ${count} files (${size} bytes).`);
}

buildSW().catch(console.error);
