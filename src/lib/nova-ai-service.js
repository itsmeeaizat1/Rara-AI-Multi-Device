// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Multi-Provider AI Service
 * Supports: OpenAI, Google Gemini, Anthropic Claude,
 *           Meta Llama, Blackbox AI, GitHub Models, Groq, Together AI,
 *           Tio AI (OpenAI/Gemini/Anthropic formats via kktoken.cc)
 *           IkyyXD (gemini, cici, gpt-5-mini, google-gemma, unliai, publicai, perplexity, zai, zerogpt, ai4chat via api.ikyyxd.my.id)
 */

import zlib from "node:zlib";
import { getDatabase } from "./nova-database.js";
import { getProviderApiKey } from "./apikey/ai-chain.js";

const DEFAULT_PROVIDERS = {
  openai: {
    name: "OpenAI",
    models: ["gpt-5.5", "gpt-5.5-pro", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    defaultModel: "gpt-4o-mini",
    chatEndpoint: "https://api.openai.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || "",
    supportsVision: true,
    imageGen: { model: "gpt-image-1", endpoint: "https://api.openai.com/v1/images/generations", format: "openai" },
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
        .map((m) => {
          // Vision: kalau message punya .image ({mimeType, data:base64}), kirim
          // sebagai inline_data part bareng teksnya — Gemini native multimodal.
          const parts = [];
          if (m.content) parts.push({ text: m.content });
          if (m.image?.data) parts.push({ inline_data: { mime_type: m.image.mimeType || "image/jpeg", data: m.image.data } });
          return {
            role: m.role === "assistant" ? "model" : "user",
            parts: parts.length ? parts : [{ text: "" }],
          };
        });
      const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }
      return body;
    },
    parseResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    supportsVision: true,
    // 🔹 IMAGE GEN (nano banana) — generate gambar via API yang sama
    imageGen: { model: "gemini-2.5-flash-image", format: "gemini" },
    supportsSystem: true,
  },
  anthropic: {
    name: "Anthropic Claude",
    // lineup Sep 2026 (sonnet-4/opus-4 di-RETIRE Juni 2026 — calls fail!)
    // opus-5 = the best model in the world for coding (docs resmi Anthropic)
    models: ["claude-opus-5", "claude-sonnet-5", "claude-fable-5-1", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-5",
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
    supportsVision: false, // Groq udah nyabut semua model vision (llama-4) — teks doang
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
    chatEndpoint: "https://kktoken.cc/v1/chat/completions",
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
    chatEndpoint: (model) => `https://kktoken.cc/v1beta/models/${model}:generateContent`,
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
    defaultModel: "claude-sonnet-5",
    chatEndpoint: "https://kktoken.cc/v1/messages",
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
    models: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini", "grok-2-vision-1212"],
    defaultModel: "grok-3",
    chatEndpoint: "https://api.x.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: true,
    imageGen: { model: "grok-2-image-1212", endpoint: "https://api.x.ai/v1/images/generations", format: "openai" },
    visionModel: "grok-2-vision-1212",
    supportsSystem: true,
  },
  // ═══ Codestral (Mistral) — specialist coding, FIM, 256k ctx ═══
  codestral: {
    name: "Codestral (Mistral)",
    models: ["codestral-latest"],
    defaultModel: "codestral-latest",
    chatEndpoint: "https://api.mistral.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.2, max_tokens: 2048 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    supportsSystem: true,
  },
  // ═══ Kimi Code — kimi-k2.7-code-highspeed (coding, 256k, image input) ═══
  kimicode: {
    name: "Kimi Code (Moonshot)",
    models: ["kimi-k2.7-code-highspeed", "kimi-k2.7-code"],
    defaultModel: "kimi-k2.7-code-highspeed",
    chatEndpoint: "https://api.moonshot.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.2, max_tokens: 2048 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: true,
    supportsSystem: true,
  },
  // ═══ Zhipu AI (GLM) — CN platform, glm-4.7-flash GRATIS + cogview image gen ═══
  zhipu: {
    name: "Zhipu GLM",
    models: ["glm-4.7-flash", "glm-4.6", "glm-4.6v-flash"],
    defaultModel: "glm-4.7-flash",
    chatEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: false,
    // 🔹 IMAGE GEN: cogview-3-flash GRATIS (payload openai-compat, respon url)
    imageGen: { model: "cogview-3-flash", endpoint: "https://open.bigmodel.cn/api/paas/v4/images/generations", format: "openai" },
    supportsSystem: true,
  },
  // ═══ Kimi (Moonshot) — kimi-k3 flagship, VISION NATIVE (image_url data URI) ═══
  kimi: {
    name: "Kimi (Moonshot)",
    models: ["kimi-k3", "kimi-k2.6", "kimi-k2.7-code-highspeed"],
    defaultModel: "kimi-k3",
    chatEndpoint: "https://api.moonshot.ai/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: ({ model, messages }) => ({ model, messages, temperature: 0.7, max_tokens: 1024 }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || "",
    supportsVision: true,
    supportsSystem: true,
  },
  // ═══ Meta AI — Meta Model API (Muse Spark), OpenAI-compatible, api.meta.ai ═══
  meta: {
    name: "Meta AI (Muse Spark)",
    models: ["muse-spark-1.3", "muse-spark-1.1"],
    defaultModel: "muse-spark-1.3",
    chatEndpoint: "https://api.meta.ai/v1/chat/completions",
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
    const item = { role, content: String(m.content || "") };
    // Vision: teruskan gambar (base64) apa adanya — provider yang support
    // (gemini buildBody) yang nanti nyusun jadi inline_data part.
    if (m.image?.data) item.image = m.image;
    out.push(item);
  }
  return out;
}

