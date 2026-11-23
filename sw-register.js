// 1. Preserve & Restore Last Visited Page in PWA Standalone Mode
(function managePwaState() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;
  if (!isStandalone) return;
  const isIndex = (p) =>
    !p || p === '/' || p.endsWith('/index.html') || p.endsWith('index.html');
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
  savePage();
  restorePage();
  document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll(
        'a[href="/"], a[href$="index.html"], .navbar-brand, a.nav-link[href*="index"]'
      )
      .forEach((el) => {
        el.addEventListener('click', () =>
          localStorage.removeItem('pwa_last_page')
        );
      });
  });
  document.addEventListener('visibilitychange', () =>
    document.visibilityState === 'visible' ? restorePage() : savePage()
  );
  window.addEventListener('pageshow', restorePage);
})();

// 2. Service Worker Opt-In Registration, Bundle Size & Minimizable Prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const OPT_IN_KEY = 'pwa_offline_opt_in';
    const MINIMIZED_KEY = 'pwa_offline_minimized';
    const APP_TREE_API =
      'https://api.github.com/repos/rorabina/app/git/trees/gh-pages?recursive=1';
    let barContainer = document.getElementById('pwa-cache-status');
    let checkInterval = null;
    let totalBytes = Number(window.__PWA_BUNDLE_BYTES__) || 0;
    let baselineUsage = 0;

    const formatSize = (b) => {
      if (!b || b <= 0) return '0.00 MB';
      const mb = b / (1024 * 1024);
      return mb >= 1
        ? `${mb.toFixed(2)} MB`
        : `${Math.max(1, Math.round(b / 1024))} KB`;
    };

    const getUsage = async () => {
      try {
        if (navigator.storage?.estimate)
          return Number((await navigator.storage.estimate()).usage) || 0;
      } catch (_) {}
      return 0;
    };

    // Load totalBytes from /precache-manifest.json (includes main site + /app/ files)
    try {
      const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Number(data?.totalBytes) > 0) totalBytes = Number(data.totalBytes);
      }
    } catch (_) {}

    function ensureWidget() {
      if (!barContainer) {
        barContainer = document.createElement('div');
        barContainer.id = 'pwa-cache-status';
        document.body.appendChild(barContainer);
      }
      if (!document.getElementById('pwa-cache-styles')) {
        const s = document.createElement('style');
        s.id = 'pwa-cache-styles';
        s.textContent = `
          #pwa-cache-status{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;transition:opacity .3s,transform .3s}
          .pwa-card{background:rgba(18,18,18,.94);color:#fff;padding:14px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.38);backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:9px;min-width:270px;max-width:340px;border:1px solid rgba(255,255,255,.12)}
          .pwa-track{width:100%;height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden}
          .pwa-fill{height:100%;width:0%;background:#3b82f6;transition:width .2s ease-out}
          .pwa-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
          .pwa-sub{font-size:11.5px;color:#cbd5e1;font-variant-numeric:tabular-nums}
          .pwa-desc{font-size:12.5px;color:#cbd5e1;line-height:1.4}
          .pwa-pill{background:rgba(255,255,255,.12);color:#fff;padding:1px 6px;border-radius:5px;font-weight:600}
          .pwa-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
          .pwa-btn{border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer}
          .pwa-no{background:rgba(255,255,255,.12);color:#e2e8f0}
          .pwa-yes,#pwa-refresh-btn{background:#3b82f6;color:#fff}
          .pwa-mini{background:rgba(18,18,18,.92);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
          .pwa-dot{width:7px;height:7px;border-radius:50%;background:#3b82f6}
        `;
        document.head.appendChild(s);
      }
      return barContainer;
    }

    async function warmAppCache() {
      if (!navigator.onLine || !('caches' in window)) return;
      try {
        const res = await fetch(APP_TREE_API, {
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const urls = (data?.tree || [])
          .filter(
            (e) =>
              e?.type === 'blob' &&
              e.path &&
              e.path.toLowerCase() !== 'readme.md' &&
              !e.path.toLowerCase().startsWith('.github/')
          )
          .map(
            (e) => `${window.location.origin}/app/${e.path.replace(/^\/+/, '')}`
          );
        const cache = await caches.open('rorabina-web-utilities-app');
        await Promise.all(
          urls.map((u) =>
            fetch(u, { cache: 'reload' })
              .then((r) => r.ok && cache.put(u, r))
              .catch(() => {})
          )
        );
      } catch (_) {}
    }

    function renderProgress(label, doneBytes, pct, showRefresh) {
      if (!navigator.onLine) return;
      const c = ensureWidget();
      const safeTotal = Math.max(totalBytes, doneBytes);
      const left = Math.max(0, safeTotal - doneBytes);
      c.innerHTML = `<div class="pwa-card"><div class="pwa-row"><b>${label}</b><b>${pct}%</b></div><div class="pwa-track"><div class="pwa-fill" style="width:${pct}%"></div></div><div class="pwa-row pwa-sub"><span>${formatSize(doneBytes)} / ${formatSize(safeTotal)}</span><span>${formatSize(left)} left</span></div>${showRefresh ? '<div class="pwa-row pwa-sub" style="margin-top:4px"><span>Update ready.</span><button id="pwa-refresh-btn" class="pwa-btn" type="button">Refresh</button></div>' : ''}</div>`;
      document
        .getElementById('pwa-refresh-btn')
        ?.addEventListener('click', () => window.location.reload());
    }

    function startMonitor(isUpdate) {
      if (!navigator.onLine) return;
      const label = isUpdate
        ? 'Downloading update...'
        : 'Saving for offline use...';
      renderProgress(label, 0, 0, false);
      clearInterval(checkInterval);
      checkInterval = setInterval(async () => {
        const used = Math.max(0, (await getUsage()) - baselineUsage);
        const pct =
          totalBytes > 0
            ? Math.min(Math.round((used / totalBytes) * 100), 99)
            : 0;
        renderProgress(label, Math.min(used, totalBytes || used), pct, false);
      }, 500);
    }

    function finishMonitor(isUpdate) {
      clearInterval(checkInterval);
      renderProgress(
        isUpdate ? 'Update cached!' : 'Ready for offline use!',
        totalBytes,
        100,
        isUpdate
      );
      if (!isUpdate) {
        localStorage.setItem('pwa_fully_cached', 'true');
        setTimeout(
          () => document.getElementById('pwa-cache-status')?.remove(),
          2400
        );
      }
    }

    function registerSW(existingOptIn) {
      if (!localStorage.getItem('pwa_fully_cached')) startMonitor(false);
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          const hadCtrl = Boolean(navigator.serviceWorker.controller);
          if (reg.installing) {
            reg.installing.addEventListener(
              'statechange',
              (e) => e.target.state === 'installed' && finishMonitor(hadCtrl)
            );
          }
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            if (hadCtrl) startMonitor(true);
            nw.addEventListener(
              'statechange',
              () => nw.state === 'installed' && finishMonitor(hadCtrl)
            );
          });
          if (existingOptIn && navigator.onLine) reg.update().catch(() => {});
        })
        .catch((err) => console.error('SW Registration Failed:', err));
    }

    function renderMini() {
      if (!navigator.onLine) return;
      const c = ensureWidget();
      c.innerHTML = `<button type="button" class="pwa-mini"><span class="pwa-dot"></span><span>Offline Download${totalBytes > 0 ? ` (${formatSize(totalBytes)})` : ''}</span></button>`;
      c.querySelector('.pwa-mini').addEventListener('click', () => {
        localStorage.removeItem(MINIMIZED_KEY);
        renderPrompt();
      });
    }

    function renderPrompt() {
      if (!navigator.onLine) return;
      const c = ensureWidget();
      c.innerHTML = `<div class="pwa-card"><div class="pwa-row"><b>Download for Offline Use?</b></div><div class="pwa-desc">Download offline bundle (<span class="pwa-pill">${totalBytes > 0 ? formatSize(totalBytes) : 'Unknown size'}</span> initial; grows slightly as you visit more pages).</div><div class="pwa-btns"><button type="button" class="pwa-btn pwa-no">No</button><button type="button" class="pwa-btn pwa-yes">Yes</button></div></div>`;
      c.querySelector('.pwa-no').addEventListener('click', () => {
        localStorage.setItem(MINIMIZED_KEY, 'true');
        renderMini();
      });
      c.querySelector('.pwa-yes').addEventListener('click', async () => {
        baselineUsage = await getUsage();
        localStorage.setItem(OPT_IN_KEY, 'true');
        localStorage.removeItem(MINIMIZED_KEY);
        registerSW(false);
        warmAppCache();
      });
    }

    baselineUsage = await getUsage();
    if (
      localStorage.getItem(OPT_IN_KEY) === 'true' ||
      localStorage.getItem('pwa_fully_cached') === 'true'
    ) {
      registerSW(true);
      warmAppCache();
    } else {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.unregister();
      localStorage.getItem(MINIMIZED_KEY) === 'true'
        ? renderMini()
        : renderPrompt();
    }
  });
}

