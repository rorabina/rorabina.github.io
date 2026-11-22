let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});

navigator.serviceWorker
  .register('/sw.js', { updateViaCache: 'none' })
  .then((reg) => {
    reg.update();

    const checkForUpdate = () => {
      if (navigator.onLine) {
        reg.update().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    });

    window.addEventListener('pageshow', checkForUpdate);
  })
  .catch((err) => console.error('SW Registration Failed:', err));