/**
 * callImageGen — GENERATE GAMBAR via provider yang support (AI image).
 * Provider support: gemini (nano banana, key google aktif), openai
 * (gpt-image-1), xai/grok (grok-2-image). Dipakai fitur AI satuan
 * (.gemini/.openai/.grok "buat gambar ..."), tool genimage .novaai,
 * dan action aiimage .autonovaai/autoflow.
 * @returns {{base64:string, mimeType:string}}
 */
export async function callImageGen(providerKey, prompt, opts = {}) {
  const provider = resolveProvider(providerKey, {});
  const gen = provider?.imageGen;
  if (!gen) throw new Error(`AI "${providerKey || "-"}" tidak support generate gambar — coba .gemini/.openai/.grok`);
  const apiKey = String(opts.apiKey || resolveApiKeyForProvider(providerKey, opts.aiConfig || {}) || "").trim();
  // key kosong = provider gak bisa dicoba → langsung free fallback
  // (biar gambar tetap keluar; key diisi → provider utama dipakai)
  if (!apiKey) {
    console.log(`[ImageGen] ${providerKey} key kosong → fallback Pollinations (free tanpa key)`);
    return await freeFallback();
  }

  const promptText = String(prompt || "").trim() || "sesuatu yang menarik dan indah";

  // fallback FREE TANPA KEY: kalau provider-nya error (key mati/kosong/
  // rate-limit), gambar tetap keluar via Pollinations (flux, free) —
  // fitur wajib jalan walau semua key AI mati.
  async function freeFallback() {
    // rasio ASPECT (1:1, 16:9, dst) → ukuran piksel. JANGAN parseInt ratio
    // langsung ("1:1" → 1x1 pixel, hasilnya gambar 1px!)
    const RATIO_PX = {
      "1:1": [1024, 1024], "16:9": [1280, 720], "9:16": [720, 1280],
      "4:3": [1024, 768], "3:4": [768, 1024], "3:2": [1200, 800], "2:3": [800, 1200], "21:9": [1280, 548],
    };
    const [w, h] = RATIO_PX[String(opts.ratio || "1:1")] || [1024, 1024];
    // pollinations kadang balikin placeholder kecil pas antri — retry 3x
    // dengan seed beda + threshold ukuran minimal gambar beneran
    let lastErr = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const seed = Math.floor(Math.random() * 1e9);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText.slice(0, 400))}?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) { lastErr = `pollinations ${res.status}`; continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        // validasi gambar asli: magic bytes JPEG/PNG/WebP (bukan placeholder/error page)
        const magic = buf.slice(0, 4).toString("hex");
        const isImg = magic.startsWith("ffd8ff") || magic.startsWith("89504e47") || magic.startsWith("5249464");
        if (!isImg || buf.length < 5000) { lastErr = `hasil bukan gambar valid (${buf.length}B)`; continue; }
        return { base64: buf.toString("base64"), mimeType: res.headers.get("content-type") || "image/jpeg", via: "pollinations (free)" };
      } catch (e) { lastErr = e.message.slice(0, 80); }
    }
    throw new Error(`Gagal generate gambar free (${lastErr})`);
  }

  if (gen.format === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${gen.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    if (!res.ok) {
      if (opts.noFreeFallback) throw new Error(`[ImageGen] ${providerKey} gagal (${res.status})`);
      console.log(`[ImageGen] ${providerKey} gagal (${res.status}) → fallback Pollinations (free tanpa key)`);
      return await freeFallback();
    }
    const data = await res.json().catch(() => ({}));
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    if (!imgPart) {
      const note = parts.find((p) => p.text)?.text;
      throw new Error("AI tidak menghasilkan gambar" + (note ? ` (${String(note).slice(0, 100)})` : ""));
    }
    return {
      base64: imgPart.inlineData?.data || imgPart.inline_data?.data,
      mimeType: imgPart.inlineData?.mimeType || imgPart.inline_data?.mime_type || "image/png",
      via: providerKey,
    };
  }

  // format openai-compatible (openai gpt-image-1, xai grok-2-image, dll)
  const res = await fetch(gen.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: gen.model, prompt: promptText, n: 1, ...(gen.extra || {}) }),
  });
  if (!res.ok) {
    if (opts.noFreeFallback) throw new Error(`[ImageGen] ${providerKey} gagal (${res.status})`);
    console.log(`[ImageGen] ${providerKey} gagal (${res.status}) → fallback Pollinations (free tanpa key)`);
    return await freeFallback();
  }
  const data = await res.json().catch(() => ({}));
  const item = data?.data?.[0];
  if (item?.b64_json) return { base64: item.b64_json, mimeType: "image/png", via: providerKey };
  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error(`Gagal unduh hasil gambar (${imgRes.status})`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { base64: buf.toString("base64"), mimeType: imgRes.headers.get("content-type") || "image/png" };
  }
  throw new Error("Respon image gen tidak dikenal");
}


