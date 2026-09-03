// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Multi-Provider AI Service
 * Supports: OpenAI, Google Gemini, Anthropic Claude,
 *           Meta Llama, Blackbox AI, GitHub Models, Groq, Together AI,
 *           Tio AI (OpenAI/Gemini/Anthropic formats via ai.tioo.eu.org)
 *           IkyyXD (gemini, cici, gpt-5-mini, google-gemma, unliai, publicai, perplexity, zai, zerogpt, ai4chat via api.ikyyxd.my.id)
 */

import { getDatabase } from "./nova-database.js";

const DEFAULT_PROVIDERS = {
  openai: {
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    chatEndpoint: "https://api.openai.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || "",
    supportsVision: true,
    supportsSystem: true,
  },
  gemini: {
    name: "Google Gemini",
    models: ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
    defaultModel: "auto-latest",
    chatEndpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=__API_KEY__`,
    authHeader: () => ({}),
    buildBody: ({ messages, systemPrompt }) => {
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }
      return body;
    },
    parseResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    supportsVision: true,
    supportsSystem: true,
  },
  anthropic: {
    name: "Anthropic Claude",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-3-5-haiku-20241022",
    chatEndpoint: "https://api.anthropic.com/v1/messages",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    }),
    buildBody: ({ model, messages, systemPrompt }) => {
      const filtered = messages.filter((m) => m.role !== "system");
      const body = { model, messages: filtered, max_tokens: 1024, temperature: 0.7 };
      if (systemPrompt && filtered.length) body.system = systemPrompt;
      return body;
    },
    parseResponse: (data) => data?.content?.[0]?.text || "",
    supportsVision: true,
    supportsSystem: true,
  },
  groq: {
    name: "Groq",
    models: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "groq/compound", "groq/compound-mini"],
    defaultModel: "openai/gpt-oss-120b",
    chatEndpoint: "https://api.groq.com/openai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  together: {
    name: "Together AI",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    chatEndpoint: "https://api.together.xyz/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  blackbox: {
    name: "Blackbox AI",
    models: ["blackboxai/gpt-4o", "blackboxai/claude-sonnet-4"],
    defaultModel: "blackboxai/gpt-4o",
    chatEndpoint: "https://api.blackbox.ai/api/chat",
    authHeader: (key) => ({ Authorization: key ? `Bearer ${key}` : undefined }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || data?.text || "",
    supportsVision: false,
    supportsSystem: true,
  },
  github: {
    name: "GitHub Models",
    models: ["gpt-4o-mini", "llama-3.3-70b-versatile", "gemma-2-9b-it"],
    defaultModel: "gpt-4o-mini",
    chatEndpoint: (model) => `https://models.inference.ai.azure.com/chat/completions?api-version=2024-05-01-preview`,
    authHeader: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  mistral: {
    name: "Mistral",
    models: ["mistral-small-latest", "open-mistral-nemo", "codestral-latest"],
    defaultModel: "mistral-small-latest",
    chatEndpoint: "https://api.mistral.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: true,
    supportsSystem: true,
  },
  deepseek: {
    name: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    chatEndpoint: "https://api.deepseek.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  // ═══ Tio AI (AIO) - 3 endpoint formats ═══
  tio_openai: {
    name: "Tio AI (OpenAI)",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "deepseek-chat", "deepseek-reasoner"],
    defaultModel: "gpt-4o-mini",
    chatEndpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 4096 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: true,
    supportsSystem: true,
  },
  tio_gemini: {
    name: "Tio AI (Gemini)",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    defaultModel: "gemini-2.0-flash",
    chatEndpoint: (model) => `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`,
    authHeader: (key) => ({ "Content-Type": "application/json", "x-goog-api-key": key }),
    buildBody: ({ messages, systemPrompt }) => {
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }
      return body;
    },
    parseResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    supportsVision: true,
    supportsSystem: true,
  },
  // ═══ IkyyXD API (api.ikyyxd.my.id) — GET-based AI provider ═══
  ikyy_gemini: {
    name: "IkyyXD Gemini",
    models: ["gemini"],
    defaultModel: "gemini",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/gemini",
    method: "GET",
    authHeader: () => ({}),
    // FIX: dulu systemPrompt DIBUANG (cuma pesan user terakhir yang dikirim)
    // — fitur AI otomatis (autoconflict/autosmartwelcome/dll) kehilangan
    // instruksi pentingnya (format JSON, persona). Sekarang: systemPrompt +
    // riwayat singkat digabung ke param text (API Ikyy cuma terima satu text).
    buildParams: ({ messages, systemPrompt, apiKey }) => {
      let text = "";
      if (systemPrompt) text += `${String(systemPrompt).slice(0, 1200)}\n\n`;
      const recent = (messages || []).filter((m) => m.role !== "system").slice(-6);
      if (recent.length > 1) {
        text += "Riwayat singkat:\n";
        for (const m of recent.slice(0, -1)) {
          text += `${m.role === "assistant" ? "AI" : "User"}: ${String(m.content).slice(0, 300)}\n`;
        }
        text += "\n";
      }
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      text += lastUser?.content || "";
      const sessionId = `nova_${Date.now()}`;
      return { text, sessionsId: sessionId, apikey: apiKey };
    },
    parseResponse: (data) => data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_cici: {
    name: "IkyyXD Cici AI",
    models: ["cici"],
    defaultModel: "cici",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/cici",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { prompt: text, apikey: apiKey };
    },
    parseResponse: (data) => data?.result?.reply || data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_gpt5: {
    name: "IkyyXD GPT-5 Mini",
    models: ["gpt-5-mini"],
    defaultModel: "gpt-5-mini",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/gpt-5-mini",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { question: text, apikey: apiKey };
    },
    parseResponse: (data) => data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_gemma: {
    name: "IkyyXD Google Gemma",
    models: ["google-gemma"],
    defaultModel: "google-gemma",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/google-gemma",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      const sessionId = `nova_${Date.now()}`;
      return { text, sessionId, apikey: apiKey };
    },
    parseResponse: (data) => data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_unliai: {
    name: "IkyyXD Unlimited AI",
    models: ["unliai"],
    defaultModel: "unliai",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/unliai",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { teks: text };
    },
    parseResponse: (data) => data?.result?.response || data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_publicai: {
    name: "IkyyXD Public AI",
    models: ["publicai"],
    defaultModel: "publicai",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/publicai",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { q: text, apikey: apiKey };
    },
    parseResponse: (data) => data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_perplexity: {
    name: "IkyyXD Perplexity",
    models: ["perplexity"],
    defaultModel: "perplexity",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/perplexity",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { query: text };
    },
    parseResponse: (data) => data?.result || "",
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_zai: {
    name: "IkyyXD ZAI (Zhipu GLM)",
    models: ["zai"],
    defaultModel: "zai",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/zai",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { prompt: text };
    },
    parseResponse: (data) => {
      // zai returns plain text, not JSON
      if (typeof data === "string") return data;
      return data?.result || data?.response || "";
    },
    supportsVision: false,
    supportsSystem: false,
  },
  ikyy_zerogpt: {
    name: "IkyyXD ZeroGPT (AI Detector)",
    models: ["zerogpt"],
    defaultModel: "zerogpt",
    chatEndpoint: "https://api.ikyyxd.my.id/ai/zerogpt",
    method: "GET",
    authHeader: () => ({}),
    buildParams: ({ messages, apiKey }) => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const text = lastUser?.content || "";
      return { q: text };
    },
    parseResponse: (data) => {
      // zerogpt returns AI detection result, not chat
      const r = data?.result;
      if (!r) return "";
      return `Hasil Deteksi AI:\n` +
        `Human: ${r.isHuman}%\n` +
        `AI: ${r.isAI}%\n` +
        `Fake: ${r.fakePercentage}%\n` +
        `Feedback: ${r.feedback || "-"}`;
    },
    supportsVision: false,
    supportsSystem: false,
  },
  tio_anthropic: {
    name: "Tio AI (Anthropic)",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-sonnet-4-20250514",
    chatEndpoint: "https://ai.tioo.eu.org/v1/messages",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    }),
    buildBody: ({ model, messages, systemPrompt }) => {
      const filtered = messages.filter((m) => m.role !== "system");
      const body = { model, messages: filtered, max_tokens: 4096, temperature: 0.7 };
      if (systemPrompt) body.system = systemPrompt;
      else {
        const sysMsg = messages.find((m) => m.role === "system");
        if (sysMsg) body.system = sysMsg.content;
      }
      return body;
    },
    parseResponse: (data) => data?.content?.[0]?.text || data?.content?.map?.(b => b?.text || "").join("") || "",
    supportsVision: true,
    supportsSystem: true,
  },
  // ═══════════════════════════════════════════════════════
  // PROVIDER GLOBAL — Tinggal isi API key di apikeys.json
  // ═══════════════════════════════════════════════════════
  xai: {
    name: "xAI (Grok)",
    models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini"],
    defaultModel: "grok-3",
    chatEndpoint: "https://api.x.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  qwen: {
    name: "Qwen (Alibaba)",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    defaultModel: "qwen-plus",
    chatEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  cohere: {
    name: "Cohere",
    models: ["command-r-plus", "command-r", "command", "command-light"],
    defaultModel: "command-r-plus",
    chatEndpoint: "https://api.cohere.ai/v1/chat",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages, systemPrompt }) => {
      const msgText = messages.map(m => ({ role: m.role === "assistant" ? "CHATBOT" : m.role === "user" ? "USER" : "SYSTEM", message: m.content }));
      return { model, message: msgText, temperature: 0.7, max_tokens: 1024 };
    },
    parseResponse: (data) => data?.text || "",
    supportsVision: false,
    supportsSystem: true,
  },
  perplexity: {
    name: "Perplexity",
    models: ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online"],
    defaultModel: "llama-3.1-sonar-large-128k-online",
    chatEndpoint: "https://api.perplexity.ai/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  fireworks: {
    name: "Fireworks AI",
    models: ["accounts/fireworks/models/llama-v3p1-70b-instruct", "accounts/fireworks/models/qwen2p5-72b-instruct"],
    defaultModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    chatEndpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  ai21: {
    name: "AI21 Labs",
    models: ["jamba-1.5-large", "jamba-1.5-mini"],
    defaultModel: "jamba-1.5-large",
    chatEndpoint: "https://api.ai21.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  reka: {
    name: "Reka AI",
    models: ["reka-core", "reka-flash", "reka-edge"],
    defaultModel: "reka-flash",
    chatEndpoint: "https://api.reka.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  cerebras: {
    name: "Cerebras",
    models: ["llama-3.1-8b", "llama-3.1-70b"],
    defaultModel: "llama-3.1-8b",
    chatEndpoint: "https://api.cerebras.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  openrouter: {
    name: "OpenRouter",
    models: ["openrouter/auto", "openai/gpt-4o-mini", "google/gemini-flash-1.5", "meta-llama/llama-3.3-70b-instruct"],
    defaultModel: "openrouter/auto",
    chatEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}`, "HTTP-Referer": "https://nova-ai.bot", "X-Title": "Nova AI Bot" }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  huggingface: {
    name: "HuggingFace",
    models: ["meta-llama/Llama-3.3-70B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3", "google/gemma-2-9b-it"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    chatEndpoint: "https://api-inference.huggingface.co/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ inputs: JSON.stringify(messages), parameters: { temperature: 0.7, max_new_tokens: 1024 } }),
    parseResponse: (data) => data?.[0]?.generated_text || data?.generated_text || "",
    supportsVision: false,
    supportsSystem: false,
  },
  voyage: {
    name: "Voyage AI",
    models: ["voyage-large-2", "voyage-code-2"],
    defaultModel: "voyage-large-2",
    chatEndpoint: "https://api.voyageai.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    models: ["@cf/meta/llama-3.3-70b-instruct", "@cf/meta/llama-3.1-8b-instruct"],
    defaultModel: "@cf/meta/llama-3.3-70b-instruct",
    chatEndpoint: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.result?.response || data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  stability: {
    name: "Stability AI",
    models: ["stablelm-tuned-alpha-7b"],
    defaultModel: "stablelm-tuned-alpha-7b",
    chatEndpoint: "https://api.stability.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  jina: {
    name: "Jina AI",
    models: ["jamba-1.5-large"],
    defaultModel: "jamba-1.5-large",
    chatEndpoint: "https://api.jina.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },

};

function getCustomProviders() {
  try {
    const db = getDatabase();
    const data = db.get("aiCustomProviders");
    if (data && typeof data === "object") return data;
  } catch {}
  return {};
}

function resolveProviderKey(providerKey) {
  const custom = getCustomProviders();
  if (custom[providerKey]) return custom[providerKey];
  return DEFAULT_PROVIDERS[providerKey] || null;
}

function resolveProvider(providerKey, providerConfig) {
  const base = resolveProviderKey(providerKey);
  if (!base) return null;
  return { ...base, ...(providerConfig || {}) };
}

function normalizeMessages(messages, systemPrompt) {
  const out = [];
  if (systemPrompt) out.push({ role: "system", content: systemPrompt });
  for (const m of messages || []) {
    const role = ["user", "assistant"].includes(m.role) ? m.role : "user";
    out.push({ role, content: String(m.content || "") });
  }
  return out;
}

/**
 * Resolve API key per provider — cek global key, apikeys.json, dan aiConfig
 */
function resolveApiKeyForProvider(providerKey, aiConfig = {}) {
  const globalMap = {
    openai: "openaiApiKey",
    gemini: "geminiApiKey",
    anthropic: "anthropicApiKey",
    groq: "groqkey",
    deepseek: "deepseekkey",
    xai: "xaikey",
    qwen: "qwenkey",
    cohere: "coherekey",
    perplexity: "perplexitykey",
    fireworks: "fireworkskey",
    ai21: "ai21key",
    reka: "rekakey",
    cerebras: "cerebraskey",
    openrouter: "openrouterkey",
    huggingface: "huggingfacekey",
    voyage: "voyagekey",
    cloudflare: "cloudflarekey",
    stability: "stabilitykey",
    jina: "jinakey",
    mistral: "mistralkey",
    together: "togetherkey",
  };
  const gKey = globalMap[providerKey] ? (global[globalMap[providerKey]] || "") : "";
  if (gKey) return gKey;
  if (aiConfig.apiKey) return String(aiConfig.apiKey);
  return "";
}

function getAllProviders() {
  return { ...DEFAULT_PROVIDERS, ...getCustomProviders() };
}

async function callAI(firstArg, secondArg) {
  // Support 2 call formats:
  // 1. callAI({ providerKey, messages, systemPrompt, ... }) — object format
  // 2. callAI(promptString, { systemPrompt, ... }) — string format (future plugins)
  let providerKey, model, messages, systemPrompt, apiKey, apiEndpoint, temperature, maxTokens, senderJid;

  if (typeof firstArg === "string") {
    // String format: callAI(prompt, { options })
    const opts = secondArg || {};
    messages = [{ role: "user", content: firstArg }];
    systemPrompt = opts.systemPrompt || "";
    apiKey = opts.apiKey || "";
    apiEndpoint = opts.apiEndpoint || "";
    model = opts.model || "";
    providerKey = opts.providerKey || "openai";
    temperature = opts.temperature ?? 0.7;
    maxTokens = opts.maxTokens ?? 1024;
    senderJid = opts.senderJid || "";
  } else {
    // Object format: callAI({ providerKey, messages, ... })
    providerKey = firstArg.providerKey || "openai";
    model = firstArg.model;
    messages = firstArg.messages;
    systemPrompt = firstArg.systemPrompt;
    apiKey = firstArg.apiKey;
    apiEndpoint = firstArg.apiEndpoint;
    temperature = firstArg.temperature ?? 0.7;
    maxTokens = firstArg.maxTokens ?? 1024;
    senderJid = firstArg.senderJid || "";
  }

  // Only override chatEndpoint if apiEndpoint is provided; keep provider's authHeader and buildBody
  const providerOverrides = {};
  if (typeof apiEndpoint === "string" && apiEndpoint) {
    providerOverrides.chatEndpoint = apiEndpoint;
  }
  const provider = resolveProvider(providerKey, providerOverrides);
  if (!provider) throw new Error(`Provider ${providerKey} tidak didukung.`);

  // Mood-Driven Theme: inject mood context into system prompt (global, all AI plugins)
  try {
    const sender = senderJid || global.__novaMoodSender || "";
    if (sender) {
      const { getMoodSystemPrompt } = await import("../plugins/owner/moodtheme.js");
      if (typeof getMoodSystemPrompt === "function") {
        const moodPrompt = getMoodSystemPrompt(sender);
        if (moodPrompt) systemPrompt = (systemPrompt || "") + moodPrompt;
      }
    }
  } catch (e) {
    // Mood theme not active, continue normally
  }

  // Time-Warp: inject temporal persona into system prompt (per-user, when active)
  try {
    const sender = senderJid || global.__novaMoodSender || "";
    if (sender) {
      const { getTimewarpPrompt } = await import("../plugins/ai/aitimewarp.js");
      if (typeof getTimewarpPrompt === "function") {
        const warpPrompt = getTimewarpPrompt(sender);
        if (warpPrompt) systemPrompt = (systemPrompt || "") + warpPrompt;
      }
    }
  } catch (e) {
    // Time-warp not active, continue normally
  }

  // Multi-Language: inject language preference into system prompt (per-user)
  try {
    const sender = senderJid || global.__novaMoodSender || "";
    if (sender) {
      const { getLanguagePrompt } = await import("./nova-language.js");
      if (typeof getLanguagePrompt === "function") {
        const langPrompt = getLanguagePrompt(sender);
        if (langPrompt) systemPrompt = (systemPrompt || "") + langPrompt;
      }
    }
  } catch (e) {
    // Language preference not set, continue normally
  }

  // ═══ AUTO-FALLBACK KE IKYY (free, no-key) ═══
  // Fitur AI otomatis (autoconflict, autosmartmod, autosmartwelcome,
  // autosummary, autocontent, autopredict, dll) manggil callAI dengan
  // providerKey "openai" + apiKey dari config.aiHelp. Kalau owner belum
  // set key itu, request ke api.openai.com balas 401 → fitur diam-diam
  // gak jalan walau toggle-nya ON. Fix: key kosong + bukan provider GET
  // (Ikyy dll) + tanpa apiEndpoint custom → otomatis pindah ke
  // ikyy_gemini (api.ikyyxd.my.id, free no-key, terverifikasi hidup).
  let effectiveApiKey = String(apiKey || "");
  let activeProviderKey = providerKey;
  let activeProvider = provider;
  if (
    !effectiveApiKey &&
    !apiEndpoint &&
    provider.method !== "GET" &&
    providerKey !== "ikyy_gemini"
  ) {
    const ikyyFallback = resolveProvider("ikyy_gemini", {});
    if (ikyyFallback) {
      activeProviderKey = "ikyy_gemini";
      activeProvider = ikyyFallback;
      console.log(`[AI-Service] key "${providerKey}" kosong → fallback ke IkyyXD Gemini (free)`);
    }
  }

  const effectiveModel = String(model || activeProvider.defaultModel);
  const normalizedMessages = normalizeMessages(messages, systemPrompt && activeProvider.supportsSystem ? systemPrompt : undefined);

  // ═══ RESILIENCE: provider utama gagal → retry sekali via IkyyXD Gemini ═══
  // Endpoint custom (mis. Tio AI) suka mati diam-diam → fitur AI otomatis
  // (autoconflict, autosmartmod, autosmartwelcome, dll) mati walau ON.
  // Owner request: fitur WAJIB tetap jalan → gagal = fallback Ikyy (free).
  async function requestOnce(prov, provKey) {
    const url2 = typeof prov.chatEndpoint === "function" ? prov.chatEndpoint(effectiveModel) : prov.chatEndpoint;
    const finalUrl2 = String(url2 || "").replace("__API_KEY__", encodeURIComponent(effectiveApiKey));

    if (prov.method === "GET" && prov.buildParams) {
      const params = prov.buildParams({ model: effectiveModel, messages: normalizedMessages, systemPrompt, apiKey: effectiveApiKey });
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ""),
      ).toString();
      const getUrl = `${finalUrl2}?${queryString}`;
      const res = await fetch(getUrl, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0", ...prov.authHeader(effectiveApiKey) },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI ${provKey} error ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json().catch(() => ({}));
      if (!data?.status) throw new Error(`AI ${provKey}: ${data?.message || " respon gagal"}`);
      const text = prov.parseResponse(data);
      if (!text) throw new Error("AI mengembalikan respon kosong.");
      return text;
    }

    const body2 = prov.buildBody({ model: effectiveModel, messages: normalizedMessages, systemPrompt });
    const res = await fetch(finalUrl2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(effectiveApiKey ? prov.authHeader(effectiveApiKey) : prov.authHeader("")),
      },
      body: JSON.stringify({ ...body2, temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI ${provKey} error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json().catch(() => ({}));
    const text = prov.parseResponse(data);
    if (!text) throw new Error("AI mengembalikan respon kosong.");
    return text;
  }

  try {
    return await requestOnce(activeProvider, activeProviderKey);
  } catch (mainErr) {
    // udah di Ikyy? jangan fallback ke dirinya sendiri
    if (activeProviderKey === "ikyy_gemini") throw mainErr;
    const ikyyRetry = resolveProvider("ikyy_gemini", {});
    if (!ikyyRetry) throw mainErr;
    console.log(`[AI-Service] ${activeProviderKey} gagal (${mainErr.message.slice(0, 100)}) → fallback IkyyXD Gemini`);
    const retryMessages = normalizeMessages(messages, systemPrompt);
    const savedMessages = normalizedMessages;
    try {
      const res = await fetch(
        `https://api.ikyyxd.my.id/ai/gemini?${new URLSearchParams(ikyyRetry.buildParams({ model: "gemini", messages: retryMessages, systemPrompt, apiKey: "" }))}`,
        { method: "GET", headers: { "User-Agent": "Mozilla/5.0" } },
      );
      if (!res.ok) throw new Error(`Ikyy error ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (!data?.status) throw new Error(data?.message || "respon gagal");
      const text = ikyyRetry.parseResponse(data);
      if (!text) throw new Error("respon kosong");
      return text;
    } catch (retryErr) {
      console.log(`[AI-Service] fallback Ikyy juga gagal: ${retryErr.message}`);
      throw mainErr; // lempar error asli biar caller tahu
    } finally {
      void savedMessages;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO-LATEST GEMINI MODEL RESOLVER
// Otomatis fetch model Gemini terbaru dari API, cache 1 jam
// ═══════════════════════════════════════════════════════════
let _cachedLatestModel = null;
let _cachedAt = 0;
const FALLBACK_LATEST = "gemini-3.5-flash-lite";

/**
 * resolveLatestGeminiModel — fetch model terbaru dari Gemini API
 * Cari model dengan "flash-lite" di nama, urutkan by version, ambil terbaru
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} model endpoint name
 */
async function resolveLatestGeminiModel(apiKey) {
  const now = Date.now();
  // Cache 1 jam
  if (_cachedLatestModel && (now - _cachedAt) < 3600000) return _cachedLatestModel;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = (data.models || [])
      .map(m => m.name?.replace("models/", "") || "")
      .filter(name => name.includes("flash-lite") && !name.includes("image") && !name.includes("live") && !name.includes("tts") && !name.includes("transcribe"))
      .filter(name => /^gemini-\d+\.\d+-flash-lite/.test(name));

    if (models.length === 0) throw new Error("No flash-lite models found");

    // Sort by version descending (gemini-3.5 > gemini-3.1 > gemini-2.5)
    models.sort((a, b) => {
      const va = parseFloat(a.match(/\d+\.\d+/)?.[0] || "0");
      const vb = parseFloat(b.match(/\d+\.\d+/)?.[0] || "0");
      return vb - va;
    });

    _cachedLatestModel = models[0];
    _cachedAt = now;
    return _cachedLatestModel;
  } catch (e) {
    // Fallback ke hardcoded latest
    if (!_cachedLatestModel) _cachedLatestModel = FALLBACK_LATEST;
    return _cachedLatestModel;
  }
}


/**
 * Helper: callGemini — panggil Google Gemini dengan API key dari config
 * Auto-inject API key dari apikeys.json (google) atau config.aiHelp.geminiApiKey
 * @param {string} prompt - User prompt
 * @param {object} opts - { systemPrompt, model, temperature, maxTokens, senderJid }
 */
async function callGemini(prompt, opts = {}) {
  // Resolve API key: opts.apiKey > apikeys.json (google = Google key asli) > config.geminiApiKey > config.aiHelp.geminiApiKey
  // Note: config.aiHelp.geminiApiKey = getTioKey() = Tio key, BUKAN Google key
  let apiKey = opts.apiKey || "";
  if (!apiKey) {
    try {
      const { getApiKeys } = await import("./config/env-loader.js");
      const keys = getApiKeys();
      apiKey = keys.google || keys.gemini || "";
    } catch {}
  }
  if (!apiKey) {
    try {
      const config = (await import("../../config.js")).default;
      apiKey = config.geminiApiKey || config.aiHelp?.geminiApiKey || "";
    } catch {}
  }
  // Try native Google Gemini first, fallback to IkyyXD gemini
  if (apiKey) {
    try {
      return await callAI({
        providerKey: "gemini",
        apiKey,
        model: opts.model || await resolveLatestGeminiModel(apiKey),
        messages: [{ role: "user", content: prompt }],
        systemPrompt: opts.systemPrompt || "",
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 8192,
        senderJid: opts.senderJid || "",
      });
    } catch (googleErr) {
      console.error("[callGemini] Google API failed, falling back to IkyyXD:", googleErr.message);
    }
  }

  // Fallback: IkyyXD Gemini API
  return callIkyy(prompt, { ...opts, model: "gemini" });
}



// ═══════════════════════════════════════════════════════════
// IKYYXD API HELPER
// api.ikyyxd.my.id — GET-based AI API
// Endpoints: gemini, cici, gpt-5-mini, google-gemma, ai4chat
// Primary: gemini (most stable), Fallback: cici → gpt-5-mini
// ═══════════════════════════════════════════════════════════

/**
 * callIkyy — panggil AI via IkyyXD API dengan fallback otomatis
 * @param {string} prompt - User prompt
 * @param {object} opts - { model, systemPrompt, senderJid }
 * @returns {Promise<string>} AI response text
 */
async function callIkyy(prompt, opts = {}) {
  let apiKey = opts.apiKey || "";
  if (!apiKey) {
    try {
      const { getApiKeys } = await import("./config/env-loader.js");
      const keys = getApiKeys();
      apiKey = keys.ikyyxd || "kyzz";
    } catch {
      apiKey = "kyzz";
    }
  }

  // Build messages with system prompt
  const messages = [{ role: "user", content: prompt }];
  if (opts.systemPrompt) {
    messages.unshift({ role: "system", content: opts.systemPrompt });
  }

  // Model priority: gemini → cici → gpt-5-mini → google-gemma
  const model = opts.model || "gemini";
  const providerKey = `ikyy_${model}`;

  try {
    return await callAI({
      providerKey,
      apiKey,
      messages,
      systemPrompt: opts.systemPrompt || "",
      senderJid: opts.senderJid || "",
    });
  } catch (geminiErr) {
    console.error(`[callIkyy] ${model} failed:`, geminiErr.message);
    // Fallback chain: cici → unliai → publicai → gpt-5-mini → google-gemma
    const fallbackChain = [
      { key: "ikyy_cici", label: "cici" },
      { key: "ikyy_unliai", label: "unliai" },
      { key: "ikyy_publicai", label: "publicai" },
      { key: "ikyy_zai", label: "zai" },
      { key: "ikyy_gpt5", label: "gpt-5-mini" },
      { key: "ikyy_gemma", label: "google-gemma" },
    ].filter(f => f.key !== `ikyy_${model}`);

    for (const fb of fallbackChain) {
      try {
        return await callAI({
          providerKey: fb.key,
          apiKey,
          messages,
          senderJid: opts.senderJid || "",
        });
      } catch (fbErr) {
        console.error(`[callIkyy] ${fb.label} fallback failed:`, fbErr.message);
      }
    }

    throw new Error("Semua model IkyyXD API gagal. Coba lagi nanti.");
  }
}

/**
 * callIkyyImage — generate image via IkyyXD ai4chat/image endpoint
 * @param {string} prompt - Image prompt
 * @param {string} ratio - Aspect ratio (1:1, 16:9, etc)
 * @returns {Promise<string>} Image URL or null
 */
async function callIkyyImage(prompt, ratio = "1:1") {
  let apiKey = "kyzz";
  try {
    const { getApiKeys } = await import("./config/env-loader.js");
    const keys = getApiKeys();
    apiKey = keys.ikyyxd || "kyzz";
  } catch {}

  try {
    const url = `https://api.ikyyxd.my.id/ai/ai4chat/image?apikey=${encodeURIComponent(apiKey)}&prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json().catch(() => ({}));
    if (data?.status) {
      // Check for image URL in various response fields
      return data?.url || data?.result || data?.image || null;
    }
    return null;
  } catch (err) {
    console.error("[callIkyyImage] failed:", err.message);
    return null;
  }
}

export {
  DEFAULT_PROVIDERS,
  callIkyy,
  callIkyyImage,
  resolveProvider,
  resolveApiKeyForProvider,
  getAllProviders,
  callAI,
  callGemini,
  resolveLatestGeminiModel,
  normalizeMessages,
};
