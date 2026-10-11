(function() {
    'use strict';

    // 1. Ensure viewport-fit=cover is present for edge-to-edge / status bar extension
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
    }
    
    const desiredViewport = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    if (viewportMeta.content !== desiredViewport) {
        viewportMeta.content = desiredViewport;
    }

    // 2. Inject dynamic safe-area and full-screen UI handling styles
    const styleId = 'mobirise-pwa-fullscreen-fix';
    let styleTag = document.getElementById(styleId);
    
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
        /* Allow the app to bleed behind Android status and navigation bars */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
            box-sizing: border-box;
        }

        /* Pad top navigation elements so content doesn't crash into the status bar */
        body > section:first-of-type, 
        .cid-nav, 
        nav.navbar, 
        .navbar-fixed-top {
            padding-top: env(safe-area-inset-top, 0px) !important;
        }

        /* Ensure bottom fixed footers clear the gesture/navigation bar */
        .mbr-section-footer, 
        footer, 
        .cid-footer {
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
        }
    `;

    console.log("PWA Edge-to-Edge & Status Bar UI injection applied successfully.");
})();
