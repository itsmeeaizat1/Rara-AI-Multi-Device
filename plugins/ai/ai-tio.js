// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════
// 🔹 Tio AI Unified — .aitio <model> <prompt>
// 🔹 Semua model Tio dalam satu command, langsung pilih model
// 🔹 Format: .aitio <model_alias> <prompt>
// 🔹 Contoh: .aitio deepseek hai
//            .aitio kimi buatkan cerita
//            .aitio qwen jelaskan kuantum
// ═══════════════════════════════════════════════

import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { getTioKey, getTioEndpoint } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "ai-tio",
  alias: ["ai-tio", "aitio", "tio"],
  category: "ai",
  description: "Tanya AI via Tio AIO — pilih model langsung: .aitio <model> <prompt>",
  usage: ".aitio <model> <prompt>",
  example: ".aitio deepseek halo\n.aitio kimi buatkan cerita\n.aitio list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// MODEL REGISTRY — semua model Tio API
// id = actual model ID di Tio API
// aliases = nama pendek yang gampang diketik
// Semua model dipanggil via OpenAI format endpoint
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// MODEL REGISTRY — 9ROUTER V2 (9router.cloudku.us.kg)
// Tio lama (kktoken/gorouter/tioo) udah mati 19 Sep 2026 → diganti 9router v2.
// 21 model live (dicek via /v1/models). Semua dipanggil via OpenAI format endpoint.
// ═══════════════════════════════════════════════

const TIO_MODELS = [
  // ── Gemini Agent (default bot) ──
  { id: "ag/gemini-pro-agent",           label: "Gemini Pro Agent",      aliases: ["pro", "proagent", "gemini"], brand: "Gemini", free: false, desc: "Default bot — seimbang" },
  { id: "ag/gemini-3-flash",             label: "Gemini 3 Flash",       aliases: ["flash", "cepat", "g3f"],    brand: "Gemini", free: false, desc: "Tier cepat (~1.3 dtk)" },
  { id: "ag/gemini-3.1-pro-low",         label: "Gemini 3.1 Pro",       aliases: ["g31pro"],                   brand: "Gemini", free: false, desc: "Pro low" },

  // ── Gemini 3.8 (generasi terbaru) ──
  { id: "ag/gemini-3.8-flash-high",     label: "Gemini 3.8 High",      aliases: ["38high", "g38h"],           brand: "Gemini 3.8", free: false, desc: "3.8 reasoning tinggi" },
  { id: "ag/gemini-3.8-flash-medium",    label: "Gemini 3.8 Medium",    aliases: ["38med", "g38m"],           brand: "Gemini 3.8", free: false, desc: "3.8 sedang" },
  { id: "ag/gemini-3.8-flash-low",       label: "Gemini 3.8 Low",       aliases: ["38low", "g38l"],            brand: "Gemini 3.8", free: false, desc: "3.8 hemat" },
  { id: "ag/gemini-3.8-flash",           label: "Gemini 3.8 Flash",      aliases: ["38flash", "g38"],           brand: "Gemini 3.8", free: false, desc: "3.8 standar" },

  // ── Gemini 3.7 ──
  { id: "ag/gemini-3.7-flash-high",     label: "Gemini 3.7 High",      aliases: ["37high", "g37h"],           brand: "Gemini 3.7", free: false, desc: "3.7 reasoning tinggi" },
  { id: "ag/gemini-3.7-flash-medium",    label: "Gemini 3.7 Medium",    aliases: ["37med", "g37m"],            brand: "Gemini 3.7", free: false, desc: "3.7 sedang" },
  { id: "ag/gemini-3.7-flash-low",       label: "Gemini 3.7 Low",       aliases: ["37low", "g37l"],            brand: "Gemini 3.7", free: false, desc: "3.7 hemat" },

  // ── Gemini 3.6 ──
  { id: "ag/gemini-3.6-flash-high",     label: "Gemini 3.6 High",      aliases: ["36high", "g36h"],           brand: "Gemini 3.6", free: false, desc: "3.6 reasoning tinggi" },
  { id: "ag/gemini-3.6-flash-medium",    label: "Gemini 3.6 Medium",    aliases: ["36med", "g36m"],            brand: "Gemini 3.6", free: false, desc: "3.6 sedang" },
  { id: "ag/gemini-3.6-flash-low",       label: "Gemini 3.6 Low",       aliases: ["36low", "g36l"],            brand: "Gemini 3.6", free: false, desc: "3.6 hemat" },

  // ── Gemini 3.5 ──
  { id: "ag/gemini-3.5-flash-high",     label: "Gemini 3.5 High",      aliases: ["35high", "g35h"],           brand: "Gemini 3.5", free: false, desc: "3.5 reasoning tinggi" },
  { id: "ag/gemini-3.5-flash-low",       label: "Gemini 3.5 Low",       aliases: ["35low", "g35l"],            brand: "Gemini 3.5", free: false, desc: "3.5 hemat" },
  { id: "ag/gemini-3.5-flash-extra-low", label: "Gemini 3.5 XL",        aliases: ["35xl"],                     brand: "Gemini 3.5", free: false, desc: "3.5 paling hemat" },
  { id: "ag/gemini-3-flash-agent",       label: "Gemini 3 Flash Agent", aliases: ["g3agent"],                  brand: "Gemini 3", free: false, desc: "Flash versi agent" },

  // ── Claude ──
  { id: "ag/claude-sonnet-4-6",          label: "Claude Sonnet 4.6",    aliases: ["claude", "sonnet"],          brand: "Claude", free: false, desc: "Sonnet via 9router" },
  { id: "ag/claude-opus-4-6-thinking",   label: "Claude Opus 4.6",      aliases: ["opus", "opusthink"],         brand: "Claude", free: false, desc: "Opus thinking" },

  // ── Lain ──
  { id: "ag/gpt-oss-120b-medium",        label: "GPT-OSS 120B",         aliases: ["gptoss", "oss"],            brand: "OpenAI", free: false, desc: "Open-source 120B" },
  { id: "Coding",                        label: "Coding",               aliases: ["code", "coding"],           brand: "Tools", free: false, desc: "Spesialis ngoding" },
];