/**
 * nanoBananaText2Img — TEXT→IMAGE nano-banana TANPA key Google (request
 * owner 12 Sep 2026: "klo agent aku suruh generate gambar jgn pakai ai
 * polition bsa ga pakai nano banana dr aiclotheschanger gt kan ada nano
 * banana nya"). Trik: nano-banana kan engine EDIT (butuh gambar input) —
 * kasih CANVAS KOSONG abu-abu 512x512 + prompt "generate gambar baru di
 * canvas ini" → nano-banana nggambar dari nol. Live verified 12 Sep:
 * api-faa 52 dtk 2.2MB ✅ + kuroneko 24 dtk ✅.
 * Rantai: live3d (api-faa) → kuroneko nanoBananaEdit → throw.
 */
// 🔹 RASIO GAMBAR (request owner 13 Sep 2026: "buat gambar sesuai ukuran
// rasio yg diinginkan misal kucing 9:16"): user nulis rasio di prompt →
// dideteksi otomatis → canvas nano-banana dibikin SESUAI RASIO (bukan
// 512x512 persegi mulu) + hint rasio buat provider key + pollinations
// fallback ikut dims rasio.
const IMAGE_RATIOS = ["21:9", "9:16", "16:9", "1:1", "4:3", "3:4", "3:2", "2:3"];
// dimensi canvas nano-banana per rasio (sisi panjang 1024, genap)
const NANO_RATIO_PX = {
  "1:1": [512, 512],
  "9:16": [576, 1024],
  "16:9": [1024, 576],
  "4:3": [1024, 768],
  "3:4": [768, 1024],
  "3:2": [1024, 684],
  "2:3": [684, 1024],
  "21:9": [1024, 440],
};

/**
 * extractImageRatio — deteksi rasio di teks prompt user.
 * Support format "9:16" / "9.16" + kata kunci (portrait/vertikal → 9:16,
 * landscape/horizontal → 16:9, persegi/square → 1:1).
 * @returns {{ratio:string|null, prompt:string}} prompt sudah dibersihin dari token rasio
 */
