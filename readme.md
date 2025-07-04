# YouTube Summarizer Chrome Extension (Gemini Flash Powered)

This is a simple Chrome Extension that uses **Gemini Flash API** to summarize YouTube videos. Just open a video, and it’ll give you a summary instantly using the Gemini model.

## ⚡ Features

- Summarizes YouTube videos using Gemini Flash.
- Works directly on the video page.
- Keeps summarizing as you navigate to other videos (after initial load).
- Clean and lightweight UI.
- Requires your own Gemini API key.

## 🛠 How to Use

1. Clone or download the repo.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select the extension folder.
5. Click on the extension icon and paste your Gemini API key.

## 🧠 How It Works

- It runs only when a YouTube video is directly loaded.
- If you click a video from the homepage, it won't work **until you manually refresh the page**.
- After the first successful load and summary, it **keeps working** as you browse other videos.
- The extension injects a summary box directly below the video player.

## 🚧 Known Issues

- Doesn’t auto-trigger on in-site navigation (like clicking videos from the homepage or sidebar) unless you refresh the page first.
- Requires manual API key entry on first use.

## 📦 Tech Stack

- HTML, CSS, JavaScript
- Gemini Flash API
- Chrome Extension APIs

## 🔐 Gemini API Key

You need a Gemini API key to make it work. Get yours from [Google AI Studio](https://makersuite.google.com/app/apikey) and paste it into the extension popup.

## 🤝 Contributions

Pull requests are welcome. If you find bugs or want to help improve navigation handling, feel free to jump in.

---

> This was a quick hack, but it gets the job done. More polish and updates coming soon.
