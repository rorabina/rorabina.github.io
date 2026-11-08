/**
 * Rorabina Precision Animated Header Script
 * - Targets exclusively the homepage hero section title.
 * - Restores natural Mobirise layout flow so the title and timestamp align correctly together.
 * - Applies 4.0 font size ONLY to the hero title, leaving all other site titles at 2.5.
 * - Animates newly added words with granular fade while keeping previous text solid.
 * - Full block crossfade transition only between sentence loops.
 */
document.addEventListener("DOMContentLoaded", function () {
    // Strict homepage check
    const path = window.location.pathname;
    if (!path.endsWith('index.html') && path !== '/' && path !== '') return;

    // Target the main header title directly
    const headerElement = document.querySelector(".mbr-section-title");
    if (!headerElement) return;

    // Apply 4rem size and centering cleanly without breaking parent container layout
    headerElement.style.cssText = `
        font-size: 4rem !important;
        line-height: 1.25 !important;
        text-align: center !important;
        width: 100% !important;
        display: block !important;
        margin: 0 auto 15px auto !important;
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
