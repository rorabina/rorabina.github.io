/**
 * Rorabina Precision Animated Header Script
 * - Scoped exclusively to the homepage hero section.
 * - Dismantles Mobirise bottom-alignment and forces TRUE vertical & horizontal centering.
 * - Applies 4.0 font size ONLY to the hero title, leaving all other site titles at 2.5.
 * - Animates newly added words with granular fade while keeping previous text solid.
 * - Full block crossfade transition only between sentence loops.
 */
document.addEventListener("DOMContentLoaded", function () {
    // Strict homepage check
    const path = window.location.pathname;
    if (!path.endsWith('index.html') && path !== '/' && path !== '') return;

    // Target ONLY the top hero section (first section of the homepage)
    const heroSection = document.querySelector('section:first-of-type');
    if (!heroSection) return;

    // Force heroSection to break bottom positioning and center vertically & horizontally
    heroSection.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        min-height: 80vh !important;
        position: relative !important;
    `;

    // Strip or override internal Mobirise wrappers that enforce bottom/table alignment
    const allWrappers = heroSection.querySelectorAll('div, .container, .row, .mbr-table, .mbr-table-cell, .mbr-box, .mbr-section__container');
    allWrappers.forEach(el => {
        el.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            vertical-align: middle !important;
            position: static !important;
            width: 100% !important;
            float: none !important;
        `;
    });

    const headerElement = heroSection.querySelector('.mbr-section-title, h1, h2, .display-2');
    if (!headerElement) return;

    // Apply 4rem size, centering, and smooth transition properties exclusively to the hero title
    headerElement.style.cssText = `
        font-size: 4rem !important;
        line-height: 1.25 !important;
        text-align: center !important;
        width: 100% !important;
        display: block !important;
        margin: 0 auto !important;
        transition: opacity 0.5s ease-in-out !important;
    `;

    // Responsive mobile font adjustment
    if (window.innerWidth <= 768) {
        headerElement.style.fontSize = "2.5rem !important";
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

    // Initialize starting state immediately
    currentSentenceIndex = 0;
    currentChunkIndex = 0;
    headerElement.style.opacity = "1";
    runAnimation();
});
