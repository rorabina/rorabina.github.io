// Preserve & Restore Active Page State in Standalone PWA Mode
(function managePwaState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone) return;

  function getNormalizedPath(path) {
    if (!path) return '';
    return path.split('?')[0].split('#')[0];
  }

  function isIndexRoute(path) {
    const clean = getNormalizedPath(path);
    return clean === '/' || clean === '' || clean.endsWith('/index.html') || clean.endsWith('index.html');
  }

  function saveCurrentPage() {
    const currentPath = getNormalizedPath(window.location.pathname);
    if (!isIndexRoute(currentPath)) {
      localStorage.setItem('pwa_active_page', currentPath);
    }
  }

  function restoreLastPage() {
    const currentPath = getNormalizedPath(window.location.pathname);
    const savedPath = localStorage.getItem('pwa_active_page');

    if (isIndexRoute(currentPath) && savedPath && !isIndexRoute(savedPath)) {
      window.location.replace(savedPath);
    }
  }

  // Clear saved page state on explicit home / logo clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href) {
      const targetUrl = new URL(link.href, window.location.href);
      if (targetUrl.origin === window.location.origin) {
        const targetPath = getNormalizedPath(targetUrl.pathname);
        if (isIndexRoute(targetPath)) {
          localStorage.removeItem('pwa_active_page');
        } else {
          localStorage.setItem('pwa_active_page', targetPath);
        }
      }
    }
  }, true);

  // Save current route upon loading non-index pages
  saveCurrentPage();

  // Restore saved route if app is cold-started or resumed onto the root index
  restoreLastPage();

  // Restore when app is brought back to the foreground from background memory
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      restoreLastPage();
    } else {
      saveCurrentPage();
    }
  });

  window.addEventListener('pageshow', restoreLastPage);
})();

// Service Worker Registration, Cache Progress, Timestamps, and Scoped Android PWA Trigger
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Floating Cache Progress Bar UI
    const barContainer = document.createElement('div');
    barContainer.id = 'pwa-cache-status';
    barContainer.innerHTML = `
      <style>
        #pwa-cache-status {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
          background: rgba(18, 18, 18, 0.92);
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 220px;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .pwa-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }
        .pwa-progress-fill {
          height: 100%;
          width: 0%;
          background: #3b82f6;
          transition: width 0.3s ease-out;
        }
        .pwa-text-row {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
        }
      </style>
      <div class="pwa-text-row">
        <span id="pwa-status-label">Saving for offline use...</span>
        <span id="pwa-status-pct">0%</span>
      </div>
      <div class="pwa-progress-track">
        <div id="pwa-progress-fill" class="pwa-progress-fill"></div>
      </div>
    `;

    if (navigator.onLine && !localStorage.getItem('pwa_fully_cached')) {
      document.body.appendChild(barContainer);
    }

    // Register Service Worker
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      reg.update();
    }).catch(err => console.error('SW Registration Failed:', err));

    // Monitor Cache Progress
    let checkInterval = setInterval(async () => {
      try {
        const cacheKeys = await caches.keys();
        const precacheName = cacheKeys.find(key => key.includes('workbox-precache'));

        if (precacheName) {
          const cache = await caches.open(precacheName);
          const cachedRequests = await cache.keys();
          const currentCount = cachedRequests.length;

          const estimatedTotal = Math.max(currentCount, 120);
          let percent = Math.min(Math.round((currentCount / estimatedTotal) * 100), 99);

          const reg = await navigator.serviceWorker.getRegistration();
          const isInstalling = reg && (reg.installing || reg.waiting);

          if (!isInstalling && currentCount > 100) {
            percent = 100;
          }

          const fill = document.getElementById('pwa-progress-fill');
          const pctText = document.getElementById('pwa-status-pct');
          const labelText = document.getElementById('pwa-status-label');

          if (fill) fill.style.width = percent + '%';
          if (pctText) pctText.innerText = percent + '%';

          if (percent >= 100) {
            clearInterval(checkInterval);
            if (labelText) labelText.innerText = 'Ready for offline use!';
            localStorage.setItem('pwa_fully_cached', 'true');

            setTimeout(() => {
              const widget = document.getElementById('pwa-cache-status');
              if (widget) {
                widget.style.opacity = '0';
                widget.style.transform = 'translateY(10px)';
                setTimeout(() => widget.remove(), 400);
              }
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Cache progress error:', err);
      }
    }, 400);
  });
}

// Scoped Android Install Button Handling for app.html
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function initAndroidButton() {
  if (window.location.pathname.includes('app.html')) {
    const androidBtns = document.querySelectorAll('a[href*="android"], .btn-android, #android-install-btn, .btn');
    androidBtns.forEach(btn => {
      if (btn.textContent.includes('Android')) {
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', async (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA Install Choice: ${outcome}`);
            deferredPrompt = null;
          } else {
            alert('PWA install prompt is ready or app is already installed!');
          }
        });
      }
    });
  }
}

// Client-side Live PST Clock Ticker & Container Space Cleaner
function startLivePstClock() {
  document.querySelectorAll('a[href*="mobirise.com"], a[href*="mobiri.se"]').forEach(el => {
    const parent = el.parentElement;
    el.remove();
    if (parent && parent.textContent.trim() === '') {
      parent.remove();
    }
  });

  function updatePstClocks() {
    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }) + ' PST';

    document.querySelectorAll('.pst-live-clock').forEach(clock => {
      clock.textContent = nowPST;
    });
  }

  updatePstClocks();
  setInterval(updatePstClocks, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAndroidButton();
    startLivePstClock();
  });
} else {
  initAndroidButton();
  startLivePstClock();
}