// ═══════════════════════════════════════════════
// MODEL RESOLVER — cari model by alias, id, atau label
// ═══════════════════════════════════════════════

function resolveModel(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();

  // 1. Exact match on id
  let found = TIO_MODELS.find(m => m.id === input);
  if (found) return found;

  // 2. Match on alias (case-insensitive)
  found = TIO_MODELS.find(m => m.aliases.some(a => a.toLowerCase() === lower));
  if (found) return found;

  // 3. Match on label (case-insensitive)
  found = TIO_MODELS.find(m => m.label.toLowerCase() === lower);
  if (found) return found;

  // 4. Fuzzy: underscore → hyphen, remove dots/slashes
  const normalized = lower.replace(/_/g, "-").replace(/[./]/g, "");
  found = TIO_MODELS.find(m => {
    const idNorm = m.id.toLowerCase().replace(/_/g, "-").replace(/[./]/g, "");
    return idNorm === normalized;
  });
  if (found) return found;

  // 5. Partial match on alias or id (contains)
  found = TIO_MODELS.find(m =>
    m.aliases.some(a => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase())) ||
    m.id.toLowerCase().includes(lower)
  );
  if (found) return found;

  // 6. Not in registry — return raw input (Tio API will validate)
  return { id: input, label: input, aliases: [], brand: "Unknown", free: false, desc: "Custom model" };
}

// ═══════════════════════════════════════════════
// API CALL — Tio API via OpenAI format
// ═══════════════════════════════════════════════

// brand Tio → brand Haidar (rantai fallback nova-ai-fallback.js)
// haidar menerima: gemini/claude/gpt5/gpt4/gpt4o/deepseek/googleai
const HAIDAR_BRAND = {
  DeepSeek: "deepseek",
  Auto: "gemini",
  Kimi: "gemini",
  Qwen: "gemini",
  NVIDIA: "gemini",
  StepFun: "gemini",
  Cohere: "gemini",
  MiniMax: "gemini",
  Tencent: "gemini",
  SenseNova: "gemini",
  Poolside: "gemini",
  Kat: "gemini",
};

