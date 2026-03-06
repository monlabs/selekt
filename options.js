// Load saved settings
chrome.storage.sync.get(
  { apiEndpoint: "", apiKey: "", model: "gpt-4o-mini" },
  (items) => {
    document.getElementById("endpoint").value = items.apiEndpoint;
    document.getElementById("apikey").value = items.apiKey;
    document.getElementById("model").value = items.model;
  }
);

// Save settings
document.getElementById("save").addEventListener("click", () => {
  const apiEndpoint = document.getElementById("endpoint").value.trim();
  const apiKey = document.getElementById("apikey").value.trim();
  const model = document.getElementById("model").value.trim() || "gpt-4o-mini";

  chrome.storage.sync.set({ apiEndpoint, apiKey, model }, () => {
    const toast = document.getElementById("toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  });
});
