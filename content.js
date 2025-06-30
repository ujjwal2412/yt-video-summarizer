// --- Global State Lock ---
// This prevents the script from running multiple times during a single navigation.
let isSummarizing = false;

// --- 1. CREATE AND INJECT THE UI ---
const panel = document.createElement('div');
panel.id = 'summary-panel';
panel.innerHTML = `
  <h2>
    <span>Video Summary</span>
    <button id="toggle-summary-panel" title="Hide/Show Panel">×</button>
  </h2>
  <div id="summary-content"></div>
`;
document.body.appendChild(panel);

// --- LOGIC FOR THE HIDE/SHOW BUTTON ---
const toggleBtn = document.getElementById('toggle-summary-panel');
toggleBtn.addEventListener('click', () => {
  panel.classList.toggle('visible');
});

// --- HELPER FUNCTIONS ---
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element "${selector}" not found after ${timeout / 1000} seconds.`));
    }, timeout);
  });
}

// --- MAIN PROCESS ---
async function initiateSummaryProcess() {
  const summaryContentDiv = document.getElementById('summary-content');

  // Show the panel if it's hidden
  if (!panel.classList.contains('visible')) {
    panel.classList.add('visible');
  }

  try {
    // Step 1: Expand description
    summaryContentDiv.innerHTML = '<div class="loader">1/4: Expanding description...</div>';
    await waitForElement('#description-inline-expander #expand', 5000).then(btn => btn.click());

    // Step 2: Click "Show transcript"
    summaryContentDiv.innerHTML = '<div class="loader">2/4: Clicking "Show transcript"...</div>';
    await waitForElement('button[aria-label="Show transcript"]').then(btn => btn.click());

    // Step 3: Scrape transcript text
    summaryContentDiv.innerHTML = '<div class="loader">3/4: Reading transcript...</div>';
    await waitForElement('ytd-transcript-segment-renderer');
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text');
    let fullTranscript = Array.from(segments).map(s => s.textContent.trim()).join(" ");
    
    if (fullTranscript.length < 20) throw new Error("Could not extract meaningful text.");

    // Step 4: Summarize
    summaryContentDiv.innerHTML = '<div class="loader">4/4: Summarizing...</div>';
    chrome.runtime.sendMessage({ type: "summarize", transcript: fullTranscript });

    // Cleanup: Close transcript panel
    waitForElement('button[aria-label="Close transcript"]', 2000).then(btn => btn.click()).catch(() => {});

  } catch (error) {
    console.error("Summarizer Error:", error);
    summaryContentDiv.innerHTML = `<p style="color: #ffaaaa; font-size: 1rem;">Error: ${error.message}</p><p style="font-size: 0.8rem; color: #999;">This video may not have a transcript, or YouTube's page structure may have changed.</p>`;
    // Attempt cleanup even on error
    document.querySelector('button[aria-label="Close transcript"]')?.click();
  } finally {
    // --- Release the lock ---
    // This is crucial. It allows the script to run for the next video.
    isSummarizing = false;
    console.log("Summarizer process finished. Lock released.");
  }
}

// --- LISTENERS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "summaryResult") {
    const summaryContentDiv = document.getElementById('summary-content');
    if (request.error) {
      summaryContentDiv.innerHTML = `<p style="color: #ffaaaa; font-size: 1rem;">API Error: ${request.error}</p>`;
    } else {
      // --- THIS IS THE MAGIC ---
      // 1. We take the raw Markdown text from the API (request.summary)
      // 2. We use the marked.parse() function to convert it into HTML
      // 3. We set the .innerHTML property to render the HTML
      const htmlSummary = marked.parse(request.summary);
      summaryContentDiv.innerHTML = htmlSummary;
    }
  }
});

let currentUrl = "";
const observer = new MutationObserver(() => {
  // Check if URL is a new video and we are not already summarizing
  if (location.href !== currentUrl && location.href.includes("/watch") && !isSummarizing) {
    // --- Set the lock ---
    isSummarizing = true;
    currentUrl = location.href;
    console.log("New video detected. Locking and starting process for:", currentUrl);
    
    const summaryContentDiv = document.getElementById('summary-content');
    summaryContentDiv.innerHTML = '<div class="loader">Initializing...</div>';
    
    // Start the process after a short delay to let the page load
    setTimeout(initiateSummaryProcess, 1500);
  }
});

observer.observe(document.body, { subtree: true, childList: true });