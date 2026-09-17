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

// 4. Retain PWA Active Route Across Android Background Resumes
(function managePwaState() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.matchMedia('(display-mode: fullscreen)').matches || 
                       window.navigator.standalone;
  if (!isStandalone) return;

  function getCleanPath(urlStr) {
    try {
      if (!urlStr || urlStr === '#' || urlStr.startsWith('javascript:')) {
        return window.location.pathname;
      }
      const url = new URL(urlStr, window.location.href);
      return url.pathname;
    } catch (e) {
      return window.location.pathname;
    }
  }

  function saveCurrentState() {
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    
    localStorage.setItem('pwa_active_path', currentPath);
    localStorage.setItem('pwa_scroll_pos', y);
  }

  function restoreCurrentState() {
    const savedPath = localStorage.getItem('pwa_active_path');
    const savedScroll = localStorage.getItem('pwa_scroll_pos');

    // Only redirect if app restarted on index/root while user was active on a subpage
    if (savedPath && savedPath !== window.location.pathname + window.location.search + window.location.hash) {
      const isCurrentRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
      if (isCurrentRoot && !sessionStorage.getItem('pwa_explicit_home')) {
        window.location.replace(savedPath);
        return;
      }
    }

    if (savedScroll) {
      const targetY = parseInt(savedScroll, 10);
      if (!isNaN(targetY) && targetY > 0) {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      }
    }
  }

  window.addEventListener('scroll', saveCurrentState, { passive: true });
  window.addEventListener('pagehide', saveCurrentState);
  window.addEventListener('freeze', saveCurrentState);
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveCurrentState();
    } else if (document.visibilityState === 'visible') {
      restoreCurrentState();
    }
  });

  if (document.readyState === 'complete') {
    restoreCurrentState();
  } else {
    window.addEventListener('load', restoreCurrentState);
  }
})();

// 5. Watermark Cleaner & Live Clock
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

  removeWatermarks();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeWatermarks);
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
