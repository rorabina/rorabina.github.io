const { generateSW } = require('workbox-build');
const fs = require('fs');
const path = require('path');

async function buildPWA() {
  console.log('1. Generating Workbox Service Worker...');

  // Generates sw.js with automatic file hashing and instant updates
  const { count, size } = await generateSW({
    swDest: 'sw.js',
    globDirectory: './',
    globPatterns: [
      '**/*.{html,css,js,json,png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot}'
    ],
    globIgnores: [
      'node_modules/**/*',
      'build-sw.js',
      'generate-sw.js',
      'inject-sw.js',
      'sw.js',
      'sw-register.js',
      'package.json',
      'package-lock.json',
      '.git/**/*',
      '.github/**/*'
    ],
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15 MB limit for large media/assets
  });

  console.log(`Generated sw.js precaching ${count} files (${(size / 1024 / 1024).toFixed(2)} MB).`);

  console.log('2. Injecting PWA tags into all HTML files...');

  // Find all HTML files in the root directory
  const files = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  const pwaSnippet = `
<!-- Clean PWA Injection Start -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
<script>
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
        // Check for an updated sw.js immediately on page load
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }
</script>
<!-- Clean PWA Injection End -->
`;

  files.forEach(file => {
    const filePath = path.join('./', file);
    let html = fs.readFileSync(filePath, 'utf8');

    // Remove any previously injected PWA blocks to prevent duplicates
    html = html.replace(/<!-- Clean PWA Injection Start -->[\s\S]*?<!-- Clean PWA Injection End -->\s*/g, '');

    // Inject right before closing </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${pwaSnippet}</head>`);
      fs.writeFileSync(filePath, html, 'utf8');
      console.log(`   -> Injected PWA into ${file}`);
    }
  });

  console.log('PWA Build & Injection Complete!');
}

buildPWA().catch(err => {
  console.error('Error building PWA:', err);
  process.exit(1);
});
