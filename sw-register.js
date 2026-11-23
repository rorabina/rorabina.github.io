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

// 2. Service Worker Opt-In Registration, Exact File Size Monitoring & Minimizable Prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const OPT_IN_KEY = 'pwa_offline_opt_in';
    const MINIMIZED_KEY = 'pwa_offline_minimized';
    let barContainer = document.getElementById('pwa-cache-status');
    let checkInterval = null;
    let manualReloadPending = false;
    let manifestFiles = {};
    let manifestUrls = [];
    let totalBytes = 0;
    let baselineUsageBytes = 0;
    let swWorkerState = null;

    function normalizePath(pathname) {
      if (!pathname || pathname === '/') return '/index.html';
      return pathname.startsWith('/') ? pathname : '/' + pathname;
    }

    function formatSize(bytes) {
      if (!bytes || bytes <= 0) return '0.00 MB';
      const mb = bytes / (1024 * 1024);
      return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    async function getStorageUsageBytes() {
      try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
          const est = await navigator.storage.estimate();
          return Number(est.usage) || 0;
        }
      } catch (_) {}
      return 0;
    }

    async function loadPrecacheManifest() {
      try {
        const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rawFiles = data.files || {};
        manifestFiles = {};

        for (const [k, v] of Object.entries(rawFiles)) {
          manifestFiles[normalizePath(k)] = Number(v) || 0;
        }

        manifestUrls = Object.keys(manifestFiles);
        totalBytes =
          Number(data.totalBytes) ||
          Object.values(manifestFiles).reduce((a, b) => a + b, 0);
      } catch (err) {
        console.warn('Could not load precache-manifest.json:', err);
      }
    }

    function ensureWidgetContainer() {
      if (!barContainer) {
        barContainer = document.createElement('div');
        barContainer.id = 'pwa-cache-status';
        document.body.appendChild(barContainer);
      }
      if (!document.getElementById('pwa-cache-styles')) {
        const style = document.createElement('style');
        style.id = 'pwa-cache-styles';
        style.textContent = `
          #pwa-cache-status { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; transition: opacity 0.3s ease, transform 0.3s ease; }
          .pwa-card { background: rgba(18, 18, 18, 0.94); color: #ffffff; padding: 14px 16px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.38); backdrop-filter: blur(8px); display: flex; flex-direction: column; gap: 9px; min-width: 270px; max-width: 340px; border: 1px solid rgba(255,255,255,0.12); }
          .pwa-progress-track { width: 100%; height: 6px; background: rgba(255, 255, 255, 0.2); border-radius: 3px; overflow: hidden; }
          .pwa-progress-fill { height: 100%; width: 0%; background: #3b82f6; transition: width 0.25s ease-out; }
          .pwa-text-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: 600; }
          .pwa-sub-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11.5px; color: #cbd5e1; font-variant-numeric: tabular-nums; }
          .pwa-desc { font-size: 12.5px; color: #cbd5e1; line-height: 1.4; }
          .pwa-size-pill { display: inline-block; background: rgba(255,255,255,0.12); color: #fff; padding: 1px 6px; border-radius: 5px; font-weight: 600; }
          .pwa-btn-group { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
          .pwa-btn { border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
          .pwa-btn-no { background: rgba(255,255,255,0.12); color: #e2e8f0; }
          .pwa-btn-no:hover { background: rgba(255,255,255,0.2); }
          .pwa-btn-yes, #pwa-refresh-btn { background: #3b82f6; color: #ffffff; }
          .pwa-btn-yes:hover, #pwa-refresh-btn:hover { background: #2563eb; }
          .pwa-minimized-pill { background: rgba(18, 18, 18, 0.92); color: #ffffff; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.32); backdrop-filter: blur(8px); display: inline-flex; align-items: center; gap: 7px; }
          .pwa-minimized-pill:hover { background: rgba(32, 32, 36, 0.96); }
          .pwa-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #3b82f6; }
        `;
        document.head.appendChild(style);
      }
      return barContainer;
    }

    function renderMinimizedPill() {
      if (!navigator.onLine) return;
      const container = ensureWidgetContainer();
      const sizeSuffix = totalBytes > 0 ? ` (${formatSize(totalBytes)})` : '';
      container.innerHTML = `
        <button type="button" class="pwa-minimized-pill" aria-label="Open offline download prompt">
          <span class="pwa-pill-dot"></span>
          <span>Offline Download${sizeSuffix}</span>
        </button>
      `;
      container.querySelector('.pwa-minimized-pill').addEventListener('click', () => {
        localStorage.removeItem(MINIMIZED_KEY);
        renderOptInPrompt();
      });
    }

    function renderOptInPrompt() {
      if (!navigator.onLine) return;
      const container = ensureWidgetContainer();
      const sizeLabel = totalBytes > 0 ? formatSize(totalBytes) : 'Unknown size';
      container.innerHTML = `
        <div class="pwa-card" role="region" aria-label="Offline Caching">
          <div class="pwa-text-row"><span>Download for Offline Use?</span></div>
          <div class="pwa-desc">
            Cache this site for offline access. Total download size: <span class="pwa-size-pill">${sizeLabel}</span>
          </div>
          <div class="pwa-btn-group">
            <button type="button" class="pwa-btn pwa-btn-no">No</button>
            <button type="button" class="pwa-btn pwa-btn-yes">Yes</button>
          </div>
        </div>
      `;

      container.querySelector('.pwa-btn-no').addEventListener('click', () => {
        localStorage.setItem(MINIMIZED_KEY, 'true');
        renderMinimizedPill();
      });

      container.querySelector('.pwa-btn-yes').addEventListener('click', async () => {
        baselineUsageBytes = await getStorageUsageBytes();
        localStorage.setItem(OPT_IN_KEY, 'true');
        localStorage.removeItem(MINIMIZED_KEY);
        registerAndMonitorServiceWorker(false);
      });
    }

    function renderProgressUI(statusText, downloadedBytes, percent, cachedCount, totalCount) {
      if (!navigator.onLine) return;
      const container = ensureWidgetContainer();
      const safeTotal = Math.max(totalBytes, downloadedBytes);
      const remainingBytes = Math.max(0, safeTotal - downloadedBytes);
      const sizeLine =
        safeTotal > 0
          ? `${formatSize(downloadedBytes)} / ${formatSize(safeTotal)} (${formatSize(remainingBytes)} left)`
          : `${downloadedBytes} bytes`;
      const fileLine = totalCount > 0 ? `${cachedCount}/${totalCount} files` : '';

      container.innerHTML = `
        <div class="pwa-card">
          <div class="pwa-text-row"><span id="pwa-status-label">${statusText}</span><span id="pwa-status-pct">${percent}%</span></div>
          <div class="pwa-progress-track"><div id="pwa-progress-fill" class="pwa-progress-fill" style="width:${percent}%"></div></div>
          <div class="pwa-sub-row"><span>${sizeLine}</span><span>${fileLine}</span></div>
          <div id="pwa-update-notice" class="pwa-sub-row" style="display:none;margin-top:4px;"><span>Update downloaded. Refresh to apply.</span><button id="pwa-refresh-btn" type="button">Refresh</button></div>
        </div>
      `;
      const refreshBtn = document.getElementById('pwa-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => window.location.reload());
      }
    }

    function showReadyToRefresh(isNewUpdate) {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      const count = manifestUrls.length;
      renderProgressUI(
        isNewUpdate ? 'Update cached for offline use!' : 'Ready for offline use!',
        totalBytes,
        100,
        count,
        count
      );

      if (isNewUpdate) {
        manualReloadPending = true;
        const noticeRow = document.getElementById('pwa-update-notice');
        if (noticeRow) noticeRow.style.display = 'flex';
        return;
      }

      localStorage.setItem('pwa_fully_cached', 'true');
      setTimeout(() => {
        const widget = document.getElementById('pwa-cache-status');
        if (widget && !manualReloadPending) {
          widget.style.opacity = '0';
          widget.style.transform = 'translateY(10px)';
          setTimeout(() => widget.remove(), 400);
        }
      }, 2400);
    }

    function startProgressMonitor(isNewUpdate) {
      if (!navigator.onLine) return;
      const label = isNewUpdate ? 'Downloading update...' : 'Saving for offline use...';
      renderProgressUI(label, 0, 0, 0, manifestUrls.length);

      if (checkInterval) clearInterval(checkInterval);

      checkInterval = setInterval(async () => {
        try {
          const cacheKeys = await caches.keys();
          const precacheName = cacheKeys.find((key) => key.includes('workbox-precache'));

          let currentCount = 0;
          let manifestMatchedBytes = 0;
          const seenPaths = new Set();

          if (precacheName) {
            const cache = await caches.open(precacheName);
            const cachedRequests = await cache.keys();
            currentCount = cachedRequests.length;

            for (const req of cachedRequests) {
              try {
                const normPath = normalizePath(new URL(req.url).pathname);
                if (seenPaths.has(normPath)) continue;
                seenPaths.add(normPath);

                if (typeof manifestFiles[normPath] === 'number') {
                  manifestMatchedBytes += manifestFiles[normPath];
                } else {
                  const resp = await cache.match(req);
                  if (resp) {
                    const blob = await resp.clone().blob();
                    manifestMatchedBytes += blob.size;
                  }
                }
              } catch (_) {}
            }
          }

          const usageNow = await getStorageUsageBytes();
          const deltaStorageBytes = Math.max(0, usageNow - baselineUsageBytes);
          const cappedStorageBytes = totalBytes > 0 ? Math.min(deltaStorageBytes, totalBytes) : deltaStorageBytes;
          let downloadedBytes = Math.max(manifestMatchedBytes, cappedStorageBytes);

          const totalCount = Math.max(manifestUrls.length, currentCount, 1);
          let estimatedCount =
            currentCount > 0
              ? Math.min(currentCount, totalCount)
              : totalBytes > 0
              ? Math.min(manifestUrls.length, Math.round((downloadedBytes / totalBytes) * manifestUrls.length))
              : 0;

          let percent =
            totalBytes > 0
              ? Math.min(Math.round((downloadedBytes / totalBytes) * 100), 99)
              : Math.min(Math.round((estimatedCount / totalCount) * 100), 99);

          const reg = await navigator.serviceWorker.getRegistration();
          const hasActiveWorker = Boolean(reg && reg.active);
          const hasInstallingWorker = Boolean(reg && reg.installing);
          const workerFinished =
            swWorkerState === 'installed' ||
            swWorkerState === 'activated' ||
            (!hasInstallingWorker && (hasActiveWorker || currentCount > 0));

          const reachedTarget =
            (manifestUrls.length > 0 && currentCount >= manifestUrls.length) ||
            (totalBytes > 0 && downloadedBytes >= totalBytes && workerFinished) ||
            (workerFinished && currentCount > 0 && totalBytes > 0 && downloadedBytes >= totalBytes * 0.98);

          if (reachedTarget) {
            percent = 100;
            downloadedBytes = totalBytes > 0 ? totalBytes : downloadedBytes;
            estimatedCount = manifestUrls.length > 0 ? manifestUrls.length : currentCount;
          }

          renderProgressUI(label, downloadedBytes, percent, estimatedCount, totalCount);

          if (percent >= 100) {
            showReadyToRefresh(isNewUpdate);
          }
        } catch (err) {
          console.error('Cache progress error:', err);
        }
      }, 250);
    }

    function registerAndMonitorServiceWorker(isExistingOptIn) {
      if (navigator.onLine && !localStorage.getItem('pwa_fully_cached')) {
        startProgressMonitor(false);
      }

      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          const hadExistingController = Boolean(navigator.serviceWorker.controller);

          const watchWorker = (worker) => {
            if (!worker) return;
            swWorkerState = worker.state;
            worker.addEventListener('statechange', () => {
              swWorkerState = worker.state;
              if (worker.state === 'installed' && hadExistingController) {
                showReadyToRefresh(true);
              }
            });
          };

          if (reg.installing) watchWorker(reg.installing);
          if (reg.waiting) watchWorker(reg.waiting);
          if (reg.active) swWorkerState = reg.active.state;

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            if (hadExistingController) {
              startProgressMonitor(true);
            }
            watchWorker(newWorker);
          });

          const checkForUpdate = () => {
            if (navigator.onLine) {
              reg.update().catch(() => {});
            }
          };

          if (isExistingOptIn) {
            checkForUpdate();
          }
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForUpdate();
          });
          window.addEventListener('pageshow', checkForUpdate);
        })
        .catch((err) => console.error('SW Registration Failed:', err));
    }

    await loadPrecacheManifest();
    baselineUsageBytes = await getStorageUsageBytes();

    const hasOptedIn =
      localStorage.getItem(OPT_IN_KEY) === 'true' ||
      localStorage.getItem('pwa_fully_cached') === 'true';

    if (hasOptedIn) {
      registerAndMonitorServiceWorker(true);
    } else {
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (existingReg) {
        await existingReg.unregister();
      }
      if (localStorage.getItem(MINIMIZED_KEY) === 'true') {
        renderMinimizedPill();
      } else {
        renderOptInPrompt();
      }
    }
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

// 5. Match section.display-7 background & font size to footer while leaving footer itself to HTML/CSS
function applyFooterBackgroundToDisplay7() {
  const footerEl = document.querySelector('section#footer, footer, .footer');
  let footerFontSize = '';

  if (footerEl) {
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

  const fontSizeRule = footerFontSize ? `font-size: ${footerFontSize} !important;` : '';

  styleTag.textContent = `
    section.display-7, section.display-7 > div, section.display-7 .container, section.display-7 .row {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    section.display-7, section.display-7 * {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
    section.display-7 a, section.display-7 a * {
      ${fontSizeRule}
      opacity: 1 !important;
      visibility: visible !important;
      display: inline-block !important;
    }
  `;
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
