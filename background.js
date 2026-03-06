// Background service worker — handles LLM API calls to bypass CORS

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "selekt-llm-request") return false;

  (async () => {
    try {
      const { apiEndpoint, apiKey, model, systemPrompt, userPrompt } = msg;

      const resp = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
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
        sendResponse({ error: `API ${resp.status}: ${errBody.slice(0, 200)}` });
        return;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "No response from model.";
      sendResponse({ content });
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();

  return true; // keep channel open for async response
});
