const { generateSW } = require('workbox-build');
const fs = require('fs');
const path = require('path');

async function buildPWA() {
  console.log('1. Generating Workbox Service Worker...');

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
    maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15 MB limit
  });

  console.log(`Generated sw.js precaching ${count} files (${(size / 1024 / 1024).toFixed(2)} MB).`);

  console.log('2. Injecting PWA, Android Install, Anti-Right-Click & Footer Styling into HTML files...');

  const files = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  const pwaSnippet = `
<!-- Clean PWA Injection Start -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
<style>
  /* Match Mobirise dynamic footer banner to #000000 footer */
  section.display-7 {
    background-color: #000000 !important;
    color: #888888 !important;
  }
  section.display-7 p,
  section.display-7 a {
    color: #888888 !important;
  }
  section.display-7 a:hover {
    color: #ffffff !important;
  }
  /* Prevent accidental image dragging */
  img {
    -webkit-user-drag: none;
    user-select: none;
  }
</style>
<script>
  // 1. Service Worker Registration + Instant Auto-Reload on Update
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
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }

  // 2. Anti-Right-Click & Basic Source-Inspect Protection
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, false);

  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  }, false);

  document.addEventListener('keydown', (e) => {
    // Block Ctrl+U (View Source), Ctrl+S (Save Page), Ctrl+Shift+I/J/C (DevTools), F12
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
      (e.ctrlKey && ['u', 'U', 's', 'S'].includes(e.key))
    ) {
      e.preventDefault();
    }
  }, false);

  // 3. Capture & Trigger PWA Install Prompt for Android Button
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.deferredPrompt = null;
  });

  document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('a, button');
    buttons.forEach((btn) => {
      const text = (btn.textContent || '').trim();
      const href = (btn.getAttribute('href') || '').trim();

      // Match the "Android" button on app.html (or any explicit install trigger)
      const isAndroidInstallBtn =
        btn.matches('#install-android, #installBtn, #pwa-install, [data-pwa-install]') ||
        (text === 'Android' && (!href || href === '#' || href.startsWith('javascript:')));

      if (isAndroidInstallBtn) {
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
          } else if (window.matchMedia('(display-mode: standalone)').matches) {
            alert('Rorabina App is already installed and running.');
          } else {
            alert('To install on Android: tap your browser menu (⋮) and select "Install app" or "Add to Home screen".');
          }
        });
      }
    });
  });
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
