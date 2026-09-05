// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

/**
 * plugins/ai/openrouter.js
 * Command .openrouter — Multi-model AI via OpenRouter (semua model gratis dalam 1 plugin)
 * API: https://openrouter.ai/api/v1/chat/completions
 *
 * Cara pakai:
 * .openrouter <pesan> — Chat dengan model aktif
 * .openrouter model <nama_model> — Ganti model
 * .openrouter list — Lihat daftar model gratis
 * .openrouter reset — Reset sesi percakapan
 * .openrouter setkey <key> — Set API key (owner only)
 *
 * API Key: daftar gratis di https://openrouter.ai/keys
 * Set via .openrouter setkey sk-or-v1-xxxxx atau langsung di config.js
 */

const pluginConfig = {
  name: "openrouter",
  alias: ["openrouter"],
  category: "ai",
  description: "Multi-model AI via OpenRouter (DeepSeek, Llama, Gemini, Mistral, Qwen)",
  usage: ".openrouter <pesan>\n.openrouter model <nama>\n.openrouter list\n.openrouter reset\n.openrouter setkey <key>",
  example: ".openrouter jelaskan black hole",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Daftar model gratis di OpenRouter
const FREE_MODELS = {
  // DeepSeek
  "deepseek-r1": {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1 (Reasoning)",
    desc: "Model reasoning powerful, bagus untuk logika & matematika",
  },
  "deepseek-v3": {
    id: "deepseek/deepseek-chat:free",
    label: "DeepSeek V3 (Chat)",
    desc: "Chat umum, cepat, jawaban natural",
  },
  // Meta
  "llama-3.3-70b": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    desc: "Model Meta, bagus untuk teks panjang & coding",
  },
  "llama-3.1-405b": {
    id: "meta-llama/llama-3.1-405b-instruct:free",
    label: "Llama 3.1 405B",
    desc: "Model terbesar Meta, paling pintar di Llama series",
  },
  // Google
  "gemini-2.0-flash": {
    id: "google/gemini-2.0-flash-exp:free",
    label: "Gemini 2.0 Flash",
    desc: "Model Google, cepat & support vision",
  },
  // Mistral
  "mistral-7b": {
    id: "mistralai/mistral-7b-instruct:free",
    label: "Mistral 7B",
    desc: "Ringan & cepat, bagus untuk task sederhana",
  },
  "mistral-nemo": {
    id: "mistralai/mistral-nemo:free",
    label: "Mistral Nemo",
    desc: "Lebih besar dari Mistral 7B, multibahasa",
  },
  // Qwen
  "qwen-2.5-72b": {
    id: "qwen/qwen-2.5-72b-instruct:free",
    label: "Qwen 2.5 72B",
    desc: "Model Alibaba, bagus untuk bahasa non-Inggris",
  },
  "qwen-2.5-coder": {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    label: "Qwen 2.5 Coder 32B",
    desc: "Khusus coding & programming",
  },
  // Microsoft
  "phi-3-medium": {
    id: "microsoft/phi-3-medium-128k-instruct:free",
    label: "Phi-3 Medium 128K",
    desc: "Model Microsoft, context window 128K",
  },
};

// Default model
const DEFAULT_MODEL = "deepseek-v3";

// Session storage: userId -> { model, messages }
const sessions = new Map();

// API key storage (di-set via .openrouter setkey)
let apiKeyStore = "";

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      model: DEFAULT_MODEL,
      messages: [],
    });
  }
  return sessions.get(userId);
}

function resolveModel(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (FREE_MODELS[lower]) return FREE_MODELS[lower];
  // Cari by partial match
  for (const [key, model] of Object.entries(FREE_MODELS)) {
    if (key.includes(lower) || lower.includes(key)) return model;
  }
  // Coba langsung sebagai model ID
  return { id: input, label: input, desc: "Custom model" };
}

async function callOpenRouter(apiKey, modelId, messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device",
      "X-Title": "Nova AI WhatsApp Bot",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const reply = data?.choices?.[0]?.message?.content || "";
  if (!reply) throw new Error("AI balas kosong nih");

  return reply;
}

