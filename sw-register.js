// 1. Dynamic Status Bar Theme Color & Edge-to-Edge Meta Setup
(function initThemeAndLayout() {
  function applyTheme() {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', '#000000');
  }

  applyTheme();

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.matchMedia('(display-mode: fullscreen)').matches || 
                       window.navigator.standalone;
                       
  if (isStandalone) {
    document.documentElement.style.setProperty('height', '100vh');
    document.documentElement.style.setProperty('overflow-x', 'hidden');
  }

  document.addEventListener('DOMContentLoaded', applyTheme);
})();

// 2. Mobirise & Bootstrap Dropdown Compatibility Patch
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

// 3. Disable Mobirise Animations & Force Edge-to-Edge Container Heights
(function applyEdgeToEdgeStyles() {
  const style = document.createElement('style');
  style.id = 'pwa-edge-to-edge';
  style.innerHTML = `
    html, body {
      scroll-behavior: auto !important;
      padding-top: 0 !important;
      margin-top: 0 !important;
      width: 100% !important;
      background-color: #000000 !important;
    }
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
    .navbar, 
    .navbar.fixed-top, 
    .navbar-dropdown,
    header {
      top: 0 !important;
      padding-top: env(safe-area-inset-top, 0px) !important;
      background-clip: padding-box;
    }
  `;
  document.head.appendChild(style);
})();

// 4. Preserve Active Route, Hydrate State & Retain Immersive Viewport
(function managePwaState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.matchMedia('(display-mode: fullscreen)').matches || 
                       window.navigator.standalone;
  if (!isStandalone) return;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function getCleanPath(urlStr) {
    try {
      if (!urlStr || urlStr === '#' || urlStr.startsWith('javascript:')) {
        return getCleanPath(window.location.href);
      }
      const url = new URL(urlStr, window.location.href);
      let path = url.pathname;
      if (path.endsWith('/')) path += 'index.html';
      const page = path.substring(path.lastIndexOf('/') + 1).split('?')[0].split('#')[0];
      return page === '' ? 'index.html' : page;
    } catch (e) {
      return 'index.html';
    }
  }

  function getScrollKey(page) {
    return 'pwa_scroll_' + page;
  }

  function saveCurrentScroll() {
    const current = getCleanPath(window.location.href);
    const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    localStorage.setItem('pwa_last_active_page', current);
    if (y >= 0) {
      localStorage.setItem(getScrollKey(current), y);
    }
  }

  function restoreScrollForPage(page) {
    const savedY = localStorage.getItem(getScrollKey(page));
    if (!savedY) return;

    const targetY = parseInt(savedY, 10);
    if (isNaN(targetY) || targetY <= 0) return;

    let attempts = 0;
    const maxAttempts = 15;

    function scrollLoop() {
      attempts++;
      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (docHeight < targetY + window.innerHeight && attempts < maxAttempts) {
        requestAnimationFrame(scrollLoop);
      }
    }

    scrollLoop();
  }

  window.addEventListener('scroll', () => {
    const current = getCleanPath(window.location.href);
    const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    localStorage.setItem(getScrollKey(current), y);
  }, { passive: true });

  window.addEventListener('pagehide', saveCurrentScroll);
  window.addEventListener('freeze', saveCurrentScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveCurrentScroll();
    } else if (document.visibilityState === 'visible') {
      const activeFile = getCleanPath(window.location.href);
      restoreScrollForPage(activeFile);
    }
  });

  const current = getCleanPath(window.location.href);
  if (document.readyState === 'complete') {
    restoreScrollForPage(current);
  } else {
    window.addEventListener('load', () => restoreScrollForPage(current));
  }
})();

// 5. Universal PST Live Clock Ticker & Watermark Cleaner
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

  function updatePstClocks() {
    removeWatermarks();

    const nowPST = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true
    }) + ' PST';

    // Target class, ID, and data attributes across all custom components
    const clockElements = document.querySelectorAll('.pst-live-clock, .pst-clock, #pst-clock, [data-pst-clock]');
    clockElements.forEach(clock => {
      clock.textContent = nowPST;
    });
  }

  updatePstClocks();
  setInterval(updatePstClocks, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePstClocks);
  }
})();

// 6. Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
      reg.update();
    }).catch(err => console.error('SW Registration Failed:', err));
  });
}
