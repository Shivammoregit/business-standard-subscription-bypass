document.addEventListener("DOMContentLoaded", () => {
  const masterToggle = document.getElementById("master-toggle");
  const statusBanner = document.getElementById("status-banner");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const btnReader = document.getElementById("btn-reader");
  const btnCopy = document.getElementById("btn-copy");

  // Load saved state (defaults to true)
  chrome.storage?.local?.get({ unblocker_enabled: true }, (items) => {
    const isEnabled = items.unblocker_enabled !== false;
    masterToggle.checked = isEnabled;
    updateUIState(isEnabled);
  });

  function updateUIState(isEnabled) {
    if (isEnabled) {
      statusBanner.classList.remove("disabled");
      statusDot.classList.remove("disabled");
      statusText.textContent = "Unblocker is Active";
      btnReader.removeAttribute("disabled");
      btnCopy.removeAttribute("disabled");
    } else {
      statusBanner.classList.add("disabled");
      statusDot.classList.add("disabled");
      statusText.textContent = "Unblocker is Turned Off";
      btnReader.setAttribute("disabled", "true");
      btnCopy.setAttribute("disabled", "true");
    }
  }

  // Handle master toggle change
  masterToggle.addEventListener("change", () => {
    const isEnabled = masterToggle.checked;
    chrome.storage?.local?.set({ unblocker_enabled: isEnabled }, () => {
      updateUIState(isEnabled);
      // Notify active tab
      chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            action: "toggleMasterState",
            enabled: isEnabled
          });
        }
      });
    });
  });

  // Query active tab for article details
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) return;

    if (!activeTab.url.includes("business-standard.com")) {
      statusText.textContent = "Inactive (Not Business Standard)";
      statusBanner.classList.add("disabled");
      statusDot.classList.add("disabled");
      document.getElementById("popup-title").textContent = "Open a Business Standard article.";
      document.getElementById("popup-meta").textContent = "Extension waiting for BS URL...";
      return;
    }

    // Ask content script for status
    chrome.tabs.sendMessage(activeTab.id, { action: "getStatus" }, (response) => {
      if (response && response.data) {
        document.getElementById("popup-title").textContent = response.data.title || "Article Unlocked";
        document.getElementById("popup-meta").textContent = `By ${response.data.authors?.join(", ") || "BS"} • ${response.data.publishDate || ""}`;
      }
    });

    // Reader Mode Button
    btnReader?.addEventListener("click", () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "toggleReader" });
      window.close();
    });

    // Copy Text Button
    btnCopy?.addEventListener("click", () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "copyText" }, (res) => {
        if (res && res.text) {
          navigator.clipboard.writeText(res.text).then(() => {
            const btnSpan = btnCopy.querySelector(".btn-text");
            btnSpan.textContent = "Copied!";
            setTimeout(() => {
              btnSpan.textContent = "Copy All Text";
            }, 1500);
          });
        }
      });
    });
  });
});
