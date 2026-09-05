// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════
// 🔹 Tio AI Unified — .aitio <model> <prompt>
// 🔹 Semua model Tio dalam satu command, langsung pilih model
// 🔹 Format: .aitio <model_alias> <prompt>
// 🔹 Contoh: .aitio deepseek hai
//            .aitio kimi buatkan cerita
//            .aitio qwen jelaskan kuantum
// ═══════════════════════════════════════════════

import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getTioKey } from "../../src/lib/config/env-loader.js";

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

const TIO_MODELS = [
  // ── Auto / Router ──
  { id: "auto",              label: "Auto Router",        aliases: ["auto", "router"],          brand: "Auto",     free: false, desc: "Auto-route ke model terbaik" },
  { id: "openrouter/free",   label: "OpenRouter Free",   aliases: ["openrouter", "or"],        brand: "Auto",     free: true,  desc: "Auto-route gratis" },
  { id: "kilo-auto/free",    label: "Kilo Auto",          aliases: ["kilo", "kiloauto"],        brand: "Auto",     free: true,  desc: "Auto + image gen, gratis" },

  // ── DeepSeek ──
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash",  aliases: ["deepseek", "ds", "dsflash"], brand: "DeepSeek", free: false, desc: "Cepat & murah" },
  { id: "DeepSeek-V4-Pro",   label: "DeepSeek V4 Pro",    aliases: ["dspro", "deepseekpro"],    brand: "DeepSeek", free: false, desc: "Model terkuat DeepSeek" },
  { id: "deepseek-ai/DeepSeek-V4-Flash-0731", label: "DeepSeek V4 Flash 0731", aliases: ["ds0731", "dsflash0731"], brand: "DeepSeek", free: false, desc: "Versi 0731" },
  { id: "deepseek/deepseek-v4-pro-0813-free", label: "DeepSeek V4 Pro Free", aliases: ["dsfree", "deepseekfree"], brand: "DeepSeek", free: true, desc: "Pro gratis (rate limit 1/min)" },

  // ── Kimi / Moonshot ──
  { id: "moonshotai/Kimi-K2.6", label: "Kimi K2.6",      aliases: ["kimi", "moonshot"],        brand: "Kimi",     free: false, desc: "Flagship Moonshot" },

  // ── Qwen / Alibaba ──
  { id: "qwen/qwen3.8-max-free", label: "Qwen 3.8 Max Free", aliases: ["qwen", "qwenfree"],   brand: "Qwen",     free: true,  desc: "Qwen Max gratis" },
  { id: "Qwen3.6-35B-A3B-FP8",    label: "Qwen 3.6 35B",   aliases: ["qwen36", "qwen3.6"],     brand: "Qwen",     free: false, desc: "Efisien & cepat" },

  // ── NVIDIA ──
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron 3 Nano", aliases: ["nemotron", "nano", "nemotronnano"], brand: "NVIDIA", free: true, desc: "Reasoning 30B, gratis" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super", aliases: ["nemotronsuper", "super"], brand: "NVIDIA", free: true, desc: "120B, gratis" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free",  label: "Nemotron 3 Ultra", aliases: ["nemotronultra", "ultra"], brand: "NVIDIA", free: true, desc: "550B terbesar, gratis" },
  { id: "nvidia/nemotron-3.5-content-safety:free",  label: "Nemotron Safety", aliases: ["safety", "nemotronsafety"], brand: "NVIDIA", free: true, desc: "Content safety model" },

  // ── StepFun ──
  { id: "step-3.5-flash",                          label: "Step 3.5 Flash",   aliases: ["step", "step35", "step3.5"], brand: "StepFun", free: false, desc: "StepFun flash" },
  { id: "step-3.7-flash",                          label: "Step 3.7 Flash",   aliases: ["step37", "step3.7"],        brand: "StepFun", free: false, desc: "StepFun flash baru" },
  { id: "stepfun/step-3.7-flash:free",             label: "Step 3.7 Free",   aliases: ["stepfree", "step37free"],   brand: "StepFun", free: true,  desc: "StepFun gratis" },

  // ── Cohere ──
  { id: "cohere/north-mini-code:free", label: "Cohere North Mini", aliases: ["cohere", "north"],  brand: "Cohere",   free: true,  desc: "Code + chat, gratis" },

  // ── MiniMax ──
  { id: "MiniMaxAI/MiniMax-M2.7", label: "MiniMax M2.7", aliases: ["minimax", "mm"],         brand: "MiniMax",  free: false, desc: "Model MiniMax" },

  // ── Tencent ──
  { id: "tencent/hy3:free",  label: "Tencent HY3",   aliases: ["tencent", "hy3", "hunyuan"],  brand: "Tencent",  free: true,  desc: "Hunyuan, gratis" },

  // ── SenseNova ──
  { id: "sensenova-6.7-flash-lite", label: "SenseNova 6.7", aliases: ["sense", "sensenova"], brand: "SenseNova", free: false, desc: "Lite flash" },

  // ── Poolside ──
  { id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1", aliases: ["laguna", "poolside"], brand: "Poolside",  free: true,  desc: "Code model, gratis" },

  // ── Kat ──
  { id: "kat-coder-pro-v2.5", label: "Kat Coder Pro", aliases: ["kat", "katcoder"],         brand: "Kat",       free: false, desc: "Code specialist" },
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

async function callTio(model, messages, systemPrompt, apiKey) {
  const url = "https://ai.tioo.eu.org/v1/chat/completions";

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
      const lines = [
        `Pilih model langsung, semua dalam satu command`,
        ``,
        `Format: *${prefix}aitio <model> <prompt>*`,
        `Contoh: *${prefix}aitio deepseek halo*`,
        ``,
        `Model populer:`,
        `  deepseek  — DeepSeek V4 Flash`,
        `  kimi      — Kimi K2.6 (Moonshot)`,
        `  qwen      — Qwen 3.8 Max (Free)`,
        `  nemotron  — Nemotron 3 Nano (Free)`,
        `  cohere    — Cohere North Mini (Free)`,
        `  auto      — Auto Router`,
        ``,
        `Ketik *${prefix}aitio list* untuk lihat semua model`,
        `Ketik *${prefix}aitio list free* untuk model gratis`,
      ];
      await m.react("🐣");
      return m.reply(claraWrap("Tio AI", lines.join("\n")), "ai-tio");
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

      return m.reply(claraWrap("Daftar Model Tio AI" + (filterFree ? " (Free)" : ""), text), "ai-tio");
    }

    // ═══ Resolve model from first word ═══
    const model = resolveModel(firstWord);

    // If model is "Unknown" (not in registry) and there's only 1 word,
    // treat as error — user probably mistyped
    if (model.brand === "Unknown" && parts.length <= 1) {
      return m.reply(
        claraWrap("Tio AI", [
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
        claraWrap("Tio AI", [
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

    // Call Tio API
    const reply = await callTio(model.id, messages, systemPrompt, apiKey);

    // React done
    try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {}

    // Format reply
    const replyText = reply.length > 3800
      ? reply.slice(0, 3800) + "\n\n_... respon dipotong_"
      : reply;

    const freeTag = model.free ? " (Free)" : "";
    const response = claraWrap(
      `Tio AI — ${model.label}${freeTag}`,
      replyText
    );

    return m.reply(response, "ai-tio");

  } catch (error) {
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
    return m.reply(
      claraWrap("Tio AI Error", [
        `Status: *Gagal*`,
        `Error: *${error.message || "Unknown error"}*`,
      ].join("\n")),
      "ai-tio"
    );
  }
}

export { pluginConfig as config, handler };
