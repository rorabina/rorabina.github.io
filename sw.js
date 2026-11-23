const CACHE_NAME = 'rorabina-pwa-v1';
const META_CACHE = 'rorabina-pwa-meta';
const TOTAL_CACHE_BYTES = 0;
const ASSET_MANIFEST = {
  "/": 0,
  "/index.html": 0
};

let isDownloading = false;

async function getOptInState() {
  try {
    const meta = await caches.open(META_CACHE);
    const res = await meta.match('/opt-in-state');
    if (!res) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function setOptInState(state) {
  const meta = await caches.open(META_CACHE);
  await meta.put(
    '/opt-in-state',
    new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function broadcastToClients(payload) {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage(payload);
  }
}

async function computeCurrentProgress() {
  const cache = await caches.open(CACHE_NAME);
  const urls = Object.keys(ASSET_MANIFEST);
  let downloadedBytes = 0;
  let cachedCount = 0;

  for (const url of urls) {
    const match = await cache.match(url);
    if (match) {
      cachedCount++;
      downloadedBytes += ASSET_MANIFEST[url] || 0;
    }
  }

  return {
    downloadedBytes,
    totalBytes: TOTAL_CACHE_BYTES,
    cachedCount,
    totalCount: urls.length,
    complete: cachedCount >= urls.length && urls.length > 0
  };
}

async function runOfflineDownload() {
  if (isDownloading) return;
  isDownloading = true;

  try {
    await setOptInState({ optedIn: true, cacheName: CACHE_NAME });
    const cache = await caches.open(CACHE_NAME);
    const urls = Object.keys(ASSET_MANIFEST);
    let downloadedBytes = 0;
    let cachedCount = 0;

    // Tally already cached files first
    const pendingUrls = [];
    for (const url of urls) {
      const existing = await cache.match(url);
      if (existing) {
        cachedCount++;
        downloadedBytes += ASSET_MANIFEST[url] || 0;
      } else {
        pendingUrls.push(url);
      }
    }

    await broadcastToClients({
      type: 'CACHE_PROGRESS',
      downloadedBytes,
      totalBytes: TOTAL_CACHE_BYTES,
      cachedCount,
      totalCount: urls.length
    });

    for (const url of pendingUrls) {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      const clone = response.clone();
      await cache.put(url, clone);

      const expectedSize = ASSET_MANIFEST[url] || 0;
      if (expectedSize > 0) {
        downloadedBytes += expectedSize;
      } else {
        const buf = await response.arrayBuffer();
        downloadedBytes += buf.byteLength;
      }
      cachedCount++;

      await broadcastToClients({
        type: 'CACHE_PROGRESS',
        downloadedBytes,
        totalBytes: Math.max(TOTAL_CACHE_BYTES, downloadedBytes),
        cachedCount,
        totalCount: urls.length
      });
    }

    await broadcastToClients({
      type: 'CACHE_COMPLETE',
      downloadedBytes: Math.max(TOTAL_CACHE_BYTES, downloadedBytes),
      totalBytes: Math.max(TOTAL_CACHE_BYTES, downloadedBytes)
    });
  } catch (err) {
    await broadcastToClients({
      type: 'CACHE_ERROR',
      message: err.message || 'Download interrupted'
    });
  } finally {
    isDownloading = false;
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const state = await getOptInState();
      // Only auto-update silently if the user previously opted in
      if (state && state.optedIn) {
        await runOfflineDownload();
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== META_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const state = await getOptInState();
        const progress = await computeCurrentProgress();
        await broadcastToClients({
          type: 'CACHE_STATUS',
          optedIn: Boolean(state && state.optedIn),
          isDownloading,
          ...progress
        });
      })()
    );
  } else if (data.type === 'START_OFFLINE_CACHE') {
    event.waitUntil(runOfflineDownload());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        return await fetch(event.request);
      } catch (err) {
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
