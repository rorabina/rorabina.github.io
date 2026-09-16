// Service Worker Registration, Cache Progress, Timestamps, and Scoped Android PWA Trigger
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 1. Floating Cache Progress Bar UI
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

    // 2. Service Worker Registration
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
    }).catch(err => console.error('SW Registration Failed:', err));

    // 3. Monitor Offline Cache Progress
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

// 4. Dynamic Target Resolution for NUL1 & NUL2 inside Hero Block
function initHeroTimestamps() {
  // Clean dynamic Mobirise backlinks
  document.querySelectorAll('a[href*="mobirise.com"], a[href*="mobiri.se"]').forEach(el => el.remove());

  // TreeWalker search for NUL1 and NUL2 text nodes anywhere in the DOM
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const nodesToProcess = [];

  while (node = walker.nextNode()) {
    if (node.nodeValue.includes('NUL1') || node.nodeValue.includes('NUL2')) {
      nodesToProcess.push(node);
    }
  }

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formattedBuildDate = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }) + ` (${userTimezone})`;

  nodesToProcess.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;

    if (textNode.nodeValue.includes('NUL1')) {
      const span = document.createElement('span');
      span.id = 'site-last-updated';
      span.textContent = formattedBuildDate;
      parent.replaceChild(span, textNode);
    } else if (textNode.nodeValue.includes('NUL2')) {
      const span = document.createElement('span');
      span.id = 'pst-live-clock';
      span.textContent = 'Loading PST...';
      parent.replaceChild(span, textNode);
    }
  });

  // Ticking Rabina Standard Time Clock for NUL2
  function tickPST() {
    const clockEl = document.getElementById('pst-live-clock');
    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    });

    if (clockEl) {
      clockEl.textContent = nowPST + ' PST';
    }
  }

  tickPST();
  setInterval(tickPST, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroTimestamps);
} else {
  initHeroTimestamps();
}
