// 1. Preserve & Restore Last Visited Page in PWA Standalone Mode
(function managePwaState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone) return;
  const isIndex = (p) => !p || p === '/' || p.endsWith('/index.html') || p.endsWith('index.html');
  const savePage = () => {
    const p = window.location.pathname;
    if (isIndex(p)) localStorage.removeItem('pwa_last_page');
    else if (p) localStorage.setItem('pwa_last_page', p);
  };
  const restorePage = () => {
    const cur = window.location.pathname;
    const last = localStorage.getItem('pwa_last_page');
    if (isIndex(cur) && last && !isIndex(last)) window.location.replace(last);
  };
  const bindHome = () => {
    document.querySelectorAll('a[href="/"], a[href$="index.html"], .navbar-brand, a.nav-link[href*="index"]').forEach((el) => {
      el.addEventListener('click', () => localStorage.removeItem('pwa_last_page'));
    });
  };
  savePage();
  restorePage();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindHome);
  else bindHome();
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'visible' ? restorePage() : savePage()));
  window.addEventListener('pageshow', restorePage);
})();

// 2. Service Worker Opt-In Registration, Unified File Size Monitoring & Minimizable Prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const OPT_IN_KEY = 'pwa_offline_opt_in';
    const MINIMIZED_KEY = 'pwa_offline_minimized';
    const APP_TREE_API_URL = 'https://api.github.com/repos/rorabina/app/git/trees/gh-pages?recursive=1';
    const APP_CACHE_NAME = 'rorabina-web-utilities-app';
    let barContainer = document.getElementById('pwa-cache-status');
    let checkInterval = null;
    let manualReloadPending = false;
    let manifestFiles = {};
    let manifestUrls = [];
    let totalBytes = 0;
    let baselineUsageBytes = 0;

    const normalizePath = (p) => (!p || p === '/' ? '/index.html' : p.startsWith('/') ? p : '/' + p);
    const formatSize = (b) => {
      if (!b || b <= 0) return '0.00 MB';
      const mb = b / (1024 * 1024);
      return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
    };

    async function getStorageUsageBytes() {
      try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
          const est = await navigator.storage.estimate();
          return Number(est.usage) || 0;
        }
      } catch (_) {}
      return 0;
    }

    function recalculateTotals() {
      manifestUrls = Object.keys(manifestFiles);
      totalBytes = Object.values(manifestFiles).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }

    async function syncLiveAppFiles() {
      if (!navigator.onLine) return;
      try {
        const cacheKey = 'rorabina_app_tree_cache_v1';
        let items = null;
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Date.now() - parsed.ts < 10 * 60 * 1000 && Array.isArray(parsed.items)) items = parsed.items;
          }
        } catch (_) {}

        if (!items) {
          const res = await fetch(APP_TREE_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
          if (!res.ok) return;
          const data = await res.json();
          const tree = Array.isArray(data?.tree) ? data.tree : [];
          items = tree
            .filter((e) => e && e.type === 'blob' && e.path && e.path.toLowerCase() !== 'readme.md' && !e.path.toLowerCase().startsWith('.github/'))
            .map((e) => ({ path: `/app/${e.path.replace(/^\/+/, '')}`, size: Number(e.size) || 0 }));
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
        }

        let updated = false;
        for (const item of items) {
          if (typeof manifestFiles[item.path] !== 'number' || manifestFiles[item.path] !== item.size) {
            manifestFiles[item.path] = item.size;
            updated = true;
          }
        }
        if (updated) recalculateTotals();
      } catch (_) {}
    }

    async function warmAppPagesCache() {
      if (!navigator.onLine || !('caches' in window)) return;
      const appUrls = manifestUrls.filter((u) => u.startsWith('/app/'));
      if (!appUrls.length) return;
      try {
        const appCache = await caches.open(APP_CACHE_NAME);
        await Promise.all(appUrls.map(async (relPath) => {
          const fullUrl = `${window.location.origin}${relPath}`;
          try {
            const resp = await fetch(fullUrl, { cache: 'reload' });
            if (resp && resp.ok) await appCache.put(fullUrl, resp);
          } catch (_) {}
        }));
      } catch (_) {}
    }

    async function loadPrecacheManifest() {
      const embedded = window.__PRECACHE_MANIFEST__;
      if (embedded && embedded.files && typeof embedded.files === 'object') {
        const next = {};
        for (const [k, v] of Object.entries(embedded.files)) next[normalizePath(k)] = Number(v) || 0;
        if (Object.keys(next).length > 0) {
          manifestFiles = next;
          recalculateTotals();
          if (Number(embedded.totalBytes) > 0) totalBytes = Number(embedded.totalBytes);
        }
      }
      try {
        const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const next = {};
          for (const [k, v] of Object.entries(data?.files || {})) next[normalizePath(k)] = Number(v) || 0;
          if (Object.keys(next).length > 0) {
            manifestFiles = next;
            recalculateTotals();
            if (Number(data?.totalBytes) > 0) totalBytes = Number(data.totalBytes);
          }
        }
      } catch (err) {
        console.warn('Could not load precache-manifest.json:', err);
      }
      await syncLiveAppFiles();
      recalculateTotals();
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
          .pwa-progress-fill { height: 100%; width: 0%; background: #3b82f6; transition: width 0.2s ease-out; }
          .pwa-text-row, .pwa-sub-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
          .pwa-text-row { font-weight: 600; }
          .pwa-sub-row { font-size: 11.5px; color: #cbd5e1; font-variant-numeric: tabular-nums; }
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
      container.innerHTML = `<button type="button" class="pwa-minimized-pill" aria-label="Open offline download prompt"><span class="pwa-pill-dot"></span><span>Offline Download${sizeSuffix}</span></button>`;
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
          <div class="pwa-desc">Download offline bundle (<span class="pwa-size-pill">${sizeLabel}</span> initial; grows slightly as you visit more pages).</div>
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
        warmAppPagesCache();
      });
    }

    function renderProgressUI(statusText, downloadedBytes, percent) {
      if (!navigator.onLine) return;
      const container = ensureWidgetContainer();
      const safeTotal = Math.max(totalBytes, downloadedBytes);
      const remainingBytes = Math.max(0, safeTotal - downloadedBytes);
      const sizeLine = safeTotal > 0 ? `${formatSize(downloadedBytes)} / ${formatSize(safeTotal)}` : `${formatSize(downloadedBytes)}`;
      const remLine = safeTotal > 0 ? `${formatSize(remainingBytes)} left` : '';
      container.innerHTML = `
        <div class="pwa-card">
          <div class="pwa-text-row"><span id="pwa-status-label">${statusText}</span><span id="pwa-status-pct">${percent}%</span></div>
          <div class="pwa-progress-track"><div id="pwa-progress-fill" class="pwa-progress-fill" style="width:${percent}%"></div></div>
          <div class="pwa-sub-row"><span>${sizeLine}</span><span>${remLine}</span></div>
          <div id="pwa-update-notice" class="pwa-sub-row" style="display:none;margin-top:4px;"><span>Update downloaded. Refresh to apply.</span><button id="pwa-refresh-btn" type="button">Refresh</button></div>
        </div>
      `;
      const refreshBtn = document.getElementById('pwa-refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', () => window.location.reload());
    }

    function showReadyToRefresh(isNewUpdate) {
      if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
      renderProgressUI(isNewUpdate ? 'Update cached for offline use!' : 'Ready for offline use!', totalBytes, 100);
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
      renderProgressUI(label, 0, 0);
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
                if (typeof manifestFiles[normPath] === 'number') manifestMatchedBytes += manifestFiles[normPath];
              } catch (_) {}
            }
          }
          const usageNow = await getStorageUsageBytes();
          const deltaStorageBytes = Math.max(0, usageNow - baselineUsageBytes);
          const cappedStorageBytes = totalBytes > 0 ? Math.min(deltaStorageBytes, totalBytes) : deltaStorageBytes;
          let downloadedBytes = Math.max(manifestMatchedBytes, cappedStorageBytes);
          const reachedTarget = (totalBytes > 0 && downloadedBytes >= totalBytes * 0.99) || (manifestUrls.length > 0 && currentCount >= manifestUrls.length);
          let percent = reachedTarget ? 100 : totalBytes > 0 ? Math.min(Math.round((downloadedBytes / totalBytes) * 100), 99) : 0;
          if (reachedTarget && totalBytes > 0) downloadedBytes = totalBytes;
          renderProgressUI(label, downloadedBytes, percent);
          if (percent >= 100) showReadyToRefresh(isNewUpdate);
        } catch (err) {
          console.error('Cache progress error:', err);
        }
      }, 500);
    }

    function registerAndMonitorServiceWorker(isExistingOptIn) {
      if (navigator.onLine && !localStorage.getItem('pwa_fully_cached')) startProgressMonitor(false);
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
        const hadExistingController = Boolean(navigator.serviceWorker.controller);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          if (hadExistingController) startProgressMonitor(true);
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && hadExistingController) showReadyToRefresh(true);
          });
        });
        const checkForUpdate = () => {
          if (navigator.onLine) { reg.update().catch(() => {}); warmAppPagesCache(); }
        };
        if (isExistingOptIn) checkForUpdate();
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
        window.addEventListener('pageshow', checkForUpdate);
      }).catch((err) => console.error('SW Registration Failed:', err));
    }

    await loadPrecacheManifest();
    baselineUsageBytes = await getStorageUsageBytes();
    const hasOptedIn = localStorage.getItem(OPT_IN_KEY) === 'true' || localStorage.getItem('pwa_fully_cached') === 'true';
    if (hasOptedIn) {
      registerAndMonitorServiceWorker(true);
      warmAppPagesCache();
    } else {
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (existingReg) await existingReg.unregister();
      if (localStorage.getItem(MINIMIZED_KEY) === 'true') renderMinimizedPill();
      else renderOptInPrompt();
    }
  });
}