export function extractImageRatio(text) {
  const t = String(text || "").trim();
  if (!t) return { ratio: null, prompt: "" };
  const re = new RegExp("\\b(" + IMAGE_RATIOS.map(r => r.replace(":", "[.:]")).join("|") + ")\\b");
  const m = t.match(re);
  if (m) {
    const ratio = m[1].replace(".", ":");
    return { ratio, prompt: t.replace(m[0], " ").replace(/\s+/g, " ").trim() };
  }
  const s = t.toLowerCase();
  let ratio = null, kw = null;
  if (/\b(portrait|vertikal|vertical)\b/.test(s)) { ratio = "9:16"; kw = /\b(portrait|vertikal|vertical)\b/gi; }
  else if (/\b(landscape|horizontal)\b/.test(s)) { ratio = "16:9"; kw = /\b(landscape|horizontal)\b/gi; }
  else if (/\b(persegi|square)\b/.test(s)) { ratio = "1:1"; kw = /\b(persegi|square)\b/gi; }
  if (ratio) {
    return { ratio, prompt: t.replace(kw, " ").replace(/\s+/g, " ").trim() };
  }
  return { ratio: null, prompt: t };
}

// ── builder PNG abu-abu canvas (untuk trik nano-banana, dimensi bebas) ──
function _crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function _pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(_crc32(td));
  return Buffer.concat([len, td, crc]);
}
/**
 * makeGrayCanvas — PNG solid abu-abu (RGB 128) ukuran bebas, dipakai
 * nano-banana sebagai kanvas kosong yang digambar ulang. Rasio canvas =
 * rasio output nano-banana.
 */
