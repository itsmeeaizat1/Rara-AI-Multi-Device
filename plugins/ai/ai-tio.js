// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ai-tio",
  alias: ["aitio", "aiotio", "aitio2"],
  category: "ai",
  description: "Tanya AI via Tio AIO - 3 format: .tio openai/gemini/anthropic <pesan>",
  usage: ".tio <format> <pertanyaan>",
  example: ".tio openai halo\n.tio gemini hai\n.tio anthropic hai",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// Tio AI - 34 models, semua support 3 format API
// Format = cara manggil API, bukan jenis model
// ═══════════════════════════════════════════════

const TIO_FORMATS = {
  openai: {
    label: "OpenAI",
    emoji: "🟢",
    providerKey: "tio_openai",
    endpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    defaultModel: "deepseek-v4-flash:free",
    apiKeyField: "openaiApiKey",
    modelField: "openaiModel",
  },
  gemini: {
    label: "Gemini",
    emoji: "🔵",
    providerKey: "tio_gemini",
    endpoint: null, // dynamic per model
    defaultModel: "deepseek-v4-flash:free",
    apiKeyField: "geminiApiKey",
    modelField: "geminiModel",
  },
  anthropic: {
    label: "Anthropic",
    emoji: "🟣",
    providerKey: "tio_anthropic",
    endpoint: "https://ai.tioo.eu.org/v1/messages",
    defaultModel: "deepseek-v4-flash:free",
    apiKeyField: "anthropicApiKey",
    modelField: "anthropicModel",
  },
};

// Daftar model tersedia di Tio AI - dikelompok per brand
// Semua model support 3 format: openai, gemini, anthropic
const TIO_MODELS = [
  // ── Auto / Router ──
  { id: "auto", label: "Auto Router", brand: "Auto", desc: "Auto-route ke model terbaik", free: false },
  { id: "openrouter/free", label: "OpenRouter", brand: "Auto", desc: "Auto-route gratis", free: true },
  { id: "step-router-v1", label: "Step Router V1", brand: "Auto", desc: "Router StepFun", free: false },
  { id: "kilo-auto/free", label: "Kilo Auto", brand: "Auto", desc: "Auto + image gen", free: true },

  // ── DeepSeek ──
  { id: "deepseek-v4-flash:free", label: "DeepSeek V4 Flash", brand: "DeepSeek", desc: "Cepat & gratis", free: true },
  { id: "DeepSeek-V4-Flash", label: "DeepSeek V4 Flash (Pro)", brand: "DeepSeek", desc: "Versi pro", free: false },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash (Alt)", brand: "DeepSeek", desc: "Endpoint alternatif", free: false },
  { id: "DeepSeek-V4-Pro", label: "DeepSeek V4 Pro", brand: "DeepSeek", desc: "Model terkuat DeepSeek", free: false },

  // ── Kimi / Moonshot ──
  { id: "kimi-k3:free", label: "Kimi K3", brand: "Kimi", desc: "Moonshot AI gratis", free: true },
  { id: "moonshotai/kimi-k3-free", label: "Kimi K3 (Alt)", brand: "Kimi", desc: "Endpoint alternatif", free: true },
  { id: "moonshotai/Kimi-K2.6", label: "Kimi K2.6", brand: "Kimi", desc: "Flagship Moonshot", free: false },

  // ── Qwen / Alibaba ──
  { id: "Qwen3.5-397B-A17B", label: "Qwen 3.5 (397B)", brand: "Qwen", desc: "Model besar Alibaba", free: false },
  { id: "Qwen3.6-35B-A3B", label: "Qwen 3.6 (35B)", brand: "Qwen", desc: "Efisien & cepat", free: false },

  // ── GLM / Zhipu (Claude-style) ──
  { id: "glm-5.2", label: "GLM 5.2", brand: "GLM", desc: "Zhipu AI terbaru", free: false },
  { id: "glm-5.1", label: "GLM 5.1", brand: "GLM", desc: "Zhipu AI", free: false },

  // ── MiniMax ──
  { id: "MiniMaxAI/MiniMax-M2.7", label: "MiniMax M2.7", brand: "MiniMax", desc: "Model MiniMax", free: false },

  // ── NVIDIA Nemotron ──
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron Ultra 550B", brand: "NVIDIA", desc: "Model terbesar NVIDIA", free: true },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super 120B", brand: "NVIDIA", desc: "Kuat & cepat", free: true },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron Nano 30B", brand: "NVIDIA", desc: "Reasoning kecil", free: true },
  { id: "nvidia/nemotron-3.5-content-safety:free", label: "Nemotron Safety", brand: "NVIDIA", desc: "Content safety", free: true },

  // ── StepFun ──
  { id: "stepfun/step-3.7-flash:free", label: "Step 3.7 Flash", brand: "StepFun", desc: "Gratis", free: true },
  { id: "step-3.7-flash", label: "Step 3.7 Flash (Pro)", brand: "StepFun", desc: "Versi pro", free: false },
  { id: "step-3.5-flash", label: "Step 3.5 Flash", brand: "StepFun", desc: "Versi lama", free: false },
  { id: "step-3.5-flash-2603", label: "Step 3.5 Flash 2603", brand: "StepFun", desc: "Build 2603", free: false },

  // ── Tencent ──
  { id: "tencent/hy3:free", label: "Tencent HY3", brand: "Tencent", desc: "Tencent AI gratis", free: true },

  // ── Xiaomi ──
  { id: "mimo-v2.5:free", label: "Mimo V2.5", brand: "Xiaomi", desc: "Xiaomi AI gratis", free: true },

  // ── SenseTime ──
  { id: "sensenova-6.7-flash-lite", label: "SenseNova 6.7", brand: "SenseTime", desc: "SenseTime flash", free: false },

  // ── Cohere ──
  { id: "cohere/north-mini-code:free", label: "Cohere North", brand: "Cohere", desc: "Coding model gratis", free: true },

  // ── InclusionAI ──
  { id: "inclusionai/ling-3.0-flash:free", label: "Ling 3.0 Flash", brand: "InclusionAI", desc: "Gratis", free: true },

  // ── Poolside ──
  { id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1", brand: "Poolside", desc: "Gratis", free: true },
  { id: "poolside/laguna-xs-2.1:free", label: "Laguna XS 2.1", brand: "Poolside", desc: "Gratis kecil", free: true },

  // ── Coding ──
  { id: "kat-coder-pro-v2.5", label: "Kat Coder Pro", brand: "Coding", desc: "Coding pro", free: false },
];

