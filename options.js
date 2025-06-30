const saveBtn = document.getElementById('save-btn');
const apiKeyInput = document.getElementById('api-key');
const statusDiv = document.getElementById('status');

// Load the saved API key when the options page opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
});

// Save the API key
saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    chrome.storage.local.set({ apiKey: apiKey }, () => {
      statusDiv.textContent = 'API Key saved!';
      statusDiv.style.color = 'green';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  } else {
    statusDiv.textContent = 'Please enter a valid API Key.';
    statusDiv.style.color = 'red';
  }
});