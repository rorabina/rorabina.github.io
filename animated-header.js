/**
 * Rorabina Precision Animated Header Script
 * - Leaves the animated title at its default font size.
 * - Centers the animated title vertically and horizontally.
 * - Pins the smaller text/timestamp independently to the bottom.
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

    // Inject clean CSS for true flex-based vertical centering and bottom text placement
    if (!document.getElementById("rorabina-layout-fix-style")) {
        const style = document.createElement("style");
        style.id = "rorabina-layout-fix-style";
        style.innerHTML = `
            /* Transform hero section into a clean vertical flex container */
            section:first-of-type {
                position: relative !important;
                min-height: 100vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
                box-sizing: border-box !important;
                padding: 40px 20px !important;
            }

            /* Flatten Mobirise table cell constraints that force bottom alignment */
            section:first-of-type .mbr-table,
            section:first-of-type .mbr-table-cell {
                display: contents !important;
            }

            /* Inner wrapper container */
            section:first-of-type .container,
            section:first-of-type .row,
            section:first-of-type .mbr-box,
            section:first-of-type .mbr-section__container {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                width: 100% !important;
                max-width: 1200px !important;
                margin: 0 auto !important;
            }

            /* Animated title: centered, default font size, smooth opacity transition */
            section:first-of-type .mbr-section-title {
                text-align: center !important;
                margin: auto auto !important;
                width: 100% !important;
                transition: opacity 0.5s ease-in-out !important;
            }

            /* Bottom text / timestamp: pushed cleanly to the bottom */
            section:first-of-type .mbr-section-text,
            section:first-of-type .site-last-updated,
            section:first-of-type div:has(.site-last-updated) {
                margin-top: auto !important;
                margin-bottom: 10px !important;
                text-align: center !important;
                width: 100% !important;
            }

            /* Granular word fade animation */
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
