// --- 1. CREATE AND INJECT THE UI ---
const panel = document.createElement('div');
panel.id = 'summary-panel';
panel.innerHTML = `
  <h2>Video Summary</h2>
  <div id="summary-content">
    <div class="loader">Loading summary...</div>
  </div>
`;
document.body.appendChild(panel);

// Show the panel
setTimeout(() => {
    panel.classList.add('visible');
}, 100);


// --- 2. LOGIC TO EXTRACT TRANSCRIPT ---
function getTranscriptText() {
  return new Promise((resolve, reject) => {
    // YouTube's data is often in a global object or embedded in the HTML.
    // This is a common way to find it, but it's brittle and might break if YouTube changes its structure.
    const playerResponse = window.ytInitialPlayerResponse;
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      return reject("No captions found for this video.");
    }
    
    // Find the English transcript. You could modify this to let the user choose a language.
    const transcriptInfo = captions.find(c => c.languageCode === 'en' || c.vssId.startsWith('.en'));

    if (!transcriptInfo) {
      return reject("No English transcript found.");
    }

    fetch(transcriptInfo.baseUrl)
      .then(response => response.text())
      .then(xmlText => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName('text');
        let fullTranscript = "";
        for (let i = 0; i < textNodes.length; i++) {
          fullTranscript += textNodes[i].textContent + " ";
        }
        resolve(fullTranscript);
      })
      .catch(error => reject("Failed to fetch or parse transcript XML."));
  });
}


// --- 3. COMMUNICATE WITH BACKGROUND SCRIPT ---
async function main() {
  const summaryContentDiv = document.getElementById('summary-content');
  try {
    const transcript = await getTranscriptText();
    if (transcript) {
      // Send transcript to the background script for summarization
      chrome.runtime.sendMessage({ type: "summarize", transcript: transcript });
    }
  } catch (error) {
    console.error("Summarizer Error:", error);
    summaryContentDiv.innerHTML = `<p style="color: #ffaaaa;">Error: ${error}</p>`;
  }
}

// Listen for the summary result from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "summaryResult") {
    const summaryContentDiv = document.getElementById('summary-content');
    if (request.error) {
        summaryContentDiv.innerHTML = `<p style="color: #ffaaaa;">${request.error}</p>`;
    } else {
        summaryContentDiv.innerText = request.summary;
    }
  }
});

// Run the main function
// We wait a bit for the page's javascript to fully load the necessary data
window.addEventListener('load', () => {
    setTimeout(main, 2000); 
});