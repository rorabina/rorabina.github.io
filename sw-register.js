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

// 3. Watermark Cleaner & Live Clock (Rabina Standard Time)
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

    // Target live clock elements across pages
    document.querySelectorAll('.pst-live-clock, .pst-clock, #pst-clock, [data-pst-clock]').forEach(clock => {
      clock.textContent = nowPST;
    });
  }

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock);
  }
})();

// 4. Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      reg.update();
    }).catch(err => console.error('SW Registration Failed:', err));
  });
}
