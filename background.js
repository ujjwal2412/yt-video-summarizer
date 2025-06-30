chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "summarize") {
    // Get API Key from storage
    chrome.storage.local.get(['apiKey'], async (result) => {
      const apiKey = result.apiKey;
      if (!apiKey) {
        chrome.tabs.sendMessage(sender.tab.id, { 
            type: "summaryResult", 
            error: "Google Gemini API Key not found. Please set it in the extension options."
        });
        return;
      }
      
      try {
        // Call the Gemini API
        const summary = await getGeminiSummary(request.transcript, apiKey);
        // Send the summary back to the content script
        chrome.tabs.sendMessage(sender.tab.id, { type: "summaryResult", summary: summary });
      } catch (error) {
        console.error("API Call Error:", error);
        chrome.tabs.sendMessage(sender.tab.id, { type: "summaryResult", error: `API Error: ${error.message}` });
      }
    });

    // Return true to indicate you want to send a response asynchronously
    return true; 
  }
});

async function getGeminiSummary(transcript, apiKey) {
  // The Gemini API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  // The prompt and the data structure for the Gemini API
  const requestBody = {
    contents: [{
      parts: [{
        text: `You are an expert summarizer. You will be given a transcript of a YouTube video and you must provide a concise, easy-to-read summary. Use bullet points for key takeaways. Here is the transcript:\n\n${transcript}`
      }]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // The summary text is nested differently in the Gemini response
  try {
    const summaryText = data.candidates[0].content.parts[0].text;
    return summaryText.trim();
  } catch (e) {
    // This can happen if the content is blocked by safety settings
    console.error("Error parsing Gemini response:", data);
    throw new Error("Could not parse the summary from the API response. The content may have been blocked.");
  }
}