// 3. Scoped Android Install Button Handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

function initAndroidButton() {
  if (!window.location.pathname.includes('app.html')) return;
  document.querySelectorAll('a[href*="android"], .btn-android, #android-install-btn, .btn').forEach((btn) => {
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

// 4. Live PST Clock Ticker (Fallback for .pst-live-clock elements without overwriting #live-clock)
function startLivePstClock() {
  const updatePstClocks = () => {
    const nowPST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'medium', hour12: true }) + ' PST';
    document.querySelectorAll('.pst-live-clock').forEach((clock) => {
      if (!clock.querySelector('#live-clock')) clock.textContent = nowPST;
    });
  };
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
    if (probeStyle.fontSize && parseFloat(probeStyle.fontSize) > 0) footerFontSize = probeStyle.fontSize;
  }
  let styleTag = document.getElementById('rorabina-display7-fix');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'rorabina-display7-fix';
    document.head.appendChild(styleTag);
  }
  const fontSizeRule = footerFontSize ? `font-size: ${footerFontSize} !important;` : '';
  styleTag.textContent = `
    section.display-7, section.display-7 > div, section.display-7 .container, section.display-7 .row { background-color: #000000 !important; background: #000000 !important; }
    section.display-7, section.display-7 * { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
    section.display-7 a, section.display-7 a * { ${fontSizeRule} opacity: 1 !important; visibility: visible !important; display: inline-block !important; }
  `;
}

function runAllSwRegisterInit() {
  initAndroidButton();
  startLivePstClock();
  applyFooterBackgroundToDisplay7();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runAllSwRegisterInit);
else runAllSwRegisterInit();
window.addEventListener('load', applyFooterBackgroundToDisplay7);
