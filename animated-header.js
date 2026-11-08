/**
 * Rorabina Scoped Animated Header Script
 * Applies 4rem styling, centering, and fluid crossfade exclusively to the homepage hero title.
 */
document.addEventListener("DOMContentLoaded", function () {
    // Only run on the homepage
    const path = window.location.pathname;
    if (!path.endsWith('index.html') && path !== '/' && path !== '') return;

    // Target specifically the homepage hero title
    const headerElement = document.querySelector(".mbr-section-title");
    if (!headerElement) return;

    // Apply styles directly and exclusively to this hero element
    headerElement.style.fontSize = "4rem";
    headerElement.style.lineHeight = "1.25";
    headerElement.style.textAlign = "center";
    headerElement.style.width = "100%";
    headerElement.style.transition = "opacity 0.4s ease-in-out";

    // Responsive mobile adjustment
    if (window.innerWidth <= 768) {
        headerElement.style.fontSize = "2.5rem";
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
            headerElement.style.opacity = "0.3";
            setTimeout(() => {
                headerElement.innerHTML = renderSentence(activeSentence, currentChunkIndex);
                headerElement.style.opacity = "1";
                currentChunkIndex++;
                setTimeout(runAnimation, 1400);
            }, 250);
        } else {
            setTimeout(() => {
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

    headerElement.innerHTML = renderSentence(sentence1, 0);
    headerElement.style.opacity = "1";
    currentChunkIndex = 1;
    setTimeout(runAnimation, 1400);
});
