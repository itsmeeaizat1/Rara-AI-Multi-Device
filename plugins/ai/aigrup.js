// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,
  claraHeader,
  separator,
  tipText,
  claraWrap,
  claraLine,
} from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getJadibotSetting, setJadibotSetting } from "../../src/lib/nova-jadibot-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "aigroupchat",
  alias: ["aigrup", "aigroup", "aig"],
  category: "ai",
  description: "AI nimbrung otomatis di grup — ikut ngobrol tiap ada chat (atur format, model, on/off dari DM)",
  usage: ".aigroupchat <format> <model> on/off/status",
  example: ".aigroupchat openai deepseek-v4-flash:free on\n.aigroupchat gemini kimi-k3:free on\n.aigroupchat off",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// Format & Model definitions (sync dengan ai-tio.js)
// ═══════════════════════════════════════════════
const TIO_FORMATS = {
  openai: { label: "OpenAI", emoji: "🟢", apiKeyField: "openaiApiKey", modelField: "openaiModel", defaultModel: "deepseek-v4-flash:free" },
  gemini: { label: "Gemini", emoji: "🔵", apiKeyField: "geminiApiKey", modelField: "geminiModel", defaultModel: "deepseek-v4-flash:free" },
  anthropic: { label: "Anthropic", emoji: "🟣", apiKeyField: "anthropicApiKey", modelField: "anthropicModel", defaultModel: "deepseek-v4-flash:free" },
};

const FORMAT_ALIASES = {
  o: "openai", open: "openai", oai: "openai", gpt: "openai",
  g: "gemini", gem: "gemini", google: "gemini",
  a: "anthropic", ant: "anthropic", claude: "anthropic", antro: "anthropic",
};

// ═══════════════════════════════════════════════
// Model dikelompok per brand/family
// Semua model support 3 format: openai, gemini, anthropic
// ═══════════════════════════════════════════════
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

function resolveFormat(arg) {
  const lower = String(arg || "").toLowerCase().trim();
  if (TIO_FORMATS[lower]) return lower;
  if (FORMAT_ALIASES[lower]) return FORMAT_ALIASES[lower];
  return null;
}

// Get API key for a format: format-specific → fallback → env
function getKeyForFormat(aiHelp, fmtKey) {
  const fmt = TIO_FORMATS[fmtKey];
  const fmtKey2 = aiHelp[fmt.apiKeyField] || "";
  const fallback = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
  return fmtKey2 || fallback;
}

// ═══ AI Grup per-session jadibot ═══
// State disimpan di DB jadibot nomor itu (session/jadibot/<id>/data.json),
// default OFF — bot utama gak ngaruh dan gak kepengaruh.
async function handleSessionAigrup(m, ctx, prefix) {
  await m.react("🕒");
  const jadibotId = ctx.jadibotId;
  const raw = (m.text || "").replace(/^\.aigroupchat\s+/i, "").replace(/^\.aigrup\s+/i, "").replace(/^\.aigroup\s+/i, "").replace(/^\.aig\s+/i, "").trim();
  const args = raw.split(/[ \t]+/).filter(Boolean);
  const subcmd = (args[0] || "status").toLowerCase();

  const st = getJadibotSetting(jadibotId, "aigrup") || { enabled: false, probability: 10, format: "openai", model: "deepseek-v4-flash:free" };

  const isOn = st.enabled ? "ON \u2705" : "OFF \u274c";

  if (subcmd === "on" || subcmd === "aktif") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Ditolak", "Hanya owner session ini yang bisa menyalakan AI Grup."));
      return { handled: true };
    }
    st.enabled = true;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(claraWrap("AI Group Chat Aktif (Session Ini)", [
      `Status: *ON*`,
      `Berlaku: *hanya nomor bot ini*`,
      `Probability: *${st.probability}%*`,
      `100% respon kalau di-tag/reply`,
      `Matikan: *${prefix}aigroupchat off*`,
    ].join("\n")));
    return { handled: true };
  }

  if (subcmd === "off" || subcmd === "mati") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Ditolak", "Hanya owner session ini yang bisa mematikan AI Grup."));
      return { handled: true };
    }
    st.enabled = false;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(claraWrap("AI Group Chat Nonaktif (Session Ini)", [
      `Status: *OFF*`,
      `Bot ini tidak nimbrung lagi`,
      `Command biasa tetap jalan`,
    ].join("\n")));
    return { handled: true };
  }

  if (subcmd === "prob" || subcmd === "probability") {
    const prob = parseInt(args[1] || "0", 10);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      await m.reply(claraWrap("Probability", [`*${prefix}aigroupchat prob 30* \u2014 30% chance`, `Saat ini: *${st.probability}%*`].join("\n")));
      return { handled: true };
    }
    st.probability = prob;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(claraWrap("AI Group Chat", `\u2705 Probability session ini diatur ke *${prob}%*`));
    return { handled: true };
  }

  await m.react("🐣");
  // status / default
  await m.reply(claraWrap("AI Group Chat Status (Session Ini)", [
    `Status: *${isOn}*`,
    `Probability: *${st.probability}%*`,
    `Default nomor baru: *OFF* (harus ON manual)`,
    `Command: *${prefix}aigroupchat on* / *off* / *prob <0-100>*`,
    `_State ini terpisah dari bot utama_`,
  ].join("\n")));
  return { handled: true };
}

