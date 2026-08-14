---
name: ai-provider-manager
description: "Manage multiple AI providers via chat: list, add, switch, test, and remove providers."
---

# AI Provider Manager

Use this skill when the user asks to manage AI providers, models, or providers through chat.

## Providers

Supports OpenAI-compatible `/v1/chat/completions` providers, plus native providers where OpenClaw documents auth flows.

Common presets:
- `kilocode` - Kilo AI
- `openai` - OpenAI / ChatGPT
- `google` - Gemini
- `anthropic` - Claude
- `github` - GitHub Copilot / Models
- `blackbox` - Blackbox AI
- `aisa` - AISA Chinese AI models: Qwen, DeepSeek, Kimi K2.5, Doubao
- `groq` - Groq
- `together` - Together AI
- `custom` - Any OpenAI-compatible endpoint

## Chat Routing

When the user sends one of the following commands, route to `scripts/ai-manager.js` and return the result as the assistant reply:

- `/ai list`
- `/ai add <name>`
- `/ai preset <name>`
- `/ai use <name> [model]`
- `/ai test <name>`
- `/ai info <name>`
- `/ai remove <name>`

Example routing behavior:
- `/ai list` -> run `node scripts/ai-manager.js list`
- `/ai preset openai` -> run `node scripts/ai-manager.js preset openai`
- `/ai use openai gpt-4o-mini` -> run `node scripts/ai-manager.js use openai gpt-4o-mini`
- `/ai test aisa` -> run `node scripts/ai-manager.js test aisa`

Always show the returned JSON/message to the user in readable form. Mask API keys. Do not rerun if the command was already executed.

## Backend Script

Path: `scripts/ai-manager.js`

Supported commands:
- `list`
- `add <name> <baseUrl> <apiKey> [api] [models]`
- `preset <name>`
- `remove <name>`
- `use <name> [model]`
- `info <name>`
- `test <name>`

## Config Schema

Each provider in `models.providers`:
```json
{
  "<provider>": {
    "baseUrl": "https://...",
    "apiKey": "***",
    "api": "openai-completions",
    "models": [
      { "id": "model-id", "name": "Model Name" }
    ]
  }
}
```

Default model reference:
- `agents.defaults.model.primary`: `<provider>/<model-id>` or preset alias

## Safety

- Never log full API keys
- Mask keys in chat output as `...XXXX`
- Require confirmation before removing a provider that is currently default
- Prefer OpenClaw native auth commands when available over manual config edits
