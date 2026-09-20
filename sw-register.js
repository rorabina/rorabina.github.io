// 1. Basic Theme Color
(function initTheme() {
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', '#000000');
})();

// 2. Mobirise & Bootstrap Dropdown Patch
(function fixBootstrapDropdowns() {
  function patchDropdownAttributes() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
      if (!toggle.getAttribute('data-toggle')) {
        toggle.setAttribute('data-toggle', 'dropdown');
      }
      if (!toggle.getAttribute('data-bs-toggle')) {
        toggle.setAttribute('data-bs-toggle', 'dropdown');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchDropdownAttributes);
  } else {
    patchDropdownAttributes();
  }
})();

// 3. Live Clocks (NUL2 Clock & NUL3 Countdown)
(function startSiteUtilities() {
  function updateNul2Clock() {
    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }) + ' PST';

    const nul2Elements = document.querySelectorAll('.NUL2, #NUL2, .nul2, #nul2, .pst-live-clock, .pst-clock, #pst-clock, [data-pst-clock]');
    nul2Elements.forEach(el => {
      el.textContent = nowPST;
    });
  }

  function updateNul3Countdown() {
    const targetDate = new Date('2028-03-01T10:00:00+08:00').getTime();
    const now = new Date().getTime();
    const diff = targetDate - now;

    let countdownText = 'Event Launched!';
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    const attrElements = document.querySelectorAll('.NUL3, #NUL3, .nul3, #nul3, [data-nul3]');
    attrElements.forEach(el => {
      el.textContent = countdownText;
    });

    const elementsToScan = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, strong, b');
    elementsToScan.forEach(el => {
      if (el.children.length === 0 && (el.textContent.trim() === 'NUL3' || el.hasAttribute('data-is-nul3'))) {
        el.setAttribute('data-is-nul3', 'true');
        el.textContent = countdownText;
      }
    });
  }

  function runTick() {
    updateNul2Clock();
    updateNul3Countdown();
  }

  runTick();
  setInterval(runTick, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTick);
  }
})();

// 4. Guaranteed Offline Precache Progress Bar Tracker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Utility to get or auto-create progress bar UI elements
    function getProgressBarElements() {
      let bar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress]');
      let container = document.querySelector('.cache-progress-container, #cache-progress-container');

      // Auto-inject progress bar at top of screen if missing from HTML
      if (!bar || !container) {
        let dynamicContainer = document.getElementById('pwa-cache-progress-container');
        if (!dynamicContainer) {
          dynamicContainer = document.createElement('div');
          dynamicContainer.id = 'pwa-cache-progress-container';
          dynamicContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 5px; background: rgba(255,255,255,0.1); z-index: 99999; display: none;';
          
          const dynamicBar = document.createElement('div');
          dynamicBar.id = 'pwa-cache-progress-bar';
          dynamicBar.style.cssText = 'width: 0%; height: 100%; background: #00d2ff; transition: width 0.3s ease;';
          
          dynamicContainer.appendChild(dynamicBar);
          document.body.appendChild(dynamicContainer);
        }
        container = dynamicContainer;
        bar = document.getElementById('pwa-cache-progress-bar');
      }

      return { bar, container };
    }

    function setProgress(percent) {
      const { bar, container } = getProgressBarElements();
      if (container) container.style.setProperty('display', 'block', 'important');
      if (bar) bar.style.setProperty('width', percent + '%', 'important');

      if (percent >= 100) {
        setTimeout(() => {
          if (container) container.style.setProperty('display', 'none', 'important');
        }, 1800);
      }
    }

    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      reg.update();

      // Track ongoing installation immediately
      if (reg.installing) {
        trackWorker(reg.installing);
      }

      reg.addEventListener('updatefound', () => {
        if (reg.installing) {
          trackWorker(reg.installing);
        }
      });
    }).catch(err => console.error('SW Registration Failed:', err));

    function trackWorker(worker) {
      setProgress(25);

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installing') {
          setProgress(60);
        } else if (worker.state === 'installed') {
          setProgress(100);
        }
      });
    }

    // Direct listener for Workbox or sw.js progress postMessages
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CACHE_PROGRESS') {
        setProgress(event.data.percent || 50);
      }
    });
  });
}
