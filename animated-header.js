/**
 * Rorabina Animated Header Script
 * Sequentially builds sentence 1 and sentence 2 in an infinite loop.
 * Operates independently without disrupting other page scripts.
 */
document.addEventListener("DOMContentLoaded", function () {
    // Target the main header title on the homepage
    const headerElement = document.querySelector(".mbr-section-title");
    if (!headerElement) return;

    // Define the sequence chunks for Sentence 1 and Sentence 2
    const sentence1 = [
        { text: "A central space ", bold: true },
        { text: "for ideas, ", bold: false },
        { text: "media, ", bold: false },
        { text: "and projects.", bold: false }
    ];

    const sentence2 = [
        { text: "Exploring design, ", bold: false },
        { text: "technology, ", bold: false },
        { text: "and the big picture.", bold: false }
    ];

    let currentSentenceIndex = 0;
    let currentChunkIndex = 0;

    function renderSentence() {
        const activeSentence = currentSentenceIndex === 0 ? sentence1 : sentence2;
        let html = "";
        for (let i = 0; i <= currentChunkIndex; i++) {
            let chunk = activeSentence[i];
            if (chunk.bold) {
                html += `<span style="font-weight: bold;">${chunk.text}</span>`;
            } else {
                html += chunk.text;
            }
        }
        headerElement.innerHTML = html;
    }

    function runAnimationLoop() {
        const activeSentence = currentSentenceIndex === 0 ? sentence1 : sentence2;

        if (currentChunkIndex < activeSentence.length) {
            renderSentence();
            currentChunkIndex++;
            setTimeout(runAnimationLoop, 700); // Speed of each chunk appearing (milliseconds)
        } else {
            // Pause when the sentence is fully complete before switching
            setTimeout(() => {
                currentChunkIndex = 0;
                currentSentenceIndex = currentSentenceIndex === 0 ? 1 : 0;
                runAnimationLoop();
            }, 3200); // Hold time on full sentence
        }
    }

    // Start the independent loop
    runAnimationLoop();
});
