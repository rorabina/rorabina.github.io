const fs = require('fs');

module.exports = function layoutProtections() {
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));
  
  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Force Disable Mobile Zooming (Viewport Lock)
    const zoomLockViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">';
    if (content.includes('<meta name="viewport"')) {
      content = content.replace(/<meta name="viewport"[^>]*>/i, zoomLockViewport);
    } else {
      content = content.replace(/<\/head>/i, `  ${zoomLockViewport}\n</head>`);
    }

    // 2. Inject Layout Protections, Copy Locks, & Precise Click-Shield Script
    if (!content.includes('/\* Layout Protections & Footer Styling \*/')) {
      const styleInject = `
      <style id="layout-protections">
        /* Footer & Mobirise Link Block Background Styling */
        section.cid-s48MC36cej, footer, .mbr-section, .mbr-footer, .engine, [class*="engine"] { 
          background-color: #0f172a !important; 
        }

        /* Natural styling for the link text */
        section.display-7 a, .engine a, [class*="engine"] a {
          color: #64748b !important;
          text-decoration: none !important;
          cursor: pointer !important;
        }

        section.display-7 a:hover, .engine a:hover, [class*="engine"] a:hover {
          color: #94a3b8 !important;
          text-decoration: underline !important;
        }

        /* Disable Selection & Touch Callouts for PWA */
        *, html, body { 
          -webkit-user-select: none !important; 
          -moz-user-select: none !important; 
          -ms-user-select: none !important; 
          user-select: none !important; 
          -webkit-touch-callout: none !important; 
          touch-action: manipulation; 
          -webkit-text-size-adjust: 100%; 
        }

        input, textarea { 
          -webkit-user-select: text !important; 
          -moz-user-select: text !important; 
          -ms-user-select: text !important; 
          user-select: text !important; 
        }
      </style>
      <script id="anti-zoom-and-copy-lock">
        document.addEventListener('touchmove', function (event) { 
          if (event.scale !== 1 && event.scale !== undefined) { 
            event.preventDefault(); 
          } 
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) { 
          const now = (new Date()).getTime(); 
          if (now - lastTouchEnd <= 300) { 
            event.preventDefault(); 
          } 
          lastTouchEnd = now; 
        }, false);

        document.addEventListener('copy', (e) => e.preventDefault());
        document.addEventListener('cut', (e) => e.preventDefault());
        document.addEventListener('paste', (e) => e.preventDefault());
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        /* Runtime Shield: Block clicks anywhere in section.display-7 unless on an anchor tag */
        document.addEventListener('click', function(event) {
          const display7 = event.target.closest('section.display-7');
          if (display7) {
            const anchor = event.target.closest('a');
            if (!anchor || !display7.contains(anchor)) {
              event.stopImmediatePropagation();
              event.preventDefault();
            }
          }
        }, true);
      </script>`;
      content = content.replace(/<\/head>/i, `${styleInject}\n</head>`);
    }

    fs.writeFileSync(file, content, 'utf8');
  });
  console.log('Layout protections updated: runtime click-shield script applied.');
};
