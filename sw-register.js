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

// 3. Footer Branding Stylist & Live Clocks (NUL2 & NUL3 Countdown)
(function startSiteUtilities() {
  // Retains Mobirise branding link while matching black site aesthetic
  function styleMobiriseFooter() {
    const mobiriseLinks = document.querySelectorAll('a[href*="mobirise.com"], a[href*="mobiri.se"]');
    mobiriseLinks.forEach(link => {
      link.style.setProperty('color', '#cccccc', 'important');
      link.style.setProperty('text-decoration', 'underline', 'important');
      link.style.setProperty('opacity', '1', 'important');
      link.style.setProperty('visibility', 'visible', 'important');

      if (link.parentElement) {
        link.parentElement.style.setProperty('background-color', '#000000', 'important');
      }
    });

    const footers = document.querySelectorAll('footer, .cid-footer, .mbr-footer');
    footers.forEach(footer => {
      footer.style.setProperty('background-color', '#000000', 'important');
    });
  }

  // Updates NUL2 Live Clock (UTC+8 / Rabina Standard Time)
  function updateNul2Clock() {
    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }) + ' PST';

    // Targets classes, IDs, or elements containing plain text NUL2
    const nul2Elements = document.querySelectorAll('.NUL2, #NUL2, .nul2, #nul2, .pst-live-clock, .pst-clock, #pst-clock, [data-pst-clock]');
    nul2Elements.forEach(el => {
      el.textContent = nowPST;
    });
  }

  // Updates NUL3 Countdown Clock (Target: March 1, 2028, 10:00 AM UTC+8)
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

    // 1. Target elements with explicit ID/Class/Data attributes
    const attrElements = document.querySelectorAll('.NUL3, #NUL3, .nul3, #nul3, [data-nul3]');
    attrElements.forEach(el => {
      el.textContent = countdownText;
    });

    // 2. Scan DOM for plain text "NUL3" inside headings/paragraphs and swap text dynamically
    const elementsToScan = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, strong, b');
    elementsToScan.forEach(el => {
      if (el.children.length === 0 && (el.textContent.trim() === 'NUL3' || el.hasAttribute('data-is-nul3'))) {
        el.setAttribute('data-is-nul3', 'true');
        el.textContent = countdownText;
      }
    });
  }

  function runTick() {
    styleMobiriseFooter();
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

      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        const progressBar = document.querySelector('.cache-progress-bar, #cache-progress, [data-cache-progress]');
        const progressContainer = document.querySelector('.cache-progress-container, #cache-progress-container');

        if (progressContainer) progressContainer.style.display = 'block';

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installing') {
            if (progressBar) progressBar.style.width = '50%';
          } else if (installingWorker.state === 'installed') {
            if (progressBar) progressBar.style.width = '100%';
            setTimeout(() => {
              if (progressContainer) progressContainer.style.display = 'none';
            }, 2000);
          }
        });
      });
    }).catch(err => console.error('SW Registration Failed:', err));

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
