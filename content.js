// --- 1. CREATE AND INJECT THE UI ---
const panel = document.createElement('div');
panel.id = 'summary-panel';

// UPDATED: Added a button with an ID to the panel's HTML structure
panel.innerHTML = `
  <h2>
    <span>Video Summary</span>
    <button id="toggle-summary-panel" title="Hide/Show Panel">×</button>
  </h2>
  <div id="summary-content">
    <div class="loader">Loading summary...</div>
  </div>
`;
document.body.appendChild(panel);

// --- NEW: LOGIC FOR THE HIDE/SHOW BUTTON ---
const toggleBtn = document.getElementById('toggle-summary-panel');
toggleBtn.addEventListener('click', () => {
  // Toggling the 'visible' class will trigger the CSS transition
  panel.classList.toggle('visible');
});

// Show the panel automatically on page load
setTimeout(() => {
    panel.classList.add('visible');
}, 100);


// --- 2. LOGIC TO EXTRACT TRANSCRIPT --- (No changes in this section)
function getTranscriptText() {
  return new Promise((resolve, reject) => {
    const playerResponse = window.ytInitialPlayerResponse;
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      return reject("No captions found for this video.");
    }
    
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


// --- 3. COMMUNICATE WITH BACKGROUND SCRIPT --- (No changes in this section)
async function main() {
  const summaryContentDiv = document.getElementById('summary-content');
  try {
    const transcript = await getTranscriptText();
    if (transcript) {
      chrome.runtime.sendMessage({ type: "summarize", transcript: transcript });
    }
  } catch (error) {
    console.error("Summarizer Error:", error);
    summaryContentDiv.innerHTML = `<p style="color: #ffaaaa;">Error: ${error}</p>`;
  }
}

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

window.addEventListener('load', () => {
    setTimeout(main, 2000); 
});