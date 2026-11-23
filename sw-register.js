// 1. Preserve & Restore Last Visited Page in PWA Standalone Mode
(function managePwaState() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;
  if (!isStandalone) return;

  function isIndexPage(path) {
    return (
      path === '/' ||
      path === '' ||
      path.endsWith('/index.html') ||
      path.endsWith('index.html')
    );
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
    const homeLinks = document.querySelectorAll(
      'a[href="/"], a[href$="index.html"], .navbar-brand, a.nav-link[href*="index"]'
    );
    homeLinks.forEach((link) => {
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

// 2. Service Worker Opt-In Registration, Unified File Size Monitoring & Minimizable Prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const OPT_IN_KEY = 'pwa_offline_opt_in';
    const MINIMIZED_KEY = 'pwa_offline_minimized';
    const APP_TREE_API_URL =
      'https://api.github.com/repos/rorabina/app/git/trees/gh-pages?recursive=1';
    const APP_CACHE_NAME = 'rorabina-web-utilities-app';
    let barContainer = document.getElementById('pwa-cache-status');
    let checkInterval = null;
    let manualReloadPending = false;
    let manifestFiles = {};
    let manifestUrls = [];
    let totalBytes = 0;
    let baselineUsageBytes = 0;

    function normalizePath(pathname) {
      if (!pathname || pathname === '/') return '/index.html';
      return pathname.startsWith('/') ? pathname : '/' + pathname;
    }

    function formatSize(bytes) {
      if (!bytes || bytes <= 0) return '0.00 MB';
      const mb = bytes / (1024 * 1024);
      return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    async function getStorageUsageBytes() {
      try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
          const est = await navigator.storage.estimate();
          return Number(est.usage) || 0;
        }
      } catch (_) {}
      return 0;
    }

    function recalculateTotals() {
      manifestUrls = Object.keys(manifestFiles);
      totalBytes = Object.values(manifestFiles).reduce(
        (sum, val) => sum + (Number(val) || 0),
        0
      );
    }

    async function syncLiveAppFiles() {
      if (!navigator.onLine) return;
      try {
        const cacheKey = 'rorabina_app_tree_cache_v1';
        let items = null;

        try {
          const cachedRaw = sessionStorage.getItem(cacheKey);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (
              parsed &&
              Date.now() - parsed.ts < 10 * 60 * 1000 &&
              Array.isArray(parsed.items)
            ) {
              items = parsed.items;
            }
          }
        } catch (_) {}

        if (!items) {
          const res = await fetch(APP_TREE_API_URL, {
            headers: { Accept: 'application/vnd.github+json' }
          });
          if (!res.ok) return;
          const data = await res.json();
          const tree = Array.isArray(data?.tree) ? data.tree : [];

          items = tree
            .filter((entry) => {
              if (!entry || entry.type !== 'blob' || !entry.path) return false;
              const lower = entry.path.toLowerCase();
              return lower !== 'readme.md'
