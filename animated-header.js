/**
 * Rorabina Precision Animated Header Script
 * - Leaves the animated title (title 2) untouched at its default Mobirise position and font size.
 * - Safely pins the smaller text/timestamp to the bottom once after full page load (no infinite loops).
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

    // Ensure hero section acts as a positioning anchor
    heroSection.style.position = 'relative';

    // Inject CSS for the granular word fade animation
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

    // Pin the timestamp to the bottom safely after window load (prevents infinite loops & freezing)
    window.addEventListener('load', function () {
        const allElements = heroSection.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.textContent && (el.textContent.includes('Site Last Updated') || el.textContent.includes('Rabina Standard Time'))) {
                let targetBlock = el.closest('.mbr-section__container, p, div') || el;
                targetBlock.style.cssText = `
                    position: absolute !important;
                    bottom: 30px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 100% !important;
                    text-align: center !important;
                    z-index: 5 !important;
                `;
            }
        });
    });

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
