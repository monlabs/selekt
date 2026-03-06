(() => {
  "use strict";

  /* ---------- State ---------- */
  let toolbar = null;
  let panel = null;
  let currentSelection = "";
  let currentContext = "";

  /* ---------- Helpers ---------- */
  function getSelectionContext(maxChars = 1200) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    const range = sel.getRangeAt(0);

    // Walk up to find a reasonable container (article, section, or body)
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;

    // Try to find a semantic container
    const semanticTags = ["ARTICLE", "SECTION", "MAIN", "BLOCKQUOTE", "DIV"];
    let ctx = container;
    for (let i = 0; i < 6 && ctx && ctx !== document.body; i++) {
      if (semanticTags.includes(ctx.tagName)) break;
      ctx = ctx.parentElement;
    }
    if (!ctx || ctx === document.body) ctx = container;

    let text = (ctx.innerText || ctx.textContent || "").trim();
    if (text.length > maxChars) {
      // Center the context around the selection
      const selText = sel.toString().trim();
      const idx = text.indexOf(selText);
      if (idx !== -1) {
        const half = Math.floor(maxChars / 2);
        const start = Math.max(0, idx - half);
        const end = Math.min(text.length, idx + selText.length + half);
        text = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
      } else {
        text = text.slice(0, maxChars) + "...";
      }
    }
    return text;
  }

  function removeToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
  }

  function removePanel() {
    if (panel) { panel.remove(); panel = null; }
  }

  function removeAll() {
    removeToolbar();
    removePanel();
  }

  /* ---------- Toolbar ---------- */
  function showToolbar(x, y) {
    removeAll();

    toolbar = document.createElement("div");
    toolbar.id = "selekt-toolbar";

    const buttons = [
      { id: "ask",       icon: "💬", label: "Ask AI",    enabled: false },
      { id: "summarize", icon: "📝", label: "Summarize", enabled: false },
      { id: "explain",   icon: "💡", label: "Explain",   enabled: true  },
      { id: "read",      icon: "🔊", label: "Read",      enabled: false },
    ];

    buttons.forEach((btn) => {
      const el = document.createElement("button");
      el.innerHTML = `<span class="selekt-icon">${btn.icon}</span>${btn.label}`;
      el.dataset.action = btn.id;
      if (!btn.enabled) {
        el.style.opacity = "0.4";
        el.style.cursor = "default";
      }
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!btn.enabled) return;
        handleAction(btn.id);
      });
      toolbar.appendChild(el);
    });

    // Position: above the selection, centered
    document.body.appendChild(toolbar);
    const rect = toolbar.getBoundingClientRect();
    let left = x - rect.width / 2;
    let top = y - rect.height - 10;

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    if (top < 8) top = y + 24; // flip below if no room above

    toolbar.style.left = `${left + window.scrollX}px`;
    toolbar.style.top = `${top + window.scrollY}px`;
  }

  /* ---------- Result Panel ---------- */
  function showPanel(action, x, y) {
    removePanel();

    panel = document.createElement("div");
    panel.id = "selekt-panel";

    const header = document.createElement("div");
    header.className = "selekt-panel-header";

    const title = document.createElement("span");
    title.className = "selekt-panel-title";
    const titles = { explain: "Explanation", summarize: "Summary", ask: "AI Answer", read: "Reading" };
    title.textContent = titles[action] || action;

    const closeBtn = document.createElement("button");
    closeBtn.className = "selekt-panel-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", removePanel);

    header.append(title, closeBtn);

    const body = document.createElement("div");
    body.className = "selekt-loading";
    body.innerHTML = `<div class="selekt-spinner"></div><span>Thinking...</span>`;

    panel.append(header, body);
    document.body.appendChild(panel);

    // Position below toolbar or near selection
    const panelRect = panel.getBoundingClientRect();
    let left = x - panelRect.width / 2;
    let top = y + 8;
    if (left < 8) left = 8;
    if (left + panelRect.width > window.innerWidth - 8) left = window.innerWidth - panelRect.width - 8;

    panel.style.left = `${left + window.scrollX}px`;
    panel.style.top = `${top + window.scrollY}px`;

    return body;
  }

  /* ---------- Actions ---------- */
  async function handleAction(action) {
    if (action !== "explain") return; // Only explain is implemented for now

    const sel = window.getSelection();
    if (!sel) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.bottom;

    removeToolbar();
    const body = showPanel(action, cx, cy);

    try {
      const result = await callLLM(action, currentSelection, currentContext);
      body.className = "selekt-result";
      body.textContent = result;
    } catch (err) {
      body.className = "selekt-error";
      body.textContent = `Error: ${err.message}`;
    }
  }

  /* ---------- LLM Call ---------- */
  async function callLLM(action, text, context) {
    // Read settings from storage
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get(
        { apiEndpoint: "", apiKey: "", model: "gpt-4o-mini" },
        resolve
      );
    });

    if (!settings.apiEndpoint || !settings.apiKey) {
      throw new Error("Please configure API endpoint and key in Selekt options (right-click extension → Options).");
    }

    const systemPrompt = `You are a helpful assistant embedded in a browser extension. The user has selected some text on a webpage and wants you to explain it. Provide a clear, concise explanation. If the text is in a specific language, respond in that same language. Use the surrounding context to give a more accurate explanation.`;

    const userPrompt = `Selected text:\n"""${text}"""\n\nSurrounding context:\n"""${context}"""\n\nPlease explain the selected text clearly and concisely.`;

    const resp = await fetch(settings.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`API ${resp.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await resp.json();
    return (
      data.choices?.[0]?.message?.content?.trim() ||
      "No response from model."
    );
  }

  /* ---------- Selection Listener ---------- */
  document.addEventListener("mouseup", (e) => {
    // Ignore clicks on our own UI
    if (e.target.closest("#selekt-toolbar") || e.target.closest("#selekt-panel")) return;

    // Small delay to let browser finalize the selection
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (!text || text.length < 2) {
        removeToolbar();
        return;
      }

      currentSelection = text;
      currentContext = getSelectionContext();

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top;

      showToolbar(cx, cy);
    }, 10);
  });

  // Dismiss on click outside
  document.addEventListener("mousedown", (e) => {
    if (e.target.closest("#selekt-toolbar") || e.target.closest("#selekt-panel")) return;
    // Don't remove if user is starting a new selection
    if (!e.target.closest("#selekt-toolbar")) {
      removeToolbar();
    }
    if (!e.target.closest("#selekt-panel")) {
      removePanel();
    }
  });

  // Dismiss on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeAll();
  });
})();