async function handler(m, ctx) {
    const { sock, config: botConfig } = ctx;
    const prefix = botConfig.command?.prefix || ".";
  try {
    // ── Session jadibot: state per-nomor, DEFAULT OFF saat pairing pertama ──
    // (request owner 10 Sep 2026 — jangan ikut flag global bot utama)
    if (ctx.isJadibot && ctx.jadibotId) return handleSessionAigrup(m, ctx, prefix);
  await m.react("🕒");
    const raw = (m.text || "").replace(/^\.aigroupchat\s+/i, "").replace(/^\.aigrup\s+/i, "").replace(/^\.aigroup\s+/i, "").replace(/^\.aig\s+/i, "").trim();
    const args = raw.split(/[ \t]+/).filter(Boolean);

    const db = getDatabase();
    if (!db?.db?.data) return m.reply(novaError("AIGrup", "Database belum siap nih"));
    if (!db.db.data.aigrup) db.db.data.aigrup = { enabled: false, groups: {}, probability: 10, format: "openai", model: "deepseek-v4-flash:free" };

    const aigrup = db.db.data.aigrup;
    const aiHelp = botConfig.aiHelp || {};
    const currentFmt = aigrup.format || "openai";
    const currentModel = aigrup.model || aiHelp.openaiModel || "deepseek-v4-flash:free";
    const currentKey = getKeyForFormat(aiHelp, currentFmt);
    const subcmd = (args[0] || "").toLowerCase();

    // ═══ Block dari grup ═══
    const blockFromGroup = async (action) => {
      if (m.isGroup) {
        await m.react("🐣");
        await m.reply(
          claraWrap("Ditolak", [`${action} hanya bisa dari *chat pribadi*`,
            `Bukan dari dalam grup`,
            `Alasan: keamanan`].join("\n"))
        );
        return true;
      }
      return false;
    };

    // ═══ status / no args ═══
    if (subcmd === "status" || !subcmd) {
      const fmtInfo = TIO_FORMATS[currentFmt];
      const enabledGroups = Object.entries(aigrup.groups || {}).filter(([, v]) => v).map(([k]) => k);
      const freeModels = TIO_MODELS.filter((mdl) => mdl.free);
      const text =
        claraWrap("AI Grup Status", [`Global: *${aigrup.enabled ? "ON ✅" : "OFF ❌"}*`,
          `Format: *${fmtInfo ? fmtInfo.label : currentFmt}* ${fmtInfo ? fmtInfo.emoji : ""}`,
          `Model: *${currentModel}*`,
          `API Key: *${currentKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `Probability: *${aigrup.probability}%*`,
          `Proactive: *${aigrup.proactiveInterval || 10} menit*`,
          `Grup aktif: *${enabledGroups.length}*`].join("\n")) +
        claraWrap("Command", [`*${prefix}aigroupchat openai <model> on* — set format+model, ON`, `*${prefix}aigroupchat gemini <model> on* — set format+model, ON`, `*${prefix}aigroupchat anthropic <model> on* — set format+model, ON`, `*${prefix}aigroupchat openai on* — pakai format OpenAI, ON`, `*${prefix}aigroupchat on* — pakai format saat ini, ON`, `*${prefix}aigroupchat off* — matikan`, `*${prefix}aigroupchat prob <0-100>* — atur probability respon`, `*${prefix}aigroupchat spam on/off* — toggle proactive`, `*${prefix}aigroupchat interval <menit>* — atur jeda ngomong`, `*${prefix}aigroupchat model* — lihat semua model`, `*${prefix}aigroupchat list* — lihat grup aktif`].join("\n")) +
        
        "\n" ;
      await m.reply(text);
      return { handled: true };
    }

    // ═══ model list - grouped by brand with emoji ═══
    if (subcmd === "model" || subcmd === "models") {
      // Group models by brand
      const brands = {};
      for (const mdl of TIO_MODELS) {
        if (!brands[mdl.brand]) brands[mdl.brand] = [];
        brands[mdl.brand].push(mdl);
      }

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

      let text = claraWrap("Daftar Model Tio AI", "🤖") + "\n\n";
      const freeCount = TIO_MODELS.filter(m => m.free).length;
      const premCount = TIO_MODELS.filter(m => !m.free).length;
      text += `Total: *${TIO_MODELS.length} model* | Free: *${freeCount}* | Premium: *${premCount}*\n\n`;

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

      text += "\n" +  "\n" ;
      await m.reply(text);
      return { handled: true };
    }

    // ═══ prob ═══
    if (subcmd === "prob" || subcmd === "probability") {
      if (await blockFromGroup("Atur probability")) return { handled: true };
      const prob = parseInt(args[1] || "0", 10);
      if (isNaN(prob) || prob < 0 || prob > 100) {
        await m.reply(
          claraWrap("Probability", [`*${prefix}aigroupchat prob 30* — 30% chance`,
            `Range: 0-100`,
            `Saat ini: *${aigrup.probability}%*`].join("\n"))
        );
        return { handled: true };
      }
      aigrup.probability = prob;
      db.save();
      await m.reply(claraWrap("AI Group Chat", `✅ Probability diatur ke *${prob}%*`));
      return { handled: true };
    }

    // ═══ list ═══
    if (subcmd === "list") {
      const groups = Object.entries(aigrup.groups || {}).filter(([, v]) => v);
      await m.reply(
        claraWrap("Grup AI Aktif", [`Global: *${aigrup.enabled ? "ON" : "OFF"}*`,
          `Grup terdaftar: *${groups.length}*`,
          `Proactive: *${aigrup.proactiveInterval || 10} menit*`,
          ...(groups.length ? groups.map(([gid]) => `${gid}`) : ["(kosong)"]),
        ])
      );
      return { handled: true };
    }

    // ═══ spam toggle (proactive messaging on/off) ═══
    if (subcmd === "spam" || subcmd === "proactive") {
      if (!m.isOwner) {
        await m.reply(claraWrap("Ditolak", ["Hanya owner yang bisa toggle proactive AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle proactive")) return { handled: true };
      const action = (args[1] || "").toLowerCase();

      if (action === "on") {
        aigrup.proactiveEnabled = true;
        db.save();
        try {
          const { restartProactiveTimer } = await import("../../src/lib/nova-aigrup-proactive.js");
          const { getSocket } = await import("../../src/connection.js");
          const sock = getSocket();
          if (sock) restartProactiveTimer(sock);
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          claraWrap("Proactive ON", [`Proactive: *ON*`,
            `Interval: *${aigrup.proactiveInterval || 10} menit*`,
            `Bot ngomong sendiri tiap interval`,
            `Jam aktif: 08:00-22:00`,
            `Max 3 grup/cycle, 8 pesan/grup/hari`].join("\n")) + "\n" 
        );
        return { handled: true };
      }

      if (action === "off") {
        aigrup.proactiveEnabled = false;
        db.save();
        try {
          const { stopProactiveTimer } = await import("../../src/lib/nova-aigrup-proactive.js");
          stopProactiveTimer();
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          claraWrap("Proactive OFF", [`Proactive: *OFF*`,
            `Bot tidak ngomong sendiri`,
            `Bot tetap respon kalau di-tag/reply`,
            `Nimbrung random tetap jalan`].join("\n")) + "\n" 
        );
        return { handled: true };
      }

      // Status spam
      await m.reply(
        claraWrap("Proactive Status",
        `Proactive: *${aigrup.proactiveEnabled !== false ? "ON ✅" : "OFF ❌"}*\n` +
        `Interval: *${aigrup.proactiveInterval || 10} menit*\n` +
        `Jam aktif: 08:00-22:00\n` +
        `Max 3 grup/cycle\n` +
        `Max 8 pesan/grup/hari\n\n` +
        `COMMAND:\n` +
        `*${prefix}aigroupchat spam on* — nyala\n` +
        `*${prefix}aigroupchat spam off* — mati\n` +
        `*${prefix}aigroupchat interval 30* — atur jeda`
      ));
      return { handled: true };
    }

    // ═══ interval (atur jeda proactive messaging) ═══
    if (subcmd === "interval" || subcmd === "jeda") {
      if (await blockFromGroup("Atur interval")) return { handled: true };
      const minutes = parseInt(args[1] || "0", 10);
      if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        await m.reply(
          claraWrap("Interval Proactive", [`*${prefix}aigroupchat interval 5* — tiap 5 menit (⚠️ beresiko)`,
            `*${prefix}aigroupchat interval 15* — tiap 15 menit`,
            `*${prefix}aigroupchat interval 10* — tiap 10 menit (default)`,
            `*${prefix}aigroupchat interval 60* — tiap 1 jam`,
            `*${prefix}aigroupchat interval 120* — tiap 2 jam`,
            `Range: 1-1440 menit`,
            `Saat ini: *${aigrup.proactiveInterval || 10} menit*`,
            `Bot aktif: 08:00-22:00`,
            `⚠️ Di bawah 10 menit = beresiko ban WA`].join("\n"))
        );
        return { handled: true };
      }

      if (minutes < 10) {
        aigrup.proactiveInterval = minutes;
        db.save();
        try {
          const { restartProactiveTimer } = await import("../../src/lib/nova-aigrup-proactive.js");
          const { getSocket } = await import("../../src/connection.js");
          const sock = getSocket();
          if (sock) restartProactiveTimer(sock);
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          claraWrap("Interval Diubah", [`Interval: *${minutes} menit*`,
            `⚠️ Di bawah 10 menit BERESIKO BAN WA`,
            `Bot bisa kena banned oleh WhatsApp`,
            `Disarankan min 30-60 menit`].join("\n")) + "\n" 
        );
        return { handled: true };
      }
      aigrup.proactiveInterval = minutes;
      db.save();
      // Restart timer
      try {
        const { restartProactiveTimer } = await import("../../src/lib/nova-aigrup-proactive.js");
        const { getSocket } = await import("../../src/connection.js");
        const sock = getSocket();
        if (sock) restartProactiveTimer(sock);
      } catch (e) { console.error('[aigrup.js]:', e.message); }
      await m.reply(claraWrap("AI Group Chat", `✅ Proactive interval diatur ke *${minutes} menit*

Bot akan ngomong sendiri tiap ${minutes} menit di grup yang aktif.`));
      return { handled: true };
    }

    // ═══ on (simple, pakai format saat ini) ═══
    if (subcmd === "on") {
      if (!m.isOwner) {
        await m.reply(claraWrap("Ditolak", ["Hanya owner yang bisa toggle AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      if (!currentKey) {
        await m.reply(
          claraWrap("API Key Belum Diisi", [`API Key untuk format *${TIO_FORMATS[currentFmt]?.label || currentFmt}* belum di-set`,
            `Set di config.js: aiHelp.${TIO_FORMATS[currentFmt]?.apiKeyField || "apiKey"}`].join("\n"))
        );
        return { handled: true };
      }
      aigrup.enabled = true;
      db.save();
      await m.reply(
        claraWrap("AI Grup Aktif", [`Status: *ON*`,
          `Format: *${TIO_FORMATS[currentFmt]?.label || currentFmt}*`,
          `Model: *${currentModel}*`,
          `Probability: *${aigrup.probability}%*`,
          `Bot nimbrung di semua grup`,
          `100% respon kalau di-tag/reply`].join("\n")) + "\n" 
      );
      return { handled: true };
    }

    // ═══ off ═══
    if (subcmd === "off") {
      if (!m.isOwner) {
        await m.reply(claraWrap("Ditolak", ["Hanya owner yang bisa toggle AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      aigrup.enabled = false;
      db.save();
      await m.reply(
        claraWrap("AI Grup Nonaktif", [`Status: *OFF*`,
          `Bot tidak nimbrung lagi`,
          `Command biasa tetap jalan`].join("\n")) + "\n" 
      );
      return { handled: true };
    }

    // ═══ Format-based commands ═══
    // .aigroupchat openai <model> on   → set format + model + ON
    // .aigroupchat openai <model>      → set format + model (no toggle)
    // .aigroupchat openai on           → set format + ON (default model)
    // .aigroupchat openai              → show models for this format
    const fmtKey = resolveFormat(subcmd);

    if (fmtKey) {
      if (await blockFromGroup("Set format/model AI Grup")) return { handled: true };

      const fmt = TIO_FORMATS[fmtKey];
      const apiKey = getKeyForFormat(aiHelp, fmtKey);

      // .aigroupchat openai (tanpa argumen lain) → tampilkan model
      if (args.length === 1) {
        // Group by brand
        const brands = {};
        for (const mdl of TIO_MODELS) {
          if (!brands[mdl.brand]) brands[mdl.brand] = [];
          brands[mdl.brand].push(mdl);
        }
        const emojiMap = {
          "Auto": "🔀", "DeepSeek": "🐉", "Kimi": "🌙", "Qwen": "🦁",
          "GLM": "🧠", "MiniMax": "📊", "NVIDIA": "💚", "StepFun": "👣",
          "Tencent": "🐧", "Xiaomi": "📱", "SenseTime": "👁️", "Cohere": "🔗",
          "InclusionAI": "🤝", "Poolside": "🏖️", "Coding": "💻",
        };
        let text2 = "";
        text2 += claraWrap(`${fmt.label.toUpperCase()} Format`, [
          `API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `Model saat ini: *${aigrup.format === fmtKey ? currentModel : fmt.defaultModel}*`,
          `Semua model support format ini`,
        ]);
        for (const [brand, models] of Object.entries(brands)) {
          const bemoji = emojiMap[brand] || "🤖";
          const lines = models.map((mdl) =>
            `  ${mdl.free ? "🆓" : "💎"} *${mdl.label}* (${mdl.id})`
          ).join("\n");
          text2 += claraWrap(brand.toUpperCase(), lines);
        }
        
        await m.reply(text2);
        return { handled: true };
      }

      // Cari "on" di args terakhir
      const lastArg = (args[args.length - 1] || "").toLowerCase();
      const turnOn = lastArg === "on";
      const modelArgs = turnOn ? args.slice(1, -1) : args.slice(1);
      const modelInput = modelArgs.join(" ").trim();

      // Kalau cuma ".aigroupchat openai on" → pakai default model
      if (!modelInput && turnOn) {
        if (!apiKey) {
          await m.reply(
            claraWrap("API Key Belum Diisi", [`API Key untuk *${fmt.label}* belum di-set`,
              `Set di config.js: aiHelp.${fmt.apiKeyField}`].join("\n"))
          );
          return { handled: true };
        }
        aigrup.format = fmtKey;
        aigrup.model = fmt.defaultModel;
        aigrup.enabled = true;
        db.save();
        await m.reply(
          claraWrap("AI Grup Aktif",
            `Status: *ON*\n` +
            `Format: *${fmt.label}*\n` +
            `Model: *${fmt.defaultModel}* (default)\n` +
            `Probability: *${aigrup.probability}%*`
          )
        );
        return { handled: true };
      }

      // Validasi model
      const foundModel = TIO_MODELS.find(
        (mdl) => mdl.id === modelInput || mdl.label.toLowerCase() === modelInput.toLowerCase()
      );

      if (!foundModel) {
        await m.reply(
          claraWrap("Model Tidak Ditemukan", [`Model *${modelInput}* tidak ada`,
            `Ketik *${prefix}aigroupchat model* untuk lihat semua`].join("\n"))
        );
        return { handled: true };
      }

      // Set format + model
      aigrup.format = fmtKey;
      aigrup.model = foundModel.id;

      if (turnOn) {
        if (!apiKey) {
          await m.reply(
            claraWrap("API Key Belum Diisi", [`API Key untuk *${fmt.label}* belum di-set`,
              `Set di config.js: aiHelp.${fmt.apiKeyField}`,
              `Model sudah disimpan, tapi bot belum ON`].join("\n"))
          );
          db.save();
          return { handled: true };
        }
        aigrup.enabled = true;
      }

      db.save();

      await m.reply(
        claraWrap("AI Grup Update",
          `Format: *${fmt.label}*\n` +
          `Model: *${foundModel.label}*\n` +
          `ID: *${foundModel.id}*\n` +
          `Gratis: *${foundModel.free ? "Ya ✅" : "Tidak 💎"}*\n` +
          `API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*\n` +
          `Status: *${aigrup.enabled ? "ON ✅" : "OFF (belum di-on)"}*\n` +
          `Probability: *${aigrup.probability}%*`
        )
      );
      return { handled: true };
    }

    // Unknown
    await m.reply(claraWrap("AI Group Chat", `❌ Command tidak dikenal.\n\nKetik *${prefix}aigroupchat status* untuk lihat panduan.`));
    return { handled: true };
  } catch (error) {
    console.error("[aigrup]", error);
    await m.reply(claraWrap("aigroupchat", `❌ Error: ${error.message || "Unknown"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
