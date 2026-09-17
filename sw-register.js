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

// 3. Watermark Cleaner & Live Clock (Rabina Standard Time / NUL2)
(function startLivePstClock() {
  function removeWatermarks() {
    document.querySelectorAll('a[href*="mobirise.com"], a[href*="mobiri.se"]').forEach(el => {
      const parent = el.parentElement;
      el.remove();
      if (parent && parent.textContent.trim() === '') {
        parent.remove();
      }
    });
  }

  function updateLiveClock() {
    removeWatermarks();

    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }) + ' PST';

    // Target NUL2 alongside standard clock classes/IDs across all pages
    const clockElements = document.querySelectorAll(
      '.NUL2, #NUL2, .nul2, #nul2, .pst-live-clock, .pst-clock, #pst-clock, [data-pst-clock]'
    );

    clockElements.forEach(clock => {
      clock.textContent = nowPST;
    });
  }

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock);
  }
})();

// 4. Service Worker Registration with Precaching Progress Tracker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      
      // Force update check on page load
      reg.update();

      // Track installation progress
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        const progressBar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress]');
        const progressContainer = document.querySelector('.cache-progress-container, #cache-progress-container');

        if (progressContainer) progressContainer.style.display = 'block';

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installing') {
            console.log('Precaching assets for offline use...');
            if (progressBar) progressBar.style.width = '50%';
          } else if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New offline content available; please refresh.');
              if (progressBar) progressBar.style.width = '100%';
              setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
              }, 2000);
            } else {
              console.log('Content is cached for offline use.');
              if (progressBar) progressBar.style.width = '100%';
              setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
              }, 2000);
            }
          }
        });
      });
    }).catch(err => console.error('SW Registration Failed:', err));

    // Listen for progress messages sent from sw.js
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CACHE_PROGRESS') {
        const progressBar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress]');
        if (progressBar && event.data.percent) {
          progressBar.style.width = event.data.percent + '%';
        }
      }
    });
  });
}
