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
        // Call the Gemini API with the correct model name
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
  // --- THIS IS THE ONLY LINE THAT CHANGES ---
  // We are replacing the old 'gemini-pro' with the new 'gemini-1.5-flash-latest' model.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  // The request body structure is the same for Gemini 1.5 Flash
  const requestBody = {
    contents: [{
      parts: [{
        text: `You are an expert summarizer. You will be given a transcript of a YouTube video and you must provide a concise, easy-to-read summary with excellent formatting. Use bolding for key terms and bullet points for the main takeaways. Here is the transcript:\n\n${transcript}`
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

  // The response structure is the same, so no changes needed here.
  try {
    const summaryText = data.candidates[0].content.parts[0].text;
    return summaryText.trim();
  } catch (e) {
    console.error("Error parsing Gemini response:", data);
    if (data.promptFeedback && data.promptFeedback.blockReason) {
        throw new Error(`Content blocked by safety settings. Reason: ${data.promptFeedback.blockReason}`);
    }
    throw new Error("Could not parse the summary from the API response.");
  }
}