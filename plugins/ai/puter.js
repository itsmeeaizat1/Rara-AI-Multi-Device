// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/puter.js
 * Command .puter — Multi-model AI via Puter.com (unlimited, free)
 * API: https://api.puter.com/puterai/openai/v1/chat/completions
 *
 * Cara pakai:
 * .puter <pesan> — Chat dengan model aktif
 * .puter model <nama> — Ganti model
 * .puter list — Lihat daftar model
 * .puter reset — Reset sesi percakapan
 * .puter setkey <token> — Set Puter auth token (owner only)
 *
 * Token: daftar gratis di https://puter.com/dashboard → Create token
 */

const pluginConfig = {
  name: "puter",
  alias: ["puter"],
  category: "ai",
  description: "Multi-model AI via Puter (GPT, Claude, Gemini, Grok, DeepSeek, Llama)",
  usage: ".puter <pesan>\n.puter model <nama>\n.puter list\n.puter reset\n.puter setkey <token>",
  example: ".puter jelaskan black hole",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api.puter.com/puterai/openai/v1/chat/completions";

// Daftar model di Puter
const MODELS = {
  // OpenAI
  "gpt-5.4-nano": { label: "GPT-5.4 Nano", desc: "OpenAI, cepat & ringan" },
  "gpt-5.5": { label: "GPT-5.5", desc: "OpenAI, model terbaru" },
  "gpt-4o": { label: "GPT-4o", desc: "OpenAI, multimodal" },
  "gpt-4o-mini": { label: "GPT-4o Mini", desc: "OpenAI, versi ringan GPT-4o" },
  // Anthropic
  "claude-sonnet-5": { label: "Claude Sonnet 5", desc: "Anthropic, balanced & cepat" },
  "claude-opus-4": { label: "Claude Opus 4", desc: "Anthropic, paling pintar di Claude" },
  "claude-haiku-4": { label: "Claude Haiku 4", desc: "Anthropic, super cepat & ringan" },
  // Google
  "gemini-3.5-flash-lite": { label: "Gemini 3.5 Flash Lite", desc: "Google, cepat & murah" },
  "gemini-2.0-flash": { label: "Gemini 2.0 Flash", desc: "Google, support vision" },
  // xAI
  "grok-4-1-fast": { label: "Grok 4.1 Fast", desc: "xAI, cepat & real-time" },
  // DeepSeek
  "deepseek-chat": { label: "DeepSeek Chat", desc: "DeepSeek V3, chat umum" },
  "deepseek-reasoner": { label: "DeepSeek Reasoner", desc: "DeepSeek R1, reasoning powerful" },
  // Meta
  "llama-4-scout": { label: "Llama 4 Scout", desc: "Meta, 17B aktif parameter" },
  "llama-3.3-70b": { label: "Llama 3.3 70B", desc: "Meta, teks panjang & coding" },
  // Mistral
  "mistral-large": { label: "Mistral Large", desc: "Mistral, model terbesar" },
  "mistral-small": { label: "Mistral Small", desc: "Mistral, ringan & cepat" },
  // Qwen
  "qwen-2.5-72b": { label: "Qwen 2.5 72B", desc: "Alibaba, multibahasa" },
  // Kimi
  "kimi-k2": { label: "Kimi K2", desc: "Moonshot, context window besar" },
};

// Default model
const DEFAULT_MODEL = "gpt-5.4-nano";

// Session storage: userId -> { model, messages }
const sessions = new Map();

// Token storage (di-set via .puter setkey)
let tokenStore = "";

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
  if (MODELS[lower]) return lower;
  // Cari by partial match
  for (const key of Object.keys(MODELS)) {
    if (key.includes(lower) || lower.includes(key)) return key;
  }
  // Return as-is (custom model)
  return input;
}

async function callPuter(token, modelId, messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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
  if (!reply) throw new Error("Response AI kosong.");

  return reply;
}

function formatModelList() {
  let text = "";
  for (const [key, model] of Object.entries(MODELS)) {
    text += `${model.label}\n   ID: ${key}\n   ${model.desc}\n\n`;
  }
  return text;
}