// Short alias map for formats
const FORMAT_ALIASES = {
  o: "openai", open: "openai", oai: "openai", gpt: "openai",
  g: "gemini", gem: "gemini", google: "gemini",
  a: "anthropic", ant: "anthropic", claude: "anthropic", antro: "anthropic",
};

function resolveFormat(arg) {
  const lower = String(arg || "").toLowerCase().trim();
  if (TIO_FORMATS[lower]) return lower;
  if (FORMAT_ALIASES[lower]) return FORMAT_ALIASES[lower];
  return null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const body = raw.replace(/^\.ai-tio\s+/i, "").replace(/^\.tio\s+/i, "").replace(/^\.aio\s+/i, "").replace(/^\.asktio\s+/i, "").trim();

    const aiHelp = botConfig.aiHelp || {};

    // Resolve API key per format: format-specific key → fallback key → env var
    function getKeyForFormat(fmtKey) {
      const fmt = TIO_FORMATS[fmtKey];
      const fmtKey2 = aiHelp[fmt.apiKeyField] || "";
      const fallback = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
      return fmtKey2 || fallback;
    }

    function hasAnyKey() {
      return !!(aiHelp.openaiApiKey || aiHelp.geminiApiKey || aiHelp.anthropicApiKey || aiHelp.apiKey || process.env.OPENAI_API_KEY);
    }

    const hasKey = hasAnyKey();

    // ═══ No args → show menu ═══
    if (!body) {
      const text =
        claraWrap("Tio AI (AIO)", [`◦ 34 model AI via *ai.tioo.eu.org*`,
          `◦ 3 Format: OpenAI / Gemini / Anthropic`,
          `◦ OpenAI Key: *${aiHelp.openaiApiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `◦ Gemini Key: *${aiHelp.geminiApiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `◦ Anthropic Key: *${aiHelp.anthropicApiKey ? "Terpasang ✅" : "Belum ❌"}*`].join("\n")) +
        claraWrap("ᴏᴘᴇɴᴀɪ ꜰᴏʀᴍᴀᴛ", [`  *${prefix}tio openai <pesan>*`, `  Endpoint: /v1/chat/completions`].join("\n")) +
        claraWrap("ɢᴇᴍɪɴɪ ꜰᴏʀᴍᴀᴛ", [`  *${prefix}tio gemini <pesan>*`, `  Endpoint: /v1beta/models/{model}:generateContent`].join("\n")) +
        claraWrap("ᴀɴᴛʜʀᴏᴘɪᴄ ꜰᴏʀᴍᴀᴛ", [`  *${prefix}tio anthropic <pesan>*`, `  Endpoint: /v1/messages`].join("\n")) +
        claraWrap("ᴄᴏᴍᴍᴀɴᴅ ʟᴀɪɴ", [`◦ *${prefix}tio model <format> <nama>* — ganti model`, `◦ *${prefix}tio list* — lihat semua model`, `◦ *${prefix}tio list free* — lihat model gratis`, `◦ Set API key di config.js:`, `    aiHelp.openaiApiKey / geminiApiKey / anthropicApiKey`].join("\n")) +
        
        "\n" ;

      await sendReplyWithNav(sock, m, text, "ai-tio");
      return { handled: true };
    }

    const parts = body.split(/[ \t]+/).filter(Boolean);
    const firstWord = (parts[0] || "").toLowerCase();

    // ═══ "list" subcommand - grouped by brand with emoji ═══
    if (firstWord === "list") {
      const filterFree = (parts[1] || "").toLowerCase() === "free";

      const emojiMap = {
        "Auto": "🔀", "DeepSeek": "🐉", "Kimi": "🌙", "Qwen": "🦁",
        "GLM": "🧠", "MiniMax": "📊", "NVIDIA": "💚", "StepFun": "👣",
        "Tencent": "🐧", "Xiaomi": "📱", "SenseTime": "👁️", "Cohere": "🔗",
        "InclusionAI": "🤝", "Poolside": "🏖️", "Coding": "💻",
      };

      const brandOrder = [
        "Auto", "DeepSeek", "Kimi", "Qwen", "GLM",
        "MiniMax", "NVIDIA", "StepFun", "Tencent", "Xiaomi",
        "SenseTime", "Cohere", "InclusionAI", "Poolside", "Coding",
      ];

      // Group by brand
      const brands = {};
      for (const mdl of TIO_MODELS) {
        if (filterFree && !mdl.free) continue;
        if (!brands[mdl.brand]) brands[mdl.brand] = [];
        brands[mdl.brand].push(mdl);
      }

      let text = "";
      const totalShown = Object.values(brands).reduce((a, b) => a + b.length, 0);
      text += `Total: *${totalShown} model*\n\n`;

      let num = 1;
      for (const brand of brandOrder) {
        const models = brands[brand];
        if (!models) continue;
        const modelNames = models.map((mdl) =>
          mdl.free ? `${mdl.label} (free)` : mdl.label
        ).join(", ");
        text += `${num}. *${brand}:* ${modelNames}\n`;
        num++;
      }


      await m.reply(claraWrap("Daftar Model Tio AI" + (filterFree ? " (Free)" : ""), text));
      return { handled: true };
    }

    // ═══ "model" subcommand ═══
    if (firstWord === "model") {
      const fmtArg = (parts[1] || "").toLowerCase();
      const modelArg = parts.slice(2).join(" ").trim();

      if (!fmtArg || !modelArg) {
        const text =
          claraWrap("Ganti Model", [`◦ *${prefix}tio model openai deepseek-v4-flash:free*`,
            `◦ *${prefix}tio model gemini kimi-k3:free*`,
            `◦ *${prefix}tio model anthropic auto*`,
          `◦ Set API key di config.js:`,
          `    aiHelp.openaiApiKey / geminiApiKey / anthropicApiKey`,
            `◦ *${prefix}tio list* — lihat semua model`].join("\n"));
        await sendReplyWithNav(sock, m, text, "ai-tio");
        return { handled: true };
      }

      const fmtKey = resolveFormat(fmtArg);
      if (!fmtKey) {
        const text =
          claraWrap("Format Tidak Valid", [`◦ Format *${fmtArg}* tidak dikenal`,
            `◦ Pilih: openai / gemini / anthropic`].join("\n"));
        await sendReplyWithNav(sock, m, text, "ai-tio");
        return { handled: true };
      }

      const fmt = TIO_FORMATS[fmtKey];
      const found = TIO_MODELS.find(
        (mdl) => mdl.id === modelArg || mdl.label.toLowerCase() === modelArg.toLowerCase()
      );

      if (!found) {
        const text =
          claraWrap("Model Tidak Ditemukan", [`◦ Model *${modelArg}* tidak ada`,
            `◦ Ketik *${prefix}tio list* untuk lihat semua model`].join("\n"));
        await sendReplyWithNav(sock, m, text, "ai-tio");
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp[fmt.modelField || (fmtKey + "Model")] = found.id;

      const text =
        claraWrap("Model Diganti", [`◦ Format: *${fmt.label}*`,
          `◦ Model: *${found.label}*`,
          `◦ ID: *${found.id}*`,
          `◦ ${found.desc}`,
          `◦ Gratis: *${found.free ? "Ya ✅" : "Tidak 💎"}*`].join("\n")) +
        "\n" ;
      await m.reply(text);
      return { handled: true };
    }

    // ═══ Main: .tio <format> <pesan> ═══
    const fmtKey = resolveFormat(firstWord);

    if (!fmtKey) {
      const text =
        claraWrap("Format Tidak Dikenal", [`◦ Format *${parts[0]}* tidak dikenal`,
          `◦ Pilih: *openai* / *gemini* / *anthropic*`,
          `◦ Contoh: *${prefix}tio openai halo*`].join("\n")) +
        "\n" ;
      await sendReplyWithNav(sock, m, text, "ai-tio");
      return { handled: true };
    }

    const fmt = TIO_FORMATS[fmtKey];
    const prompt = parts.slice(1).join(" ").trim();

    if (!prompt) {
      const text = claraWrap("Tio AI - Kosong",
        `◦ Pesan tidak boleh kosong\n` +
        `◦ Contoh: *${prefix}tio ${fmtKey} halo*`,
        "error"
      );
      await sendReplyWithNav(sock, m, text, "ai-tio");
      return { handled: true };
    }

    // Check API key for this format
    const apiKey = getKeyForFormat(fmtKey);
    if (!apiKey) {
      const text =
        claraWrap("API Key Belum Diisi", [`◦ API Key untuk format *${fmt.label}* belum di-set`,
          `◦ Set di config.js: aiHelp.${fmt.apiKeyField}`,
          `◦ Atau pakai fallback: aiHelp.apiKey`].join("\n"));
      await sendReplyWithNav(sock, m, text, "ai-tio");
      return { handled: true };
    }

    // Get model for this format
    const model = aiHelp[fmtKey + "Model"] || aiHelp[fmt.modelField] || fmt.defaultModel;
    const systemPrompt = aiHelp.systemPrompt || "Kamu adalah Nova AI, asisten yang ramah dan cerdas. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

    // Build messages
    const messages = [];
    if (m.quoted && m.quoted.text) {
      messages.push({ role: "assistant", content: m.quoted.text });
    }
    messages.push({ role: "user", content: prompt });

    // Set endpoint (Gemini is dynamic per model)
    const apiEndpoint = fmtKey === "gemini"
      ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
      : fmt.endpoint;

    // Call AI
    m.react("🕐");
    const reply = await callAI({
      providerKey: fmt.providerKey,
      model: model,
      messages: messages,
      systemPrompt: systemPrompt,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Find model label
    const modelInfo = TIO_MODELS.find((mdl) => mdl.id === model);
    const modelLabel = modelInfo?.label || model;
    const replyText = reply.length > 3800 ? reply.slice(0, 3800) + "\n\n_... respon dipotong_" : reply;

        const text = claraWrap("Tio AI",
      `Format: *${fmt.label}*\n` +
      `Model: *${modelLabel}*\n` +
      `Pertanyaan: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*\n` +
      replyText
    );

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Tio AI Error", [`◦ Status: *Gagal*`,
        `◦ Error: *${error.message || "Unknown error"}*`].join("\n")) +
      "\n" ;
    await sendReplyWithNav(sock, m, text, "ai-tio");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
