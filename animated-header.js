/**
 * Rorabina Precision Animated Header Script
 * - Leaves Title 2 completely untouched at its Mobirise-configured position and default font size.
 * - Preserves HTML positioning/alignment on the timestamp element while restoring the bottom offset.
 * - Isolates the timestamp block from dynamic height/line changes in the animated hero title.
 * - Preserves dynamic date/time content managed by external scripts.
 * - Granular word fade animation with full crossfade between sentence loops.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Strict homepage check
  const path = window.location.pathname;
  if (!path.endsWith('index.html') && path !== '/' && path !== '') return;

  // Target the main header title
  const headerElement = document.querySelector(".mbr-section-title");
  if (!headerElement) return;

  const heroSection = headerElement.closest('section');
  if (!heroSection) return;

  // Anchor heroSection so bottom-offset positioning stays isolated from title changes
  if (window.getComputedStyle(heroSection).position === 'static') {
    heroSection.style.position = 'relative';
  }

  // Inject CSS solely for the granular word fade animation
  if (!document.getElementById("rorabina-word-fade-style")) {
    const style = document.createElement("style");
    style.id = "rorabina-word-fade-style";
    style.innerHTML = `
      @keyframes fadeInNewWord {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rorabina-new-word {
        display: inline-block;
        animation: fadeInNewWord 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Restore slight bottom positioning while respecting HTML alignment and isolating from title shifts
  function applyBottomOffset() {
    const allElements = heroSection.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.textContent && (el.textContent.includes('Site Last Updated') || el.textContent.includes('Rabina Standard Time'))) {
        if (!el.classList.contains('mbr-section-title') && !el.contains(headerElement) && !headerElement.contains(el)) {
          let targetBlock = el.closest('p') || el.closest('div') || el;
          if (!targetBlock.contains(headerElement)) {
            const computed = window.getComputedStyle(targetBlock);
            const currentRect = targetBlock.getBoundingClientRect();
            const heroRect = heroSection.getBoundingClientRect();

            // Preserve right/HTML alignment without forcing center/left/transform overrides
            if (computed.position !== 'absolute' && computed.position !== 'fixed') {
              const currentRightOffset = Math.max(0, Math.round(heroRect.right - currentRect.right));
              targetBlock.style.setProperty('position', 'absolute', 'important');
              targetBlock.style.setProperty('right', `${currentRightOffset}px`, 'important');
              targetBlock.style.setProperty('left', 'auto', 'important');
              targetBlock.style.setProperty('transform', 'none', 'important');
              targetBlock.style.setProperty('margin', '0', 'important');
            }

            // Restore the slightly-toward-the-bottom offset
            targetBlock.style.setProperty('bottom', '60px', 'important');
            targetBlock.style.setProperty('top', 'auto', 'important');
            targetBlock.style.setProperty('z-index', '5', 'important');
          }
        }
      }
    });
  }

  window.addEventListener('load', function () {
    applyBottomOffset();
    requestAnimationFrame(applyBottomOffset);
  });

  window.addEventListener('resize', applyBottomOffset);

  const sentence1 = [
    { text: "A central space for ideas, ", bold: true },
    { text: "media, ", bold: false },
    { text: "and projects.", bold: false }
  ];

  const sentence2 = [
    { text: "Exploring design, ", bold: true },
    { text: "technology, ", bold: false },
    { text: "and the big picture.", bold: false }
  ];

  let currentSentenceIndex = 0;
  let currentChunkIndex = 0;

  function renderSentenceWithGranularFade(activeSentence, chunkIndex) {
    let html = "";
    for (let i = 0; i <= chunkIndex; i++) {
      let chunk = activeSentence[i];
      let textContent = chunk.bold ? `<span style="font-weight: bold;">${chunk.text}</span>` : chunk.text;
      // Apply fade animation ONLY to the newly added word/chunk; previous words stay solid
      if (i === chunkIndex && chunkIndex > 0) {
        html += `<span class="rorabina-new-word">${textContent}</span>`;
      } else {
        html += textContent;
      }
    }
    return html;
  }

  function runAnimation() {
    const activeSentence = currentSentenceIndex === 0 ? sentence1 : sentence2;
    if (currentChunkIndex < activeSentence.length) {
      headerElement.innerHTML = renderSentenceWithGranularFade(activeSentence, currentChunkIndex);
      currentChunkIndex++;
      setTimeout(runAnimation, 1400);
    } else {
      setTimeout(() => {
        headerElement.style.opacity = "0"; // Full block fade out
        setTimeout(() => {
          currentChunkIndex = 0;
          currentSentenceIndex = currentSentenceIndex === 0 ? 1 : 0;
          const nextSentence = currentSentenceIndex === 0 ? sentence1 : sentence2;
          headerElement.innerHTML = nextSentence[0].bold ? `<span style="font-weight: bold;">${nextSentence[0].text}</span>` : nextSentence[0].text;
          headerElement.style.opacity = "1"; // Full block fade in
          currentChunkIndex = 1;
          setTimeout(runAnimation, 1400);
        }, 500);
      }, 4500);
    }
  }

  // Initialize starting state immediately
  currentSentenceIndex = 0;
  currentChunkIndex = 0;
  headerElement.style.opacity = "1";
  runAnimation();
});
