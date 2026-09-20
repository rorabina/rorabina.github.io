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

// 3. Live Utilities (NUL2 Clock & NUL3 Countdown Scanner)
(function startSiteUtilities() {
  // Updates NUL2 Live Clock (UTC+8 / Rabina Standard Time)
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

  // Scans website elements and updates "NUL3" plain text with live countdown
  function updateNul3Countdown() {
    // Target: March 1, 2028, 10:00:00 AM UTC+8 (+08:00 offset)
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

    // 1. Target elements with explicit NUL3 ID/Class/Data attributes
    const attrElements = document.querySelectorAll('.NUL3, #NUL3, .nul3, #nul3, [data-nul3]');
    attrElements.forEach(el => {
      el.textContent = countdownText;
    });

    // 2. Scan text elements across pages for plain text "NUL3"
    const candidateElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, strong, b, td, li');
    candidateElements.forEach(el => {
      // Only process leaf nodes (elements without child tags) to avoid disturbing layout
      if (el.children.length === 0) {
        if (el.textContent.trim() === 'NUL3' || el.hasAttribute('data-is-nul3')) {
          el.setAttribute('data-is-nul3', 'true');
          el.textContent = countdownText;
        }
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

// 4. Service Worker Registration & Precache Progress Tracker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      reg.update();

      if (reg.installing) {
        trackWorkerProgress(reg.installing);
      }

      reg.addEventListener('updatefound', () => {
        if (reg.installing) {
          trackWorkerProgress(reg.installing);
        }
      });
    }).catch(err => console.error('SW Registration Failed:', err));

    function trackWorkerProgress(worker) {
      const progressBar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress], .progress-bar');
      const progressContainer = document.querySelector('.cache-progress-container, #cache-progress-container, .progress');

      if (progressContainer) progressContainer.style.setProperty('display', 'block', 'important');

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installing') {
          if (progressBar) progressBar.style.width = '40%';
        } else if (worker.state === 'installed') {
          if (progressBar) progressBar.style.width = '100%';
          setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
          }, 2000);
        }
      });
    }

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CACHE_PROGRESS') {
        const progressBar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress], .progress-bar');
        const progressContainer = document.querySelector('.cache-progress-container, #cache-progress-container, .progress');
        if (progressContainer) progressContainer.style.setProperty('display', 'block', 'important');
        if (progressBar && event.data.percent) {
          progressBar.style.width = event.data.percent + '%';
        }
      }
    });
  });
}
