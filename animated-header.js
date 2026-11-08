/**
 * Rorabina Precision Animated Header Script
 * - Scoped exclusively to the homepage hero title.
 * - Forces true vertical and horizontal centering inside the hero box.
 * - Animates ONLY newly added words/chunks while keeping previous text solid.
 * - Full crossfade transition only between sentence loops.
 */
document.addEventListener("DOMContentLoaded", function () {
    // Ensure this only runs on the homepage
    const path = window.location.pathname;
    if (!path.endsWith('index.html') && path !== '/' && path !== '') return;

    // Target ONLY the top hero section's title to avoid affecting other sections
    const heroSection = document.querySelector('section.header1, section[id*="header"], .mbr-section--hero, section:first-of-type');
    const headerElement = heroSection ? heroSection.querySelector(".mbr-section-title") : document.querySelector(".mbr-section-title");
    if (!headerElement) return;

    // Apply 4rem styling and smooth transition properties
    headerElement.style.fontSize = "4rem";
    headerElement.style.lineHeight = "1.25";
    headerElement.style.textAlign = "center";
    headerElement.style.width = "100%";
    headerElement.style.display = "block";
    headerElement.style.transition = "opacity 0.5s ease-in-out";

    // Force true container-level centering (vertical & horizontal) inside the Mobirise box
    const targetContainer = headerElement.closest('.container, .row, .mbr-table-cell, div');
    if (targetContainer) {
        targetContainer.style.textAlign = "center";
        targetContainer.style.display = "flex";
        targetContainer.style.flexDirection = "column";
        targetContainer.style.justifyContent = "center";
        targetContainer.style.alignItems = "center";
        targetContainer.style.width = "100%";
    }

    // Responsive mobile font adjustment
    if (window.innerWidth <= 768) {
        headerElement.style.fontSize = "2.5rem";
    }

    // Inject smooth fade-in keyframes for newly added words only
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

    const sentence1 = [
        { text: "A central space", bold: true },
        { text: " for ideas", bold: false },
        { text: ", media", bold: false },
        { text: ", and projects.", bold: false }
    ];

    const sentence2 = [
        { text: "Exploring design", bold: false },
        { text: ", technology", bold: false },
        { text: ", and the big picture.", bold: false }
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
            // Append next chunk with only the new word fading in
            headerElement.innerHTML = renderSentenceWithGranularFade(activeSentence, currentChunkIndex);
            currentChunkIndex++;
            setTimeout(runAnimation, 1400); // Timing between chunks
        } else {
            // Full sentence completed: hold on screen, then crossfade entire header to next sentence
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
                }, 500); // Fade duration
            }, 4500); // Hold time for full sentence
        }
    }

    // Initialize starting state
    headerElement.innerHTML = sentence1[0].bold ? `<span style="font-weight: bold;">${sentence1[0].text}</span>` : sentence1[0].text;
    headerElement.style.opacity = "1";
    currentChunkIndex = 1;
    setTimeout(runAnimation, 1400);
});