export function makeGrayCanvas(w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth 8
  ihdr[9] = 2;   // color type 2 (RGB)
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 128)]); // filter 0 + abu-abu
  const raw = Buffer.concat(Array(h).fill(row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    _pngChunk("IHDR", ihdr),
    _pngChunk("IDAT", zlib.deflateSync(raw)),
    _pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const NANO_CANVAS_B64 = "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAHG0lEQVR4nO3VMQEAAAiAMPunNYIxPNgS8DELQNJ8BwDwwwAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDAAgygAAogwAIMoAAKIMACDKAACiDABgmw4jkKjBz3+yuAAAAABJRU5ErkJggg=="; // PNG 512x512 abu-abu

// seam e2e — inject nano-banana fake biar tes rantai gak nyamber API live
let _nbT2IFake = null;
export function _setNanoBananaT2IForTest(fn) { _nbT2IFake = fn; }

export async function nanoBananaText2Img(prompt, opts = {}) {
  const promptText = String(prompt || "").trim() || "sesuatu yang menarik dan indah";
  const fullPrompt = "This is a blank gray canvas. Generate and draw a completely new image covering the whole canvas: " + promptText + ". High quality, detailed.";
  // 🔹 RASIO (13 Sep): canvas dibikin SESUAI RASIO yang diminta user —
  // rasio canvas = rasio output nano-banana. Tanpa rasio → 512x512 (default lama).
  const ratio = String(opts?.ratio || "").trim();
  const dims = ratio && NANO_RATIO_PX[ratio] ? NANO_RATIO_PX[ratio] : null;
  const canvas = dims ? makeGrayCanvas(dims[0], dims[1]) : Buffer.from(NANO_CANVAS_B64, "base64");

  // 1. live3d (api-faa) — nano-banana
  try {
    const { live3d } = await import("../scraper/seaart.js");
    const out = await live3d(canvas, fullPrompt);
    if (out?.image && Buffer.isBuffer(out.image) && out.image.length > 5000) {
      return { base64: out.image.toString("base64"), mimeType: "image/png", via: "nano-banana" };
    }
  } catch (e) { console.log("[NanoBananaT2I] api-faa gagal:", String(e?.message || e).slice(0, 80)); }

  // 2. kuroneko nano-banana edit
  try {
    const { uploadToUguu, nanoBananaEdit } = await import("../scraper/kuroneko.js");
    const url = await uploadToUguu(canvas, "canvas.png");
    const editedUrl = await nanoBananaEdit(url, fullPrompt);
    const res = await fetch(editedUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error("download hasil " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5000) {
      return { base64: buf.toString("base64"), mimeType: res.headers.get("content-type")?.split(";")[0] || "image/png", via: "nano-banana (kuronoko)" };
    }
    throw new Error("hasil kosong " + buf.length + "B");
  } catch (e) { console.log("[NanoBananaT2I] kuroneko gagal:", String(e?.message || e).slice(0, 80)); }

  throw new Error("nano-banana text2img down");
}

/**
 * callImageGenChain — RANTAI provider image (request owner 12 Sep:
 * "jgn pakai ai polition, pakai nano banana dr aiclotheschanger").
 * gemini/nano-banana → xai → openai → qwen (yang punya key hidup) →
 * NANO-BANANA CANVAS (free tanpa key Google) → pollinations juru
 * penyelamat terakhir.
 */
export async function callImageGenChain(prompt, opts = {}) {
  // 🔹 RASIO (13 Sep): "kucing 9:16" → prompt "kucing" + ratio "9:16" —
  // rasio dideteksi SEKALI di sini biar SEMUA pemanggil (.agent, .novaagent,
  // autoflow) otomatis support tanpa parse sendiri-sendiri.
  const ex = extractImageRatio(prompt);
  const ratio = String(opts.ratio || ex.ratio || "").trim() || null;
  const promptClean = ex.prompt || String(prompt || "");
  // hint rasio natural-language buat provider key (gemini/xai/openai/qwen)
  // — prompt teksnya udah gak ada "9:16"-nya, hint ini jaga maksud user.
  const promptWithHint = ratio && ratio !== "1:1" ? `${promptClean} (aspect ratio ${ratio}, ${ratio === "9:16" || ratio === "2:3" || ratio === "3:4" ? "portrait" : "landscape"})` : promptClean;

  const IMAGE_CHAIN = ["gemini", "xai", "openai", "qwen"];
  const errs = [];
  for (const p of IMAGE_CHAIN) {
    let key = "";
    try { key = String(resolveApiKeyForProvider(p, {}) || "").trim(); } catch {}
    if (!key) continue; // gak ada key → skip (jangan buang waktu)
    try {
      const img = await callImageGen(p, promptWithHint, { ...opts, apiKey: key, noFreeFallback: true });
      if (img?.base64) return { ...img, via: img.via || p, ratio };
    } catch (e) {
      errs.push(`${p}: ${String(e?.message || e).slice(0, 80)}`);
      console.log(`[ImageGenChain] ${p} gagal → lanjut provider berikutnya`);
    }
  }
  // provider key mati/missing → NANO-BANANA canvas (request owner 12 Sep:
  // "jgn pakai ai polition, pakai nano banana") — sebelum pollinations
  try {
    const nbFn = _nbT2IFake || nanoBananaText2Img;
    const img = await nbFn(promptClean, { ratio });
    if (img?.base64) return { ...img, ratio };
  } catch (e) {
    errs.push("nano-banana: " + String(e?.message || e).slice(0, 80));
  }
  // semua beneran gagal → pollinations juru penyelamat TERAKHIR
  console.log(`[ImageGenChain] semua provider gagal${errs.length ? " (" + errs.join(" | ") + ")" : ""} → pollinations (free)`);
  const img = await callImageGen("gemini", promptWithHint, { ...opts, ratio }); // tanpa key → jalur pollinations
  return { ...img, ratio };
}

/**
 * Resolve API key per provider — cek global key, apikeys.json, dan aiConfig
 */
// 🔹 provider "anak" yang key-nya nimpa slot induknya
const KEY_ALIAS = { codestral: "mistral", kimicode: "kimi" };

function resolveApiKeyForProvider(rawProviderKey, aiConfig = {}) {
  const providerKey = KEY_ALIAS[rawProviderKey] || rawProviderKey;
  // 🔹 1) CONFIG BARU: src/lib/apikey/ai-providers.json — single source of
  // truth. Fitur AI satuan (.grok, .openai, .deepseek, ikyy_*, dll) ambil
  // key dari sini. Keluarga ikyy otomatis pakai shared key ikyy (kyzz).
  try {
    const fromCfg = getProviderApiKey(providerKey);
    if (fromCfg) return fromCfg;
  } catch {}
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

/**
 * callAI — versi ber-SESSION: pass sessionKey di opts biar AI inget obrolan
 * sebelumnya (nova-ai-session.js, persist + TTL 30 menit).
 * Tanpa sessionKey → perilaku lama (single-turn), 100% kompatibel.
 */
async function callAI(firstArg, secondArg) {
  const isStr = typeof firstArg === "string";
  const opts = isStr ? (secondArg || {}) : (firstArg || {});
  const sessionKey = opts.sessionKey || "";
  if (!sessionKey) return callAIRaw(firstArg, secondArg);

  const { toMessages, appendTurn } = await import("./nova-ai-session.js");
  const hist = toMessages(sessionKey).slice(-20);

  // giliran user terakhir (buat dicatat ke sesi)
  const lastUser = isStr
    ? firstArg
    : [...(opts.messages || [])].reverse().find((x) => x.role === "user")?.content || "";

  const reply = isStr
    ? await callAIRaw(firstArg, { ...secondArg, history: hist })
    : await callAIRaw({ ...firstArg, messages: [...hist, ...(firstArg.messages || [])] });

  appendTurn(sessionKey, lastUser, typeof reply === "string" ? reply : String(reply?.text || reply || ""));
  return reply;
}

async function callAIRaw(firstArg, secondArg) {
  // Support 2 call formats:
  // 1. callAI({ providerKey, messages, systemPrompt, ... }) — object format
  // 2. callAI(promptString, { systemPrompt, ... }) — string format (future plugins)
  let providerKey, model, messages, systemPrompt, apiKey, apiEndpoint, temperature, maxTokens, senderJid;

  if (typeof firstArg === "string") {
    // String format: callAI(prompt, { options })
    const opts = secondArg || {};
    messages = [...(Array.isArray(opts.history) ? opts.history : []), { role: "user", content: firstArg }];
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

  // 🔹 VISION: deteksi gambar duluan — request gambar GAK BOLEH turun ke
  // provider teks (ikyy dll), gambarnya bakal hilang diam-diam.
  const hasImage = (messages || []).some((x) => x.image?.data);

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
    providerKey !== "ikyy_gemini" &&
    !hasImage
  ) {
    const ikyyFallback = resolveProvider("ikyy_gemini", {});
    if (ikyyFallback) {
      activeProviderKey = "ikyy_gemini";
      activeProvider = ikyyFallback;
      console.log(`[AI-Service] key "${providerKey}" kosong → fallback ke IkyyXD Gemini (free)`);
    }
  }

  const effectiveModel = String(model || activeProvider.defaultModel);
  let normalizedMessages = normalizeMessages(messages, systemPrompt && activeProvider.supportsSystem ? systemPrompt : undefined);

  // 🔹 VISION: pesan bawa gambar (.image base64) → susun format konten sesuai
  // arsitektur provider. gemini: buildBody-nya udah baca m.image (inline_data
  // native) — biarkan apa adanya. anthropic: image block base64. lainnya
  // (openai-compat: groq/xai/mistral/dll): array image_url data URI.
  if (hasImage) {
    if (activeProvider.method === "GET" || activeProviderKey.startsWith("ikyy")) {
      // provider GET (ikyy dll) gak bisa terima gambar — JANGAN diem-diem
      // buang gambarnya; kasih error jelas biar pemanggil tahu harus pindah.
      throw new Error(`AI "${activeProviderKey}" tidak support gambar — pakai provider vision (.gemini/.openai/.claude/.groq/.grok)`);
    }
    if (providerKey !== "gemini") {
      normalizedMessages = normalizedMessages.map((x) => {
        if (!x.image?.data) return x;
        const mime = x.image.mimeType || "image/jpeg";
        if (activeProviderKey === "anthropic") {
          return {
            role: x.role,
            content: [
              { type: "text", text: String(x.content || "") },
              { type: "image", source: { type: "base64", media_type: mime, data: x.image.data } },
            ],
          };
        }
        return {
          role: x.role,
          content: [
            { type: "text", text: String(x.content || "") },
            { type: "image_url", image_url: { url: `data:${mime};base64,${x.image.data}` } },
          ],
        };
      });
    }
  }

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
    // gemini & sejenisnya bangun body sendiri (generationConfig) — inject
    // temperature/max_tokens top-level bikin 400 "Unknown name temperature"
    const finalBody = body2?.generationConfig || body2?.systemInstruction
      ? body2
      : { ...body2, temperature, max_tokens: maxTokens };
    const res = await fetch(finalUrl2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(effectiveApiKey ? prov.authHeader(effectiveApiKey) : prov.authHeader("")),
      },
      body: JSON.stringify(finalBody),
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
    if (activeProviderKey === "ikyy_gemini" || hasImage) throw mainErr; // ada gambar → jangan fallback ke provider teks (gambar bakal hilang diam2)
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
  // FIX 17 Sep 2026: db-first via getApiKey (.setkey gemini langsung
  // kepake tanpa restart) - dulunya cuma baca flat apikeys.json, jadi key
  // baru yang di-set owner lewat .setkey GAK PERNAH kepakai di jalur ini.
  if (!apiKey) {
    try {
      const { getApiKey } = await import("./nova-api-keys.js");
      apiKey = getApiKey("gemini") || "";
    } catch {}
  }
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



/**
 * callGeminiVision — analisis gambar via Google Gemini (multimodal native).
 * Dipakai buat .novaai scan gambar / selesaikan tugas dari foto, dll.
 * Key: apikeys.json "google" (dipakai juga oleh callGemini() teks biasa).
 * @param {string} prompt - Pertanyaan/instruksi soal gambar
 * @param {Buffer} imageBuffer - Buffer gambar
 * @param {object} opts - { apiKey, model, systemPrompt, mimeType, senderJid }
 * @returns {Promise<string>} Jawaban AI
 */
async function callGeminiVision(prompt, imageBuffer, opts = {}) {
  if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw new Error("Gambar tidak valid.");

  let apiKey = opts.apiKey || "";
  // FIX 17 Sep 2026: db-first via getApiKey (.setkey gemini langsung
  // kepake tanpa restart) - dulunya cuma baca flat apikeys.json, jadi key
  // baru yang di-set owner lewat .setkey GAK PERNAH kepakai di jalur ini.
  if (!apiKey) {
    try {
      const { getApiKey } = await import("./nova-api-keys.js");
      apiKey = getApiKey("gemini") || "";
    } catch {}
  }
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
  if (!apiKey) throw new Error("Google Gemini API key belum diset (owner: .setkey google <key>).");

  // FIX 17 Sep 2026: mime dari magic byte - WA kadang kirim PNG/WebP,
  // dulunya dihardcode image/jpeg (key valid pun bisa ditolak server).
  const b64Head = imageBuffer.subarray(0, 8).toString("base64");
  const detected = b64Head.startsWith("/9j/") ? "image/jpeg"
    : b64Head.startsWith("iVBOR") ? "image/png"
    : b64Head.startsWith("UklGR") ? "image/webp"
    : b64Head.startsWith("R0lGO") ? "image/gif" : "image/jpeg";
  const base64 = imageBuffer.toString("base64");
  const mimeType = opts.mimeType || detected;
  const model = opts.model || (await resolveLatestGeminiModel(apiKey).catch(() => FALLBACK_LATEST));

  return await callAI({
    providerKey: "gemini",
    apiKey,
    model,
    messages: [{ role: "user", content: prompt, image: { mimeType, data: base64 } }],
    systemPrompt: opts.systemPrompt || "",
    temperature: opts.temperature ?? 0.4,
    maxTokens: opts.maxTokens ?? 4096,
    senderJid: opts.senderJid || "",
  });
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
async function callIkyyRaw(prompt, opts = {}) {
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

  // Build messages with system prompt (+ riwayat sesi kalau ada)
  const messages = [...(Array.isArray(opts.history) ? opts.history : []), { role: "user", content: prompt }];
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
 * callIkyy — versi ber-SESSION: pass opts.sessionKey ("satuan:628xx") biar AI
 * inget obrolan sebelumnya (nova-ai-session.js, persist + TTL 30 menit).
 * Tanpa sessionKey → perilaku lama (single-turn).
 */
async function callIkyy(prompt, opts = {}) {
  const sessionKey = opts.sessionKey || "";
  if (!sessionKey) return callIkyyRaw(prompt, opts);
  const { toMessages, appendTurn } = await import("./nova-ai-session.js");
  const hist = toMessages(sessionKey).slice(-20);
  const reply = await callIkyyRaw(prompt, { ...opts, history: hist });
  appendTurn(sessionKey, prompt, typeof reply === "string" ? reply : String(reply?.text || reply || ""));
  return reply;
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
  callGeminiVision,
  resolveLatestGeminiModel,
  normalizeMessages,
};
