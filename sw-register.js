// 1. Preserve & Restore Last Visited Page in PWA Standalone Mode
(function managePwaState() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;
  if (!isStandalone) return;

  function isIndexPage(path) {
    return (
      path === '/' ||
      path === '' ||
      path.endsWith('/index.html') ||
      path.endsWith('index.html')
    );
  }

  function saveCurrentPage() {
    const currentPath = window.location.pathname;
    if (isIndexPage(currentPath)) {
      localStorage.removeItem('pwa_last_page');
    } else if (currentPath) {
      localStorage.setItem('pwa_last_page', currentPath);
    }
  }

  function restoreLastPage() {
    const currentPath = window.location.pathname;
    const lastPath = localStorage.getItem('pwa_last_page');
    if (isIndexPage(currentPath) && lastPath && !isIndexPage(lastPath)) {
      window.location.replace(lastPath);
    }
  }

  function attachHomeLinkListeners() {
    const homeLinks = document.querySelectorAll(
      'a[href="/"], a[href$="index.html"], .navbar-brand, a.nav-link[href*="index"]'
    );
    homeLinks.forEach((link) => {
      link.addEventListener('click', () => {
        localStorage.removeItem('pwa_last_page');
      });
    });
  }

  saveCurrentPage();
  restoreLastPage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHomeLinkListeners);
  } else {
    attachHomeLinkListeners();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      restoreLastPage();
    } else {
      saveCurrentPage();
    }
  });

  window.addEventListener('pageshow', restoreLastPage);
})();

// 2. Service Worker Registration & Offline Cache Progress UI (First Cache + Background Updates)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let barContainer = document.getElementById('pwa-cache-status');
    let checkInterval = null;
    let manualReloadPending = false;

    function ensureProgressBar(statusText = 'Updating offline cache...') {
      if (!navigator.onLine) return null;

      if (!barContainer) {
        barContainer = document.createElement('div');
        barContainer.id = 'pwa-cache-status';
        barContainer.innerHTML = [
          '<style>',
          '#pwa-cache-status { position: fixed; bottom: 20px; right: 20px; z-index: 99999; background: rgba(18, 18, 18, 0.94); color: #ffffff; padding: 12px 16px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); backdrop-filter: blur(8px); display: flex; flex-direction: column; gap: 8px; min-width: 240px; max-width: 320px; transition: opacity 0.4s ease, transform 0.4s ease; }',
          '.pwa-progress-track { width: 100%; height: 6px; background: rgba(255, 255, 255, 0.2); border-radius: 3px; overflow: hidden; }',
          '.pwa-progress-fill { height: 100%; width: 0%; background: #3b82f6; transition: width 0.3s ease-out; }',
          '.pwa-text-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: 500; }',
          '.pwa-action-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; color: #cbd5e1; }',
          '#pwa-refresh-btn { background: #3b82f6; color: #ffffff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }',
          '#pwa-refresh-btn:hover { background: #2563eb; }',
          '</style>',
          '<div class="pwa-text-row"><span id="pwa-status-label">' + statusText + '</span><span id="pwa-status-pct">0%</span></div>',
          '<div class="pwa-progress-track"><div id="pwa-progress-fill" class="pwa-progress-fill"></div></div>',
          '<div id="pwa-update-notice" class="pwa-action-row" style="display:none;"><span>Update downloaded. Refresh to apply.</span><button id="pwa-refresh-btn" type="button">Refresh</button></div>'
        ].join('');
        document.body.appendChild(barContainer);

        const refreshBtn = document.getElementById('pwa-refresh-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            window.location.reload();
          });
        }
      } else {
        barContainer.style.opacity = '1';
        barContainer.style.transform = 'translateY(0)';
        const labelEl = document.getElementById('pwa-status-label');
        if (labelEl) labelEl.textContent = statusText;
      }

      return barContainer;
    }

    function showReadyToRefresh(isNewUpdate) {
      const fill = document.getElementById('pwa-progress-fill');
      const pctText = document.getElementById('pwa-status-pct');
      const labelText = document.getElementById('pwa-status-label');
      const noticeRow = document.getElementById('pwa-update-notice');

      if (fill) fill.style.width = '100%';
      if (pctText) pctText.innerText = '100%';

      if (isNewUpdate) {
        manualReloadPending = true;
        if (labelText) labelText.innerText = 'Update cached for offline use!';
        if (noticeRow) noticeRow.style.display = 'flex';
      } else {
        if (labelText) labelText.innerText = 'Ready for offline use!';
        localStorage.setItem('pwa_fully_cached', 'true');
        setTimeout(() => {
          const widget = document.getElementById('pwa-cache-status');
          if (widget && !manualReloadPending) {
            widget.style.opacity = '0';
            widget.style.transform = 'translateY(10px)';
            setTimeout(() => widget.remove(), 400);
          }
        }, 2000);
      }
    }

    function startProgressMonitor(isNewUpdate) {
      if (!navigator.onLine) return;
      ensureProgressBar(
        isNewUpdate ? 'Downloading update for offline use...' : 'Saving for offline use...'
      );

      if (checkInterval) clearInterval(checkInterval);

      checkInterval = setInterval(async () => {
        try {
          const cacheKeys = await caches.keys();
          const precacheName = cacheKeys.find((key) => key.includes('workbox-precache'));
          if (!precacheName) return;

          const cache = await caches.open(precacheName);
          const cachedRequests = await cache.keys();
          const currentCount = cachedRequests.length;
          const estimatedTotal = Math.max(currentCount, 120);
          let percent = Math.min(Math.round((currentCount / estimatedTotal) * 100), 99);

          const reg = await navigator.serviceWorker.getRegistration();
          const isInstalling = Boolean(reg && (reg.installing || reg.waiting));
          if (!isInstalling && currentCount > 100) {
            percent = 100;
          }

          const fill = document.getElementById('pwa-progress-fill');
          const pctText = document.getElementById('pwa-status-pct');
          if (fill) fill.style.width = percent + '%';
          if (pctText) pctText.innerText = percent + '%';

          if (percent >= 100) {
            clearInterval(checkInterval);
            showReadyToRefresh(isNewUpdate);
          }
        } catch (err) {
          console.error('Cache progress error:', err);
        }
      }, 400);
    }

    if (navigator.onLine && !localStorage.getItem('pwa_fully_cached')) {
      startProgressMonitor(false);
    }

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        const hadExistingController = Boolean(navigator.serviceWorker.controller);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          if (hadExistingController) {
            startProgressMonitor(true);
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && hadExistingController) {
              showReadyToRefresh(true);
            }
          });
        });

        const checkForUpdate = () => {
          if (navigator.onLine) {
            reg.update().catch(() => {});
          }
        };

        checkForUpdate();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForUpdate();
          }
        });
        window.addEventListener('pageshow', checkForUpdate);
      })
      .catch((err) => console.error('SW Registration Failed:', err));
  });
}

