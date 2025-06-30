// --- 1. CREATE AND INJECT THE UI ---
const panel = document.createElement('div');
panel.id = 'summary-panel';

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

// --- LOGIC FOR THE HIDE/SHOW BUTTON ---
const toggleBtn = document.getElementById('toggle-summary-panel');
toggleBtn.addEventListener('click', () => {
  panel.classList.toggle('visible');
});

// Show the panel automatically on page load
setTimeout(() => {
    panel.classList.add('visible');
}, 100);


// --- 2. LOGIC TO EXTRACT TRANSCRIPT (UPDATED LOGIC) ---
function getTranscriptText() {
  return new Promise((resolve, reject) => {
    // This data structure contains all the initial video information
    const playerResponse = window.ytInitialPlayerResponse;
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      return reject("No caption tracks found for this video.");
    }
    
    // Priority 1: Find the standard, manually-created English transcript.
    // These usually have a vssId that does NOT start with 'a.'
    let transcriptInfo = captions.find(c => c.languageCode === 'en' && c.vssId && !c.vssId.startsWith('a.'));

    // Priority 2: If no manual transcript, find the auto-generated one.
    // These usually have a vssId that starts with 'a.' (for "auto")
    if (!transcriptInfo) {
        console.log("No manual English transcript found, searching for auto-generated transcript.");
        transcriptInfo = captions.find(c => c.vssId && c.vssId.startsWith('a.en'));
    }

    // If neither is found, reject.
    if (!transcriptInfo) {
      return reject("No English transcript (manual or auto-generated) found.");
    }

    // Fetch the transcript XML from the URL provided in the transcript info
    fetch(transcriptInfo.baseUrl)
      .then(response => response.text())
      .then(xmlText => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName('text');
        let fullTranscript = "";
        for (let i = 0; i < textNodes.length; i++) {
          // The transcript text can contain encoded HTML characters (e.g., ' for apostrophe)
          // This line decodes them into normal text.
          const decodedText = new DOMParser().parseFromString(textNodes[i].textContent, "text/html").documentElement.textContent;
          fullTranscript += decodedText + " ";
        }
        resolve(fullTranscript);
      })
      .catch(error => reject("Failed to fetch or parse transcript XML."));
  });
}


// --- 3. COMMUNICATE WITH BACKGROUND SCRIPT --- (No changes here)
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