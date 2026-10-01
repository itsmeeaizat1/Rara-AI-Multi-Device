// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,
  raraHeader,
  separator,
  tipText,
  raraWrap,
  raraLine,
} from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getMin1aiKey } from "../../src/scraper/min1ai.js";
import { getJadibotSetting, setJadibotSetting } from "../../src/lib/rara-jadibot-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "aigroupchat",
  alias: ["aigrup", "aigroup", "aig"],
  category: "ai",
  description: "AI nimbrung otomatis di grup — engine GLM Thinking Min1AI (atur model, on/off dari DM)",
  usage: ".aigroupchat glm <model> on/off/status",
  example: ".aigroupchat glm glm-5.3 on\n.aigroupchat glm glm-5.2 on\n.aigroupchat off",
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
// ENGINE BARU (owner 29 Sep): Min1AI (1min.ai) — GLM thinking.
// Key: apikeys.json aiSatuan.min1ai (fallback env MIN1AI_API_KEY) — bukan aiHelp.
const TIO_FORMATS = {
  min1ai: { label: "Min1AI (1min.ai)", emoji: "🧠", apiKeyField: "min1aiApiKey", modelField: "min1aiModel", defaultModel: "glm-5.3" },
};

const FORMAT_ALIASES = {
  glm: "min1ai", m: "min1ai", min1: "min1ai", "1min": "min1ai", onemin: "min1ai",
  // alias era 9router lama → dialihkan ke min1ai biar state lama gak nyasar
  o: "min1ai", open: "min1ai", oai: "min1ai", gpt: "min1ai", openai: "min1ai",
  g: "min1ai", gem: "min1ai", google: "min1ai", gemini: "min1ai",
  a: "min1ai", ant: "min1ai", claude: "min1ai", antro: "min1ai", anthropic: "min1ai",
};

// ═══════════════════════════════════════════════
// Model GLM 1min.ai (Min1AI) — engine aigroupchat
// ═══════════════════════════════════════════════
// Katalog GLM 1min.ai (verified live 29 Sep 2026). glm-5.3 = flagship
// REASONING/THINKING — berpikir dulu sebelum jawab (owner: "jgn yg glm flash").
// Gak ada varian "-thinking"/"-flash" di 1min.ai (UNSUPPORTED_MODEL).
const TIO_MODELS = [
  { id: "glm-5.3", label: "GLM 5.3 (Thinking)", brand: "GLM", desc: "GLM thinking flagship — berpikir dulu, default", free: false },
  { id: "glm-5.2", label: "GLM 5.2", brand: "GLM", desc: "Zhipu AI", free: false },
  { id: "glm-5.1", label: "GLM 5.1", brand: "GLM", desc: "Zhipu AI", free: false },
  { id: "glm-5", label: "GLM 5", brand: "GLM", desc: "GLM 5 base", free: false },
];

function resolveFormat(arg) {
  const lower = String(arg || "").toLowerCase().trim();
  if (TIO_FORMATS[lower]) return lower;
  if (FORMAT_ALIASES[lower]) return FORMAT_ALIASES[lower];
  return null;
}