// 3. Scoped Android Install Button Handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('app.html')) {
    document
      .querySelectorAll(
        'a[href*="android"], .btn-android, #android-install-btn, .btn'
      )
      .forEach((btn) => {
        if (btn.textContent?.includes('Android')) {
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

  // 4. Live PST Clock Fallback
  const tickClock = () => {
    const nowPST =
      new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
      }) + ' PST';
    document.querySelectorAll('.pst-live-clock').forEach((el) => {
      if (!el.querySelector('#live-clock')) el.textContent = nowPST;
    });
  };
  tickClock();
  setInterval(tickClock, 1000);

  // 5. Match section.display-7 background & font size to footer
  const fixDisplay7 = () => {
    const footerEl = document.querySelector('section#footer, footer, .footer');
    const probe = footerEl?.querySelector('p, span, a, li, div') || footerEl;
    const fs = probe ? window.getComputedStyle(probe).fontSize : '';
    let tag = document.getElementById('rorabina-display7-fix');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'rorabina-display7-fix';
      document.head.appendChild(tag);
    }
    tag.textContent = `section.display-7,section.display-7>div,section.display-7 .container,section.display-7 .row{background:#000!important}section.display-7,section.display-7 *{opacity:1!important;visibility:visible!important;pointer-events:auto!important}section.display-7 a,section.display-7 a *{${fs ? `font-size:${fs}!important;` : ''}opacity:1!important;visibility:visible!important;display:inline-block!important}`;
  };
  fixDisplay7();
  window.addEventListener('load', fixDisplay7);
});