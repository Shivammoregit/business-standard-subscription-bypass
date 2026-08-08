# ⚡ Business Standard Full Article Unblocker Extension

A lightweight Chrome / Microsoft Edge extension (Manifest V3) that automatically unlocks complete article content, restores missing paragraphs, removes client-side paywall overlays/blurs, and provides a clean Reader Mode for **Business Standard** articles with a full **On/Off Toggle Switch**.

---

## 🚀 How to Install in Chrome or Edge (30 Seconds)

1. Open your browser extensions manager:
   - **Google Chrome**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Brave / Opera**: `brave://extensions` or `opera://extensions`
2. Turn **ON** the **Developer mode** toggle in the top-right corner.
3. Click the **"Load unpacked"** button.
4. Select this directory:
   ```
   c:\Users\shiva\OneDrive\Desktop\projects\tradejini\SCARPESCREENER\bs_article_unblocker_extension
   ```
5. Open any Business Standard article (e.g., [MTF Article](https://www.business-standard.com/finance/personal-finance/using-mtf-keep-sufficient-cash-for-margin-calls-avoid-forced-selling-126080602127_1.html)).

---

## ⚙️ How to Turn On / Off

You have two convenient ways to turn the unblocker on or off:

### 1. From the Extension Popup (Toolbar)
- Click the **BS Unblocker** icon in your browser toolbar.
- Toggle the **Master Switch** (top right) to **OFF** or **ON**.
- Preferences are saved persistently via `chrome.storage.local`.

### 2. Directly on the Webpage (Floating HUD)
- When reading an article, look at the floating pill in the bottom-right corner.
- Click the red **✕ Off** button to immediately turn off the unblocker and revert the page.

---

## 🌟 Key Features

1. **Automatic Unlocking via Next.js Hydration**:
   - Reads the Server-Side Rendered `__NEXT_DATA__` payload embedded by Business Standard.
   - Extracts all 31 paragraphs, quotes, bylines, and regulatory boxes without needing an active login.

2. **Paywall & Modal Removal**:
   - Automatically cleans up subscription popups, registration backdrops, and unblurs text.
   - Restores smooth page scrolling (`overflow: auto`).

3. **Floating HUD on Every Article**:
   - 🟢 **Article Unlocked Badge**: Shows unlock status.
   - 📋 **Copy Button**: Copies the entire article text to your clipboard in 1 click.
   - 📖 **Reader Mode**: Distraction-free, high-contrast reading interface.
   - 💾 **Save Markdown**: Downloads the article as a clean `.md` file.
   - ✕ **Turn Off**: Quick disable button.
