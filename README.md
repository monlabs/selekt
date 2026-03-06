# ⚡ Selekt

A minimal browser extension that pops up a smart toolbar when you select text. Get AI-powered explanations with one click.

## Features

- 💡 **Explain** — Select any text, click "Explain", get a clear explanation powered by your LLM of choice
- 📝 **Summarize** — (coming soon)
- 💬 **Ask AI** — (coming soon)
- 🔊 **Read** — (coming soon)

## How It Works

1. Select text on any webpage
2. A floating toolbar appears above your selection
3. Click **Explain** — Selekt grabs the surrounding context and sends it to your configured LLM
4. A clean panel shows the explanation right there on the page

## Setup

### Install (Chrome / Edge / Brave)

1. Clone this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `selekt` folder
5. Right-click the Selekt icon → **Options** to configure your API

### Configuration

Selekt uses any **OpenAI-compatible** chat completions API:

| Setting | Example |
|---------|---------|
| API Endpoint | `https://api.openai.com/v1/chat/completions` |
| API Key | `sk-...` |
| Model | `gpt-4o-mini` |

Works with OpenAI, OpenRouter, Ollama, any compatible endpoint.

## Context-Aware

Selekt doesn't just send your selected text — it captures the surrounding context from the page (up to ~1200 chars centered around your selection), giving the LLM enough information to provide accurate, relevant explanations.

## Privacy

- All API calls go directly from your browser to your configured endpoint
- No telemetry, no third-party servers
- Your API key is stored in Chrome's `sync` storage

## License

MIT