// Key min1ai: apikeys.json aiSatuan.min1ai → env MIN1AI_API_KEY
async function getKeyForFormat() {
  return getMin1aiKey();
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

  const st = getJadibotSetting(jadibotId, "aigrup") || { enabled: false, probability: 10, format: "min1ai", model: "glm-5.3" };

  const isOn = st.enabled ? "ON \u2705" : "OFF \u274c";

  if (subcmd === "on" || subcmd === "aktif") {
    if (!m.isOwner) {
      await m.reply(raraWrap("Ditolak", "Hanya owner session ini yang bisa menyalakan AI Grup."));
      return { handled: true };
    }
    st.enabled = true;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(raraWrap("AI Group Chat Aktif (Session Ini)", [
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
      await m.reply(raraWrap("Ditolak", "Hanya owner session ini yang bisa mematikan AI Grup."));
      return { handled: true };
    }
    st.enabled = false;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(raraWrap("AI Group Chat Nonaktif (Session Ini)", [
      `Status: *OFF*`,
      `Bot ini tidak nimbrung lagi`,
      `Command biasa tetap jalan`,
    ].join("\n")));
    return { handled: true };
  }

  if (subcmd === "prob" || subcmd === "probability") {
    const prob = parseInt(args[1] || "0", 10);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      await m.reply(raraWrap("Probability", [`*${prefix}aigroupchat prob 30* \u2014 30% chance`, `Saat ini: *${st.probability}%*`].join("\n")));
      return { handled: true };
    }
    st.probability = prob;
    setJadibotSetting(jadibotId, "aigrup", st);
    await m.react("🐣");
    await m.reply(raraWrap("AI Group Chat", `\u2705 Probability session ini diatur ke *${prob}%*`));
    return { handled: true };
  }

  await m.react("🐣");
  // status / default
  await m.reply(raraWrap("AI Group Chat Status (Session Ini)", [
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
    if (!db?.db?.data) return m.reply(raraError("AIGrup", "Database belum siap nih"));
    if (!db.db.data.aigrup) db.db.data.aigrup = { enabled: false, groups: {}, probability: 10, format: "min1ai", model: "glm-5.3" };

    const aigrup = db.db.data.aigrup;
    const aiHelp = botConfig.aiHelp || {};
    // migrasi state era 9router (openai/gemini/anthropic/deepseek/ag/*) → min1ai glm-5.3
    const currentFmt = resolveFormat(aigrup.format) || "min1ai";
    const currentModel = /^glm-/.test(String(aigrup.model)) ? aigrup.model : "glm-5.3";
    const currentKey = await getKeyForFormat();
    const subcmd = (args[0] || "").toLowerCase();

    // ═══ Block dari grup ═══
    const blockFromGroup = async (action) => {
      if (m.isGroup) {
        await m.react("🐣");
        await m.reply(
          raraWrap("Ditolak", [`${action} hanya bisa dari *chat pribadi*`,
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
        raraWrap("AI Grup Status", [`Global: *${aigrup.enabled ? "ON ✅" : "OFF ❌"}*`,
          `Format: *${fmtInfo ? fmtInfo.label : currentFmt}* ${fmtInfo ? fmtInfo.emoji : ""}`,
          `Model: *${currentModel}*`,
          `API Key: *${currentKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `Probability: *${aigrup.probability}%*`,
          `Proactive: *${aigrup.proactiveInterval || 10} menit*`,
          `Grup aktif: *${enabledGroups.length}*`].join("\n")) +
        raraWrap("Command", [`*${prefix}aigroupchat glm <model> on* — set model GLM, ON`, `*${prefix}aigroupchat glm on* — pakai model default (glm-5.3), ON`, `*${prefix}aigroupchat on* — pakai model saat ini, ON`, `*${prefix}aigroupchat off* — matikan`, `*${prefix}aigroupchat prob <0-100>* — atur probability respon`, `*${prefix}aigroupchat spam on/off* — toggle proactive`, `*${prefix}aigroupchat interval <menit>* — atur jeda ngomong`, `*${prefix}aigroupchat model* — lihat semua model`, `*${prefix}aigroupchat list* — lihat grup aktif`].join("\n")) +
        
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

      let text = raraWrap("Daftar Model Tio AI", "🤖") + "\n\n";
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
          raraWrap("Probability", [`*${prefix}aigroupchat prob 30* — 30% chance`,
            `Range: 0-100`,
            `Saat ini: *${aigrup.probability}%*`].join("\n"))
        );
        return { handled: true };
      }
      aigrup.probability = prob;
      db.save();
      await m.reply(raraWrap("AI Group Chat", `✅ Probability diatur ke *${prob}%*`));
      return { handled: true };
    }

    // ═══ list ═══
    if (subcmd === "list") {
      const groups = Object.entries(aigrup.groups || {}).filter(([, v]) => v);
      await m.reply(
        raraWrap("Grup AI Aktif", [`Global: *${aigrup.enabled ? "ON" : "OFF"}*`,
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
        await m.reply(raraWrap("Ditolak", ["Hanya owner yang bisa toggle proactive AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle proactive")) return { handled: true };
      const action = (args[1] || "").toLowerCase();

      if (action === "on") {
        aigrup.proactiveEnabled = true;
        db.save();
        try {
          const { restartProactiveTimer } = await import("../../src/lib/rara-aigroupchat-proactive.js");
          const { getSocket } = await import("../../src/connection.js");
          const sock = getSocket();
          if (sock) restartProactiveTimer(sock);
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          raraWrap("Proactive ON", [`Proactive: *ON*`,
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
          const { stopProactiveTimer } = await import("../../src/lib/rara-aigroupchat-proactive.js");
          stopProactiveTimer();
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          raraWrap("Proactive OFF", [`Proactive: *OFF*`,
            `Bot tidak ngomong sendiri`,
            `Bot tetap respon kalau di-tag/reply`,
            `Nimbrung random tetap jalan`].join("\n")) + "\n" 
        );
        return { handled: true };
      }

      // Status spam
      await m.reply(
        raraWrap("Proactive Status",
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
          raraWrap("Interval Proactive", [`*${prefix}aigroupchat interval 5* — tiap 5 menit (⚠️ beresiko)`,
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
          const { restartProactiveTimer } = await import("../../src/lib/rara-aigroupchat-proactive.js");
          const { getSocket } = await import("../../src/connection.js");
          const sock = getSocket();
          if (sock) restartProactiveTimer(sock);
        } catch (e) { console.error('[aigrup.js]:', e.message); }
        await m.reply(
          raraWrap("Interval Diubah", [`Interval: *${minutes} menit*`,
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
        const { restartProactiveTimer } = await import("../../src/lib/rara-aigroupchat-proactive.js");
        const { getSocket } = await import("../../src/connection.js");
        const sock = getSocket();
        if (sock) restartProactiveTimer(sock);
      } catch (e) { console.error('[aigrup.js]:', e.message); }
      await m.reply(raraWrap("AI Group Chat", `✅ Proactive interval diatur ke *${minutes} menit*

Bot akan ngomong sendiri tiap ${minutes} menit di grup yang aktif.`));
      return { handled: true };
    }

    // ═══ on (simple, pakai format saat ini) ═══
    if (subcmd === "on") {
      if (!m.isOwner) {
        await m.reply(raraWrap("Ditolak", ["Hanya owner yang bisa toggle AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      if (!currentKey) {
        await m.reply(
          raraWrap("API Key Belum Diisi", [`API Key Min1AI (1min.ai) belum di-set`,
            `Set: .setkey min1ai <key> (atau apikeys.json aiSatuan.min1ai)`].join("\n"))
        );
        return { handled: true };
      }
      aigrup.enabled = true;
      db.save();
      await m.reply(
        raraWrap("AI Grup Aktif", [`Status: *ON*`,
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
        await m.reply(raraWrap("Ditolak", ["Hanya owner yang bisa toggle AI Grup."].join("\n")));
        return { handled: true };
      }
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      aigrup.enabled = false;
      db.save();
      await m.reply(
        raraWrap("AI Grup Nonaktif", [`Status: *OFF*`,
          `Bot tidak nimbrung lagi`,
          `Command biasa tetap jalan`].join("\n")) + "\n" 
      );
      return { handled: true };
    }

    // ═══ Format-based commands ═══
    // .aigroupchat glm <model> on       → set model GLM + ON
    // .aigroupchat glm <model>          → set model (no toggle)
    // .aigroupchat glm on               → ON pakai default model (glm-5.3)
    // .aigroupchat glm                  → lihat semua model GLM
    const fmtKey = resolveFormat(subcmd);

    if (fmtKey) {
      if (await blockFromGroup("Set format/model AI Grup")) return { handled: true };

      const fmt = TIO_FORMATS[fmtKey];
      const apiKey = await getKeyForFormat();

      // .aigroupchat glm (tanpa argumen lain) → tampilkan model
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
        text2 += raraWrap(`${fmt.label.toUpperCase()} Format`, [
          `API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `Model saat ini: *${aigrup.format === fmtKey ? currentModel : fmt.defaultModel}*`,
          `Semua model support format ini`,
        ]);
        for (const [brand, models] of Object.entries(brands)) {
          const bemoji = emojiMap[brand] || "🤖";
          const lines = models.map((mdl) =>
            `  ${mdl.free ? "🆓" : "💎"} *${mdl.label}* (${mdl.id})`
          ).join("\n");
          text2 += raraWrap(brand.toUpperCase(), lines);
        }
        
        await m.reply(text2);
        return { handled: true };
      }

      // Cari "on" di args terakhir
      const lastArg = (args[args.length - 1] || "").toLowerCase();
      const turnOn = lastArg === "on";
      const modelArgs = turnOn ? args.slice(1, -1) : args.slice(1);
      const modelInput = modelArgs.join(" ").trim();

      // Kalau cuma ".aigroupchat glm on" → pakai default model
      if (!modelInput && turnOn) {
        if (!apiKey) {
          await m.reply(
            raraWrap("API Key Belum Diisi", [`API Key Min1AI (1min.ai) belum di-set`,
            `Set: .setkey min1ai <key> (atau apikeys.json aiSatuan.min1ai)`].join("\n"))
          );
          return { handled: true };
        }
        aigrup.format = fmtKey;
        aigrup.model = fmt.defaultModel;
        aigrup.enabled = true;
        db.save();
        await m.reply(
          raraWrap("AI Grup Aktif",
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
          raraWrap("Model Tidak Ditemukan", [`Model *${modelInput}* tidak ada`,
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
            raraWrap("API Key Belum Diisi", [`API Key Min1AI (1min.ai) belum di-set`,
              `Set: .setkey min1ai <key>`,
              `Model sudah disimpan, tapi bot belum ON`].join("\n"))
          );
          db.save();
          return { handled: true };
        }
        aigrup.enabled = true;
      }

      db.save();

      await m.reply(
        raraWrap("AI Grup Update",
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
    await m.reply(raraWrap("AI Group Chat", `❌ Command tidak dikenal.\n\nKetik *${prefix}aigroupchat status* untuk lihat panduan.`));
    return { handled: true };
  } catch (error) {
    console.error("[aigrup]", error);
    await m.reply(raraWrap("aigroupchat", `❌ Error: ${error.message || "Unknown"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
