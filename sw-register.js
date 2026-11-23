(function () {
  if (!('serviceWorker' in navigator)) return;

  const DISMISS_KEY = 'rorabina_offline_prompt_minimized';

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0.00 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }

  function injectStyles() {
    if (document.getElementById('rorabina-pwa-styles')) return;
    const style = document.createElement('style');
    style.id = 'rorabina-pwa-styles';
    style.textContent = `
      #rorabina-pwa-ui {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 99999;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        color: #f5f5f7;
      }
      .rpwa-card {
        background: rgba(20, 20, 24, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        padding: 14px 16px;
        width: min(320px, calc(100vw - 32px));
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        font-size: 13px;
        line-height: 1.45;
      }
      .rpwa-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #ffffff;
      }
      .rpwa-desc {
        color: rgba(255, 255, 255, 0.78);
        margin-bottom: 12px;
      }
      .rpwa-size-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 6px;
        font-variant-numeric: tabular-nums;
      }
      .rpwa-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .rpwa-btn {
        border: none;
        border-radius: 8px;
        padding: 7px 14px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s ease, transform 0.1s ease;
      }
      .rpwa-btn:active { transform: scale(0.97); }
      .rpwa-btn-no {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }
      .rpwa-btn-no:hover { background: rgba(255, 255, 255, 0.18); }
      .rpwa-btn-yes {
        background: #ffffff;
        color: #111111;
      }
      .rpwa-btn-yes:hover { opacity: 0.9; }
      .rpwa-progress-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        overflow: hidden;
        margin: 8px 0 6px;
      }
      .rpwa-progress-fill {
        height: 100%;
        width: 0%;
        background: #4ade80;
        transition: width 0.2s ease;
      }
      .rpwa-stats {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.72);
        font-variant-numeric: tabular-nums;
      }
      .rpwa-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: rgba(20, 20, 24, 0.9);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        padding: 8px 13px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      }
      .rpwa-pill:hover {
        background: rgba(34, 34, 40, 0.96);
      }
      .rpwa-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #38bdf8;
      }
    `;
    document.head.appendChild(style);
  }

  function getContainer() {
    injectStyles();
    let el = document.getElementById('rorabina-pwa-ui');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rorabina-pwa-ui';
      document.body.appendChild(el);
    }
    return el;
  }

  function renderMinimizedPill(totalBytes, onExpand) {
    const container = getContainer();
    const sizeText = totalBytes > 0 ? ` (${formatBytes(totalBytes)})` : '';
    container.innerHTML = `
      <button type="button" class="rpwa-pill" aria-label="Open offline download prompt">
        <span class="rpwa-dot"></span>
        <span>Save Offline${sizeText}</span>
      </button>
    `;
    container.querySelector('.rpwa-pill').addEventListener('click', () => {
      try { sessionStorage.removeItem(DISMISS_KEY); } catch (_) {}
      onExpand();
    });
  }

  function renderOptInPrompt(totalBytes, onYes, onNo) {
    const container = getContainer();
    const remainingText = totalBytes > 0 ? formatBytes(totalBytes) : 'calculating...';
    container.innerHTML = `
      <div class="rpwa-card" role="region" aria-label="Offline Caching">
        <div class="rpwa-title">Download for Offline Access?</div>
        <div class="rpwa-desc">
          Save this site to your device for offline viewing.
          Estimated data: <span class="rpwa-size-badge">${remainingText}</span>
        </div>
        <div class="rpwa-actions">
          <button type="button" class="rpwa-btn rpwa-btn-no">No</button>
          <button type="button" class="rpwa-btn rpwa-btn-yes">Yes, Download</button>
        </div>
      </div>
    `;
    container.querySelector('.rpwa-btn-no').addEventListener('click', onNo);
    container.querySelector('.rpwa-btn-yes').addEventListener('click', onYes);
  }

  function renderProgress(downloadedBytes, totalBytes) {
    const container = getContainer();
    const safeTotal = Math.max(totalBytes, downloadedBytes, 1);
    const remainingBytes = Math.max(0, safeTotal - downloadedBytes);
    const pct = Math.min(100, Math.round((downloadedBytes / safeTotal) * 100));

    container.innerHTML = `
      <div class="rpwa-card" role="status" aria-live="polite">
        <div class="rpwa-title">Downloading Offline Files…</div>
        <div class="rpwa-progress-bar">
          <div class="rpwa-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="rpwa-stats">
          <span>${formatBytes(downloadedBytes)} / ${formatBytes(safeTotal)}</span>
          <span>${formatBytes(remainingBytes)} left (${pct}%)</span>
        </div>
      </div>
    `;
  }

  function renderComplete(totalBytes) {
    const container = getContainer();
    container.innerHTML = `
      <div class="rpwa-card" role="status">
        <div class="rpwa-title">Offline Ready</div>
        <div class="rpwa-desc" style="margin-bottom: 0;">
          All files cached (<span class="rpwa-size-badge">${formatBytes(totalBytes)}</span>). Available offline anytime.
        </div>
      </div>
    `;
    setTimeout(() => {
      const el = document.getElementById('rorabina-pwa-ui');
      if (el) el.remove();
    }, 4500);
  }

  function renderError(message, onRetry, onMinimize) {
    const container = getContainer();
    container.innerHTML = `
      <div class="rpwa-card" role="alert">
        <div class="rpwa-title">Offline Download Paused</div>
        <div class="rpwa-desc">${message || 'Connection interrupted before completion.'}</div>
        <div class="rpwa-actions">
          <button type="button" class="rpwa-btn rpwa-btn-no">Minimize</button>
          <button type="button" class="rpwa-btn rpwa-btn-yes">Retry</button>
        </div>
      </div>
    `;
    container.querySelector('.rpwa-btn-no').addEventListener('click', onMinimize);
    container.querySelector('.rpwa-btn-yes').addEventListener('click', onRetry);
  }

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      const postToSw = (msg) => {
        const worker = reg.active || reg.waiting || reg.installing || navigator.serviceWorker.controller;
        if (worker) worker.postMessage(msg);
      };

      let latestTotalBytes = 0;

      const startDownload = () => {
        renderProgress(0, latestTotalBytes);
        postToSw({ type: 'START_OFFLINE_CACHE' });
      };

      const minimizePrompt = () => {
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
        renderMinimizedPill(latestTotalBytes, showPrompt);
      };

      const showPrompt = () => {
        renderOptInPrompt(latestTotalBytes, startDownload, minimizePrompt);
      };

      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.totalBytes) latestTotalBytes = data.totalBytes;

        if (data.type === 'CACHE_STATUS') {
          if (data.complete) return; // Already fully cached
          if (data.isDownloading || data.optedIn) {
            if (!data.isDownloading) {
              startDownload();
            } else {
              renderProgress(data.downloadedBytes || 0, latestTotalBytes);
            }
            return;
          }

          let wasMinimized = false;
          try { wasMinimized = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (_) {}
          if (wasMinimized) {
            renderMinimizedPill(latestTotalBytes, showPrompt);
          } else {
            showPrompt();
          }
        } else if (data.type === 'CACHE_PROGRESS') {
          renderProgress(data.downloadedBytes, data.totalBytes);
        } else if (data.type === 'CACHE_COMPLETE') {
          renderComplete(data.totalBytes);
        } else if (data.type === 'CACHE_ERROR') {
          renderError(data.message, startDownload, minimizePrompt);
        }
      });

      await navigator.serviceWorker.ready;
      postToSw({ type: 'GET_CACHE_STATUS' });
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
})();
