/**
 * Rorabina Fluid Animated Header Script
 * Features smooth crossfade transitions, centered alignment, and slower reading cadence.
 */
document.addEventListener("DOMContentLoaded", function () {
    const headerElement = document.querySelector(".mbr-section-title");
    if (!headerElement) return;

    // Ensure fluid opacity transitions and center alignment are applied
    headerElement.style.textAlign = "center";
    headerElement.style.transition = "opacity 0.4s ease-in-out";

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

    function renderSentence(activeSentence, chunkIndex) {
        let html = "";
        for (let i = 0; i <= chunkIndex; i++) {
            let chunk = activeSentence[i];
            if (chunk.bold) {
                html += `<span style="font-weight: bold;">${chunk.text}</span>`;
            } else {
                html += chunk.text;
            }
        }
        return html;
    }

    function runAnimation() {
        const activeSentence = currentSentenceIndex === 0 ? sentence1 : sentence2;

        if (currentChunkIndex < activeSentence.length) {
            // Fluid crossfade: dip opacity slightly before updating the chunk
            headerElement.style.opacity = "0.3";
            setTimeout(() => {
                headerElement.innerHTML = renderSentence(activeSentence, currentChunkIndex);
                headerElement.style.opacity = "1";
                currentChunkIndex++;
                // Slower timing (1400ms per step) for comfortable reading
                setTimeout(runAnimation, 1400);
            }, 250);
        } else {
            // Hold the fully completed sentence longer on screen (4500ms)
            setTimeout(() => {
                // Smooth fade out before switching to the next sentence
                headerElement.style.opacity = "0";
                setTimeout(() => {
                    currentChunkIndex = 0;
                    currentSentenceIndex = currentSentenceIndex === 0 ? 1 : 0;
                    headerElement.innerHTML = renderSentence(currentSentenceIndex === 0 ? sentence1 : sentence2, 0);
                    headerElement.style.opacity = "1";
                    setTimeout(runAnimation, 1400);
                }, 500);
            }, 4500);
        }
    }

    // Initialize first chunk and start loop
    headerElement.innerHTML = renderSentence(sentence1, 0);
    headerElement.style.opacity = "1";
    currentChunkIndex = 1;
    setTimeout(runAnimation, 1400);
});