function formatModelList() {
  let text = "";
  for (const [key, model] of Object.entries(FREE_MODELS)) {
    text += `${model.label}\n   ID: ${key}\n   ${model.desc}\n\n`;
  }
  return text;
}

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const session = getSession(key);

  // Coba ambil API key dari config, env, atau store
  const apiKey = apiKeyStore
    || botConfig?.APIkey?.openrouter
    || process.env.OPENROUTER_API_KEY
    || "";

  // Sub-command: list
  if (text.toLowerCase() === "list" || text.toLowerCase() === "models") {
    const currentModel = FREE_MODELS[session.model]?.label || session.model;
    const body = `Model aktif: ${currentModel}\n\n${formatModelList()}\nGanti model: .openrouter model <nama>`;
    return m.reply( claraWrap("OpenRouter Models", body));
  }

  // Sub-command: model <nama>
  if (text.toLowerCase().startsWith("model ")) {
    const modelName = text.slice(6).trim();
    const model = resolveModel(modelName);
    if (!model) {
      return m.reply(claraWrap("OpenRouter", `Model "${modelName}" tidak ditemukan.\n\nKetik .openrouter list untuk lihat model tersedia.`));
    }
    session.model = modelName.toLowerCase();
    session.messages = []; // Reset context saat ganti model
    return m.reply(claraWrap("OpenRouter", `Model diganti ke: ${model.label}\nSesi direset untuk model baru.`));
  }

  // Sub-command: reset
  if (text.toLowerCase() === "reset") {
    session.messages = [];
    return m.reply(claraWrap("OpenRouter", "Sesi percakapan direset."));
  }

  // Sub-command: setkey (owner only)
  if (text.toLowerCase().startsWith("setkey ")) {
    if (!m.isOwner) {
      return m.reply(claraWrap("OpenRouter", "Hanya owner yang bisa set API key."));
    }
    const newKey = text.slice(7).trim();
    if (!newKey) {
      return m.reply(claraWrap("OpenRouter", "API key tidak boleh kosong.\nDaftar gratis di https://openrouter.ai/keys"));
    }
    apiKeyStore = newKey;
    return m.reply(claraWrap("OpenRouter", "API key OpenRouter tersimpan.\nDaftar model: .openrouter list"));
  }

  // Validasi API key sebelum chat
  if (!apiKey) {
    const help = `API key OpenRouter belum diatur.\n\nDaftar gratis di https://openrouter.ai/keys\n\nSet key (owner only):\n.openrouter setkey sk-or-v1-xxxxx\n\nAtau set di config.js:\nAPIkey: { openrouter: "sk-or-v1-xxxxx" }`;
    return m.reply( claraWrap("OpenRouter Setup", help));
  }

  // Validasi pesan
  if (!text) {
    const currentModel = FREE_MODELS[session.model]?.label || session.model;
    const help = `Model aktif: ${currentModel}\n\nCara pakai:\n.openrouter <pesan> — Chat dengan model aktif\n.openrouter model <nama> — Ganti model\n.openrouter list — Lihat semua model\n.openrouter reset — Reset sesi`;
    return m.reply( claraWrap("OpenRouter", help));
  }
  try {
  await m.react("🕒");
    // Resolve model ID
    const model = resolveModel(session.model) || FREE_MODELS[DEFAULT_MODEL];
    const modelId = model.id;

    // Tambahkan pesan user ke session
    session.messages.push({ role: "user", content: text });

    // Limit context ke 10 pesan terakhir
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    // Panggil API
    const reply = await callOpenRouter(apiKey, modelId, session.messages);

    // Simpan reply AI ke session
    session.messages.push({ role: "assistant", content: reply });
    return m.reply(claraWrap(`OpenRouter | ${model.label}`, reply));
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[openrouter.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    // Hapus pesan user yang gagal dari session
    session.messages.pop();

    let errMsg = error.message || "Gagal hubungin AI nih";

    // Hint untuk error umum
    if (errMsg.includes("rate limit") || errMsg.includes("429")) {
      errMsg += "\n\nModel ini udah mencapai limit harian. Coba model lain: .openrouter list";
    }
    if (errMsg.includes("No auth") || errMsg.includes("401")) {
      errMsg += "\n\nAPI key tidak valid. Set ulang: .openrouter setkey <key>";
    }

    await m.react("🐣");
    return m.reply(claraWrap("OpenRouter Error", errMsg));
  }
}

export { pluginConfig as config, handler };
