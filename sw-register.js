// 1. Preserve & Restore Last Visited Page in PWA Standalone Mode
(function managePwaState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone) return;

  function isIndexPage(path) {
    return path === '/' || path === '' || path.endsWith('/index.html') || path.endsWith('index.html');
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
    const homeLinks = document.querySelectorAll('a[href="/"], a[href$="index.html"], .navbar-brand, a.nav-link[href*="index"]');
    homeLinks.forEach(link => {
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

// 2. Service Worker Registration & Offline Cache Progress UI
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
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

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        reg.update();
      })
      .catch(err => console.error('SW Registration Failed:', err));

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

// 3. Scoped Android Install Button Handling
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
            deferredPrompt = null;
          } else {
            alert('PWA install prompt is ready or app is already installed!');
          }
        });
      }
    });
  }
}

// 4. Live PST Clock Ticker
function startLivePstClock() {
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

// 5. Match bottom container/link box to footer background (#000000) & restore link visibility
function applyFooterBackgroundToDisplay7() {
  const footerEl = document.querySelector('section#footer, footer, .footer');
  let footerBg = '#000000';
  if (footerEl) {
    const computedBg = window.getComputedStyle(footerEl).backgroundColor;
    if (computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)') {
      footerBg = computedBg;
    }
  }

  let styleTag = document.getElementById('rorabina-display7-fix');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'rorabina-display7-fix';
    document.head.appendChild(styleTag);
  }

  styleTag.innerHTML = `
    section.display-7,
    section.display-7 > div,
    section.display-7 .container,
    section.display-7 .row {
      background-color: ${footerBg} !important;
      background: ${footerBg} !important;
    }
    section.display-7,
    section.display-7 * {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
    section.display-7 a,
    section.display-7 a * {
      color: #cbd5e1 !important;
      font-size: 0.875rem !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: inline-block !important;
    }
    section.display-7 a:hover,
    section.display-7 a:hover * {
      color: #ffffff !important;
    }
  `;

  // Also inspect elements below the footer in case the dynamic Mobirise link sits outside section.display-7
  if (!footerEl) return;
  const footerRect = footerEl.getBoundingClientRect();
  const candidates = Array.from(document.querySelectorAll('a, section, div, p, span'));

  candidates.forEach(el => {
    if (el === footerEl || footerEl.contains(el) || el.closest('#pwa-cache-status')) return;
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const isBelowFooter = rect.top >= footerRect.bottom - 2;
    const hasSlateBg =
      cs.backgroundColor === 'rgb(15, 23, 42)' ||
      (el.getAttribute('style') || '').toLowerCase().includes('#0f172a');
    const isMobiriseLink =
      el.tagName === 'A' &&
      (rect.height === 0 ||
        parseFloat(cs.fontSize) === 0 ||
        parseFloat(cs.opacity) === 0 ||
        cs.visibility === 'hidden' ||
        cs.color === 'transparent' ||
        cs.color === 'rgba(0, 0, 0, 0)');

    if (isBelowFooter && (hasSlateBg || isMobiriseLink || el.closest('section.display-7'))) {
      if (hasSlateBg || el.matches('section.display-7, section.display-7 > div')) {
        el.style.setProperty('background-color', footerBg, 'important');
        el.style.setProperty('background', footerBg, 'important');
      }
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('pointer-events', 'auto', 'important');
      if (el.tagName === 'A' || el.closest('a')) {
        const anchor = el.tagName === 'A' ? el : el.closest('a');
        anchor.style.setProperty('color', '#cbd5e1', 'important');
        anchor.style.setProperty('font-size', '0.875rem', 'important');
        anchor.style.setProperty('display', 'inline-block', 'important');
      }
    }
  });
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

window.addEventListener('load', () => {
  applyFooterBackgroundToDisplay7();
  const observer = new MutationObserver(() => {
    applyFooterBackgroundToDisplay7();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
});
