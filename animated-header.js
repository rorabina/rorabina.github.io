/**
 * Rorabina Precision Animated Header Script
 * - Neutralizes Mobirise table-cell bottom alignment to allow true vertical and horizontal centering.
 * - Pins the timestamp independently at the absolute bottom.
 * - Applies 4.0 font size ONLY to the homepage hero title, leaving all other site titles at 2.5.
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

    // Inject clean CSS to override Mobirise table-cell constraints and achieve true centering
    if (!document.getElementById("rorabina-layout-fix-style")) {
        const style = document.createElement("style");
        style.id = "rorabina-layout-fix-style";
        style.innerHTML = `
            /* Ensure hero section acts as a full-height positioning anchor */
            section:first-of-type {
                position: relative !important;
                min-height: 100vh !important;
                box-sizing: border-box !important;
            }

            /* Neutralize Mobirise table cell vertical alignment */
            section:first-of-type .mbr-table,
            section:first-of-type .mbr-table-cell {
                display: block !important;
                height: auto !important;
                vertical-align: baseline !important;
            }

            /* Dead-center positioning exclusively for the animated title */
            section:first-of-type .mbr-section-title {
                font-size: 4rem !important;
                line-height: 1.25 !important;
                text-align: center !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 90% !important;
                max-width: 1100px !important;
                margin: 0 !important;
                z-index: 5 !important;
                transition: opacity 0.5s ease-in-out !important;
            }

            /* Pin the timestamp container independently to the bottom */
            section:first-of-type .site-last-updated,
            section:first-of-type div:has(.site-last-updated),
            section:first-of-type .mbr-section__container:last-child {
                position: absolute !important;
                bottom: 25px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                width: 100% !important;
                text-align: center !important;
                z-index: 5 !important;
            }

            /* Responsive mobile adjustment */
            @media (max-width: 768px) {
                section:first-of-type .mbr-section-title {
                    font-size: 2.5rem !important;
                }
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
        { text: "A central space", bold: true },
        { text: " for ideas,", bold: false },
        { text: " media,", bold: false },
        { text: " and projects.", bold: false }
    ];

    const sentence2 = [
        { text: "Exploring design,", bold: false },
        { text: " technology,", bold: false },
        { text: " and the big picture.", bold: false }
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