async function callTio(model, messages, systemPrompt, apiKey) {
  const url = getTioEndpoint();

  const body = {
    model: model,
    messages: [],
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (systemPrompt) {
    body.messages.push({ role: "system", content: systemPrompt });
  }
  body.messages.push(...messages);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // gateway (kktoken.cc dst) ada WAF Cloudflare — UA browser biar gak langsung kena block
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson?.error?.message || errJson?.message || errMsg;
    } catch {
      if (errText) errMsg = errText.slice(0, 200);
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content
    || data?.choices?.[0]?.message?.reasoning
    || "";

  if (!reply) throw new Error("Response kosong dari Tio API");
  return reply;
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const apiKey = getTioKey();

  try {
  await m.react("🕒");
    const raw = m.text?.trim() || "";
    // Strip command prefix
    const body = raw
      .replace(/^\.ai-tio\s+/i, "")
      .replace(/^\.aitio\s+/i, "")
      .replace(/^\.tio\s+/i, "")
      .replace(/^\.asktio\s+/i, "")
      .trim();

    // ═══ No args → show help ═══
    if (!body) {
      await m.react("🐣");
      return m.reply(novaGuideV2("aitio", {
 kaomoji: "(๑>ᴗ<)و",
 sapaan: "pilih model langsung, semua dalam satu command! (≧∇≦)ﾉ",
        cara: "ketik nama model + promptnya sesudah command",
        contoh: `${prefix}aitio deepseek halo`,
        note: `model populer: deepseek, kimi, qwen, nemotron, cohere, auto · ${prefix}aitio list buat semua model`,
        spec: ["⏱ 5dtk", "💸 gratis"],
        extra: [
          `  deepseek  — DeepSeek V4 Flash`,
          `  kimi      — Kimi K2.6 (Moonshot)`,
          `  qwen      — Qwen 3.8 Max (Free)`,
          `  nemotron  — Nemotron 3 Nano (Free)`,
          `  cohere    — Cohere North Mini (Free)`,
          `  auto      — Auto Router`,
        ],
      }), "ai-tio");
    }

    const parts = body.split(/[ \t]+/).filter(Boolean);
    const firstWord = (parts[0] || "").toLowerCase();

    // ═══ "list" subcommand ═══
    if (firstWord === "list") {
      const filterFree = (parts[1] || "").toLowerCase() === "free";
      const models = TIO_MODELS.filter(m => filterFree ? m.free : true);

      const brandOrder = [
        "Auto", "DeepSeek", "Kimi", "Qwen", "NVIDIA",
        "StepFun", "Cohere", "MiniMax", "Tencent",
        "SenseNova", "Poolside", "Kat",
      ];

      const brands = {};
      for (const mdl of models) {
        if (!brands[mdl.brand]) brands[mdl.brand] = [];
        brands[mdl.brand].push(mdl);
      }

      let text = `Total: *${models.length} model*\n\n`;
      for (const brand of brandOrder) {
        const list = brands[brand];
        if (!list) continue;
        for (const mdl of list) {
          const aliasStr = mdl.aliases[0] ? ` (${mdl.aliases[0]})` : "";
          const freeTag = mdl.free ? " free" : "";
          text += `${mdl.label}${aliasStr}${freeTag}\n`;
        }
      }
      text += `\nPakai: *${prefix}aitio <alias> <prompt>*`;

      return m.reply(novaWrap("Daftar Model Tio AI" + (filterFree ? " (Free)" : ""), text), "ai-tio");
    }

    // ═══ Resolve model from first word ═══
    const model = resolveModel(firstWord);

    // If model is "Unknown" (not in registry) and there's only 1 word,
    // treat as error — user probably mistyped
    if (model.brand === "Unknown" && parts.length <= 1) {
      return m.reply(
        novaWrap("Tio AI", [
          `Model *${firstWord}* tidak dikenal`,
          `Ketik *${prefix}aitio list* untuk lihat semua model`,
          `Atau: *${prefix}aitio deepseek <pesan>*`,
        ].join("\n")),
        "ai-tio"
      );
    }

    // Prompt = everything after model name
    let prompt = parts.slice(1).join(" ").trim();

    if (!prompt) {
      return m.reply(
        novaWrap("Tio AI", [
          `Model: *${model.label}*`,
          `Pesan kosong!`,
          `Contoh: *${prefix}aitio ${model.aliases[0] || model.id} halo*`,
        ].join("\n")),
        "ai-tio"
      );
    }

    // Check API key
    if (!apiKey) {
      return m.reply(
        novaError("Tio AI", "API Key Tio belum di-set. Isi di src/lib/apikey/apikeys.json: tioApiKey"),
        "ai-tio"
      );
    }

    // React loading
    try { await sock.sendMessage(m.chat, { react: { text: "🕒", key: m.key } }); } catch {}

    // Build messages
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    const systemPrompt = botConfig.aiHelp?.systemPrompt
      || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    // Call Tio API — AI satuan STRICT (owner 14 Sep): gateway down / key ditolak
    // → tampilkan pesan error aslinya, JANGAN fallback ke AI lain (dulu lewat
    // rantai backup, sekarang nggak — biar jelas Tio-nya kenapa).
    const reply = await callTio(model.id, messages, systemPrompt, apiKey);
    const engineNote = "";

    // React done
    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}

    // Format reply
    const replyText = (reply.length > 3800
      ? reply.slice(0, 3800) + "\n\n_... respon dipotong_"
      : reply) + engineNote;

    const freeTag = model.free ? " (Free)" : "";
    const response = novaWrap(
      `Tio AI — ${model.label}${freeTag}`,
      replyText
    );

    return m.reply(response, "ai-tio");

  } catch (error) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    return m.reply(
      novaWrap("Tio AI Error", [
        `Status: *Gagal*`,
        `Error: *${error.message || "Unknown error"}*`,
      ].join("\n")),
      "ai-tio"
    );
  }
}

export { pluginConfig as config, handler };