// 3. Scoped Android Install Button Handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function initAndroidButton() {
  if (!window.location.pathname.includes('app.html')) return;

  const androidBtns = document.querySelectorAll(
    'a[href*="android"], .btn-android, #android-install-btn, .btn'
  );
  androidBtns.forEach((btn) => {
    if (btn.textContent && btn.textContent.includes('Android')) {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', async (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
        } else {
          alert('PWA install prompt is ready or app is already installed!');
        }
      });
    }
  });
}

// 4. Live PST Clock Ticker
function startLivePstClock() {
  function updatePstClocks() {
    const nowPST =
      new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
      }) + ' PST';

    document.querySelectorAll('.pst-live-clock').forEach((clock) => {
      clock.textContent = nowPST;
    });
  }

  updatePstClocks();
  setInterval(updatePstClocks, 1000);
}

// 5. Keep footer #000000 from HTML/CSS & match section.display-7 background/font size
function applyFooterBackgroundToDisplay7() {
  const footerEl = document.querySelector('section#footer, footer, .footer');
  const targetBg = '#000000';
  let footerFontSize = '';

  if (footerEl) {
    footerEl.style.setProperty('background-color', targetBg, 'important');
    footerEl.style.setProperty('background', targetBg, 'important');

    const textProbe = footerEl.querySelector('p, span, a, li, div') || footerEl;
    const probeStyle = window.getComputedStyle(textProbe);
    if (probeStyle.fontSize && parseFloat(probeStyle.fontSize) > 0) {
      footerFontSize = probeStyle.fontSize;
    }
  }

  let styleTag = document.getElementById('rorabina-display7-fix');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'rorabina-display7-fix';
    document.head.appendChild(styleTag);
  }

  const fontSizeRule = footerFontSize
    ? '  font-size: ' + footerFontSize + ' !important;'
    : '';

  styleTag.textContent = [
    'footer, section#footer, .footer {',
    '  background-color: ' + targetBg + ' !important;',
    '  background: ' + targetBg + ' !important;',
    '}',
    'section.display-7, section.display-7 > div, section.display-7 .container, section.display-7 .row {',
    '  background-color: ' + targetBg + ' !important;',
    '  background: ' + targetBg + ' !important;',
    '}',
    'section.display-7, section.display-7 * {',
    '  opacity: 1 !important;',
    '  visibility: visible !important;',
    '  pointer-events: auto !important;',
    '}',
    'section.display-7 a, section.display-7 a * {',
    fontSizeRule,
    '  opacity: 1 !important;',
    '  visibility: visible !important;',
    '  display: inline-block !important;',
    '}'
  ].join('\n');
}

function runAllSwRegisterInit() {
  initAndroidButton();
  startLivePstClock();
  applyFooterBackgroundToDisplay7();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllSwRegisterInit);
} else {
  runAllSwRegisterInit();
}

window.addEventListener('load', applyFooterBackgroundToDisplay7);