async function handler(m, { sock, config: botConfig }) {
  const text = m.args.join(" ").trim();
  const key = sessionKey(m);
  const session = getSession(key);

  // Coba ambil token dari store, config, atau env
  const token = tokenStore
    || botConfig?.APIkey?.puter
    || process.env.PUTER_AUTH_TOKEN
    || "";

  // Sub-command: list
  if (text.toLowerCase() === "list" || text.toLowerCase() === "models") {
    const currentModel = MODELS[session.model]?.label || session.model;
    const body = `Model aktif: ${currentModel}\n\n${formatModelList()}\nGanti model: .puter model <id>`;
    return m.reply( claraWrap("Puter Models", body));
  }

  // Sub-command: model <nama>
  if (text.toLowerCase().startsWith("model ")) {
    const modelName = text.slice(6).trim();
    const resolved = resolveModel(modelName);
    if (!resolved) {
      return m.reply(claraWrap("Puter", `Model "${modelName}" tidak ditemukan.\n\nKetik .puter list untuk lihat model tersedia.`));
    }
    session.model = resolved;
    session.messages = [];
    const label = MODELS[resolved]?.label || resolved;
    return m.reply(claraWrap("Puter", `Model diganti ke: ${label}\nSesi direset untuk model baru.`));
  }

  // Sub-command: reset
  if (text.toLowerCase() === "reset") {
    session.messages = [];
    return m.reply(claraWrap("Puter", "Sesi percakapan direset."));
  }

  // Sub-command: setkey (owner only)
  if (text.toLowerCase().startsWith("setkey ")) {
    if (!m.isOwner) {
      return m.reply(claraWrap("Puter", "Hanya owner yang bisa set token."));
    }
    const newToken = text.slice(7).trim();
    if (!newToken) {
      return m.reply(claraWrap("Puter", "Token tidak boleh kosong.\nDaftar gratis di https://puter.com/dashboard lalu klik Create token"));
    }
    tokenStore = newToken;
    return m.reply(claraWrap("Puter", "Token Puter tersimpan.\nDaftar model: .puter list"));
  }

  // Validasi token sebelum chat
  if (!token) {
    const help = `Token Puter belum diatur.\n\nDaftar gratis di https://puter.com/dashboard lalu klik Create token\n\nSet token (owner only):\n.puter setkey <token>\n\nAtau set di config.js:\nAPIkey: { puter: "token-anda" }`;
    return m.reply( claraWrap("Puter Setup", help));
  }

  // Validasi pesan
  if (!text) {
    const currentModel = MODELS[session.model]?.label || session.model;
    const help = `Model aktif: ${currentModel}\n\nCara pakai:\n.puter <pesan> — Chat dengan model aktif\n.puter model <id> — Ganti model\n.puter list — Lihat semua model\n.puter reset — Reset sesi`;
    return m.reply( claraWrap("Puter", help));
  }

  await m.react("🕒");

  try {
    const modelId = session.model;

    // Tambahkan pesan user ke session
    session.messages.push({ role: "user", content: text });

    // Limit context ke 10 pesan terakhir
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    // Panggil API
    const reply = await callPuter(token, modelId, session.messages);

    // Simpan reply AI ke session
    session.messages.push({ role: "assistant", content: reply });

    await m.react("🐣");
    const label = MODELS[modelId]?.label || modelId;
    return m.reply(claraWrap(`Puter | ${label}`, reply));
  } catch (error) {
    await m.react("🐣");

    // Hapus pesan user yang gagal dari session
    session.messages.pop();

    let errMsg = error.message || "Gagal menghubungi AI.";

    if (errMsg.includes("401") || errMsg.includes("auth") || errMsg.includes("token")) {
      errMsg += "\n\nToken tidak valid. Set ulang: .puter setkey <token>";
    }
    if (errMsg.includes("429") || errMsg.includes("rate") || errMsg.includes("limit")) {
      errMsg += "\n\nRate limit tercapai. Coba lagi sebentar atau ganti model: .puter list";
    }

    return m.reply(claraWrap("Puter Error", errMsg));
  }
}

export { pluginConfig as config, handler };
