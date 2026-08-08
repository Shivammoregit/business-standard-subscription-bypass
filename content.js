// Business Standard Full Article Unblocker & Reader Content Script (v1.2.0)
// Supports On/Off Toggle, Storage Persistence, and In-Page Controls
(function () {
  "use strict";

  let articleData = null;
  let isReaderModeActive = false;
  let isEnabled = true;
  let originalStoryHtml = null;

  // 1. Helper: Extract data from Next.js payload
  function extractDataFromDoc(doc) {
    const nextDataScript = doc.getElementById("__NEXT_DATA__");
    if (!nextDataScript || !nextDataScript.textContent) return null;

    try {
      const parsed = JSON.parse(nextDataScript.textContent);
      const data = parsed?.props?.pageProps?.data;
      if (!data) return null;

      return {
        title: data.heading1 || data.pageTitle || doc.title || "Business Standard Article",
        subtitle: data.subHeading || data.description || "",
        authors: (data.authorDetails || []).map((a) => a.author_name).filter(Boolean),
        publishDate: data.publishDate ? new Date(parseInt(data.publishDate) * 1000).toLocaleString() : "",
        htmlContent: data.htmlContent || "",
        tags: (data.articleTags || "").split(",").map((t) => t.trim()).filter(Boolean),
        audioUrl: data.contentMp3 ? `https://bsmedia.business-standard.com/${data.contentMp3.replace(/^\//, "")}` : null,
      };
    } catch (err) {
      console.warn("[BS Unblocker] Error parsing __NEXT_DATA__:", err);
      return null;
    }
  }

  // 2. Helper: Remove paywalls, modals, blur overlays
  function removePaywalls() {
    if (!isEnabled) return;

    document.body.style.setProperty("overflow", "auto", "important");
    document.documentElement.style.setProperty("overflow", "auto", "important");

    const selectors = [
      ".paywall",
      ".non-paywall-content + div",
      "[class*='subscription']",
      "[class*='Register_popup']",
      "[class*='Subscribe_popup']",
      "[class*='Overlay_overlay']",
      "[class*='meter-paywall']",
      "#subscription-wrapper",
      ".meter-paywall-container",
      ".premium-banner",
      ".ad-slot",
      "[id^='google_ads']"
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        try {
          const text = el.textContent || "";
          if (
            text.includes("Register to continue reading") ||
            text.includes("Already subscribed?") ||
            text.includes("₹300/Month") ||
            text.includes("Subscribe to Newsletters") ||
            el.classList.contains("paywall") ||
            el.className.includes("Overlay")
          ) {
            el.style.display = "none";
          }
        } catch (_) {}
      });
    });

    // Remove blurs or gradient fades
    document.querySelectorAll("*").forEach((el) => {
      if (el.style) {
        if (el.style.filter && el.style.filter.includes("blur")) {
          el.style.filter = "none";
        }
        if (el.style.maxHeight && el.style.maxHeight !== "none") {
          el.style.maxHeight = "none";
        }
      }
    });
  }

  // 3. Helper: Inject unblocked full content into the DOM
  function injectArticleIntoDOM(data) {
    if (!isEnabled || !data || !data.htmlContent) return false;

    let container = document.querySelector("[class*='storycontent']") ||
                    document.querySelector("[class*='storydetail']") ||
                    document.querySelector(".storydetail") ||
                    document.querySelector(".story-content") ||
                    document.querySelector(".non-paywall-content") ||
                    document.querySelector("article") ||
                    document.querySelector("main");

    if (!container) {
      container = document.createElement("div");
      container.id = "bs-injected-main-container";
      document.body.prepend(container);
    }

    if (container.querySelector(".bs-unblocked-wrapper")) {
      return true;
    }

    // Save original HTML in case user turns it off
    if (!originalStoryHtml) {
      originalStoryHtml = container.innerHTML;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "bs-unblocked-wrapper";
    wrapper.innerHTML = `
      <div class="bs-unblock-badge">
        <span class="bs-badge-icon">⚡</span>
        <span>Full Article Unlocked (${data.authors.length ? data.authors.join(", ") : "Business Standard"})</span>
      </div>
      <div class="bs-unblocked-html">
        ${data.htmlContent}
      </div>
    `;

    // Style blockquotes and regulatory highlights
    wrapper.querySelectorAll("blockquote").forEach((bq) => {
      bq.style.backgroundColor = "#fffbeb";
      bq.style.borderLeft = "4px solid #f59e0b";
      bq.style.padding = "16px 20px";
      bq.style.margin = "20px 0";
      bq.style.borderRadius = "0 8px 8px 0";
      bq.style.fontSize = "16px";
    });

    wrapper.querySelectorAll("p, div").forEach((p) => {
      p.style.fontSize = "18px";
      p.style.lineHeight = "1.8";
      p.style.marginBottom = "18px";
      p.style.color = "#18181b";
    });

    wrapper.querySelectorAll("strong").forEach((str) => {
      str.style.fontSize = "20px";
      str.style.display = "block";
      str.style.margin = "24px 0 10px 0";
      str.style.color = "#09090b";
    });

    if (container.classList.contains("non-paywall-content") && container.parentElement) {
      container.parentElement.innerHTML = "";
      container.parentElement.appendChild(wrapper);
    } else {
      container.innerHTML = "";
      container.appendChild(wrapper);
    }

    return true;
  }

  // 4. Floating Action HUD with On/Off controls
  function createFloatingHUD(data) {
    if (!isEnabled) {
      const existing = document.getElementById("bs-unblocker-hud");
      if (existing) existing.remove();
      return;
    }

    if (document.getElementById("bs-unblocker-hud")) return;

    const hud = document.createElement("div");
    hud.id = "bs-unblocker-hud";
    hud.innerHTML = `
      <div class="bs-hud-pill">
        <span class="bs-hud-dot"></span>
        <span class="bs-hud-text">Article Unlocked</span>
        <div class="bs-hud-actions">
          <button class="bs-hud-btn" id="bs-btn-copy" title="Copy Full Text">📋 Copy</button>
          <button class="bs-hud-btn" id="bs-btn-reader" title="Toggle Clean Reader View">📖 Reader</button>
          <button class="bs-hud-btn" id="bs-btn-download" title="Download Markdown">💾 Save</button>
          <button class="bs-hud-btn bs-hud-btn-off" id="bs-btn-turn-off" title="Turn Off Unblocker">✕ Off</button>
        </div>
      </div>
    `;

    document.body.appendChild(hud);

    // Copy Event
    document.getElementById("bs-btn-copy")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = data.htmlContent;
      const textToCopy = `${data.title}\n\n${data.subtitle}\n\n${tempDiv.textContent.replace(/\n\s*\n+/g, "\n\n")}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Full article text copied to clipboard!");
      });
    });

    // Reader Event
    document.getElementById("bs-btn-reader")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleReaderMode(data);
    });

    // Download Event
    document.getElementById("bs-btn-download")?.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadMarkdown(data);
    });

    // Turn Off Button on HUD
    document.getElementById("bs-btn-turn-off")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setMasterState(false);
      showToast("BS Unblocker turned OFF. Refresh or toggle from popup to turn back on.");
    });
  }

  // Toast Notification
  function showToast(msg) {
    let toast = document.getElementById("bs-unblock-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "bs-unblock-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // Reader Mode
  function toggleReaderMode(data) {
    isReaderModeActive = !isReaderModeActive;
    let reader = document.getElementById("bs-reader-overlay");

    if (isReaderModeActive) {
      if (!reader) {
        reader = document.createElement("div");
        reader.id = "bs-reader-overlay";
        document.body.appendChild(reader);
      }

      reader.innerHTML = `
        <div class="bs-reader-container">
          <div class="bs-reader-header">
            <button class="bs-reader-close" id="bs-reader-close-btn">✕ Close Reader</button>
            <span class="bs-reader-source">Business Standard • Full Reader Mode</span>
          </div>
          <h1 class="bs-reader-title">${data.title}</h1>
          ${data.subtitle ? `<p class="bs-reader-subtitle">${data.subtitle}</p>` : ""}
          <div class="bs-reader-meta">
            <span>By <strong>${data.authors.join(", ") || "Business Standard"}</strong></span>
            <span>•</span>
            <span>${data.publishDate}</span>
          </div>
          <hr class="bs-reader-divider" />
          <div class="bs-reader-content">
            ${data.htmlContent}
          </div>
        </div>
      `;
      reader.style.display = "block";
      document.body.style.overflow = "hidden";

      document.getElementById("bs-reader-close-btn")?.addEventListener("click", () => {
        toggleReaderMode(data);
      });
    } else {
      if (reader) reader.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  // Download Markdown
  function downloadMarkdown(data) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = data.htmlContent;
    const bodyText = tempDiv.textContent.replace(/\n\s*\n+/g, "\n\n");

    const mdContent = `# ${data.title}\n\n> ${data.subtitle}\n\n**Authors:** ${data.authors.join(", ")}\n**Date:** ${data.publishDate}\n**URL:** ${window.location.href}\n\n---\n\n${bodyText}\n`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.title || "article").slice(0, 40).replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded markdown file!");
  }

  // Turn Off / Turn On Handler
  function setMasterState(enabled) {
    isEnabled = enabled;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ unblocker_enabled: enabled });
    }

    if (!enabled) {
      // Remove HUD and Reader overlay
      document.getElementById("bs-unblocker-hud")?.remove();
      const reader = document.getElementById("bs-reader-overlay");
      if (reader) reader.style.display = "none";
      isReaderModeActive = false;

      // Revert injected content if saved
      const wrapper = document.querySelector(".bs-unblocked-wrapper");
      if (wrapper && originalStoryHtml) {
        wrapper.parentElement.innerHTML = originalStoryHtml;
      }
    } else {
      unlockArticle();
    }
  }

  // Master Unblocker Execution
  async function unlockArticle() {
    if (!isEnabled) return;

    articleData = extractDataFromDoc(document);

    if (!articleData || !articleData.htmlContent) {
      if (window.location.href.includes("/amp/")) {
        try {
          const canonicalUrl = window.location.href.replace("/amp/", "/");
          const resp = await fetch(canonicalUrl);
          const html = await resp.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          articleData = extractDataFromDoc(doc);
        } catch (e) {
          console.warn("[BS Unblocker] Failed to fetch canonical version:", e);
        }
      }
    }

    if (articleData && articleData.htmlContent && isEnabled) {
      removePaywalls();
      injectArticleIntoDOM(articleData);
      createFloatingHUD(articleData);
    }
  }

  // Check saved preferences on startup
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get({ unblocker_enabled: true }, (res) => {
      isEnabled = res.unblocker_enabled !== false;
      if (isEnabled) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", unlockArticle);
        } else {
          unlockArticle();
        }
        setTimeout(unlockArticle, 800);
        setTimeout(unlockArticle, 2000);
      }
    });
  } else {
    unlockArticle();
  }

  // Observer for late paywalls
  const observer = new MutationObserver(() => {
    if (isEnabled) removePaywalls();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Chrome runtime listener
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggleMasterState") {
        setMasterState(request.enabled);
        sendResponse({ status: "ok", enabled: request.enabled });
      } else if (request.action === "getStatus") {
        sendResponse({
          enabled: isEnabled,
          unlocked: Boolean(articleData),
          data: articleData
        });
      } else if (request.action === "toggleReader") {
        if (articleData) toggleReaderMode(articleData);
        sendResponse({ status: "ok" });
      } else if (request.action === "copyText") {
        if (articleData) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = articleData.htmlContent;
          sendResponse({
            text: `${articleData.title}\n\n${articleData.subtitle}\n\n${tempDiv.textContent.replace(/\n\s*\n+/g, "\n\n")}`
          });
        }
      }
      return true;
    });
  }
})();
