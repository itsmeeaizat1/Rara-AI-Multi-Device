import {
  claraHeader,
  bracketBox,
  separator,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "aigrup",
  alias: ["aig", "aigroup"],
  category: "ai",
  description: "AI grup - bot nimbrung otomatis (atur format, model, on/off dari DM)",
  usage: ".aigrup <format> <model> on/off/status",
  example: ".aigrup openai deepseek-v4-flash:free on\n.aigrup gemini kimi-k3:free on\n.aigrup off",
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

const TIO_MODELS = [
  { id: "deepseek-v4-flash:free", label: "DeepSeek V4 Flash (Free)", free: true },
  { id: "kimi-k3:free", label: "Kimi K3 (Free)", free: true },
  { id: "mimo-v2.5:free", label: "Mimo V2.5 (Free)", free: true },
  { id: "tencent/hy3:free", label: "Tencent HY3 (Free)", free: true },
  { id: "openrouter/free", label: "OpenRouter (Free)", free: true },
  { id: "stepfun/step-3.7-flash:free", label: "Step 3.7 Flash (Free)", free: true },
  { id: "cohere/north-mini-code:free", label: "Cohere North (Free)", free: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron Ultra (Free)", free: true },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super (Free)", free: true },
  { id: "moonshotai/kimi-k3-free", label: "Kimi K3 Alt (Free)", free: true },
  { id: "inclusionai/ling-3.0-flash:free", label: "Ling 3.0 Flash (Free)", free: true },
  { id: "poolside/laguna-s-2.1:free", label: "Laguna S (Free)", free: true },
  { id: "poolside/laguna-xs-2.1:free", label: "Laguna XS (Free)", free: true },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron Nano (Free)", free: true },
  { id: "nvidia/nemotron-3.5-content-safety:free", label: "Nemotron Safety (Free)", free: true },
  { id: "kilo-auto/free", label: "Kilo Auto (Free)", free: true },
  { id: "auto", label: "Auto", free: false },
  { id: "DeepSeek-V4-Pro", label: "DeepSeek V4 Pro", free: false },
  { id: "DeepSeek-V4-Flash", label: "DeepSeek V4 Flash", free: false },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", free: false },
  { id: "moonshotai/Kimi-K2.6", label: "Kimi K2.6", free: false },
  { id: "MiniMaxAI/MiniMax-M2.7", label: "MiniMax M2.7", free: false },
  { id: "Qwen3.5-397B-A17B", label: "Qwen 3.5 397B", free: false },
  { id: "Qwen3.6-35B-A3B", label: "Qwen 3.6 35B", free: false },
  { id: "glm-5.2", label: "GLM 5.2", free: false },
  { id: "glm-5.1", label: "GLM 5.1", free: false },
  { id: "step-3.7-flash", label: "Step 3.7 Flash", free: false },
  { id: "step-3.5-flash", label: "Step 3.5 Flash", free: false },
  { id: "step-router-v1", label: "Step Router V1", free: false },
  { id: "kat-coder-pro-v2.5", label: "Kat Coder Pro", free: false },
  { id: "sensenova-6.7-flash-lite", label: "SenseNova 6.7", free: false },
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

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text || "").replace(/^\.aigrup\s+/i, "").replace(/^\.aigroup\s+/i, "").replace(/^\.aig\s+/i, "").trim();
    const args = raw.split(/[ \t]+/).filter(Boolean);

    const db = getDatabase();
    if (!db?.db?.data) return m.reply("❌ Database belum siap.");
    if (!db.db.data.aigrup) db.db.data.aigrup = { enabled: false, groups: {}, probability: 20, format: "openai", model: "deepseek-v4-flash:free" };

    const aigrup = db.db.data.aigrup;
    const aiHelp = botConfig.aiHelp || {};
    const currentFmt = aigrup.format || "openai";
    const currentModel = aigrup.model || aiHelp.openaiModel || "deepseek-v4-flash:free";
    const currentKey = getKeyForFormat(aiHelp, currentFmt);
    const subcmd = (args[0] || "").toLowerCase();

    // ═══ Block dari grup ═══
    const blockFromGroup = async (action) => {
      if (m.isGroup) {
        await m.reply(
          claraHeader("Ditolak", "🚫") + "\n\n" +
          bracketBox("🚫", "ᴇʀʀᴏʀ", [
            `◦ ${action} hanya bisa dari *chat pribadi*`,
            `◦ Bukan dari dalam grup`,
            `◦ Alasan: keamanan`,
          ]) + "\n\n" + separator("━", 22)
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
        claraHeader("AI Grup Status", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ꜱᴛᴀᴛᴜꜱ", [
          `◦ Global: *${aigrup.enabled ? "ON ✅" : "OFF ❌"}*`,
          `◦ Format: *${fmtInfo ? fmtInfo.label : currentFmt}* ${fmtInfo ? fmtInfo.emoji : ""}`,
          `◦ Model: *${currentModel}*`,
          `◦ API Key: *${currentKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `◦ Probability: *${aigrup.probability}%*`,
          `◦ Grup aktif: *${enabledGroups.length}*`,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ", [
          `◦ *${prefix}aigrup openai <model> on* — set format+model, ON`,
          `◦ *${prefix}aigrup gemini <model> on* — set format+model, ON`,
          `◦ *${prefix}aigrup anthropic <model> on* — set format+model, ON`,
          `◦ *${prefix}aigrup openai on* — pakai format OpenAI, ON`,
          `◦ *${prefix}aigrup on* — pakai format saat ini, ON`,
          `◦ *${prefix}aigrup off* — matikan`,
          `◦ *${prefix}aigrup prob <0-100>* — atur probability`,
          `◦ *${prefix}aigrup model* — lihat semua model`,
          `◦ *${prefix}aigrup list* — lihat grup aktif`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" + tipText("Atur hanya dari chat pribadi, bukan di grup");
      await m.reply(text);
      return { handled: true };
    }

    // ═══ model list ═══
    if (subcmd === "model" || subcmd === "models") {
      const freeModels = TIO_MODELS.filter((mdl) => mdl.free);
      const premiumModels = TIO_MODELS.filter((mdl) => !mdl.free);
      const fmtLines = (list) => list.map((mdl) =>
        `  *${mdl.label}* (${mdl.id})`
      ).join("\n");
      let text = claraHeader("Model Tersedia", "🤖") + "\n\n";
      text += bracketBox("🆓", "ꜰʀᴇᴇ ᴍᴏᴅᴇʟꜱ", [fmtLines(freeModels)]) + "\n\n";
      text += bracketBox("💎", "ᴘʀᴇᴍɪᴜᴍ ᴍᴏᴅᴇʟꜱ", [fmtLines(premiumModels)]) + "\n\n";
      text += separator("━", 22) + "\n" +
        tipText(`Contoh: ${prefix}aigrup openai deepseek-v4-flash:free on`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ prob ═══
    if (subcmd === "prob" || subcmd === "probability") {
      if (await blockFromGroup("Atur probability")) return { handled: true };
      const prob = parseInt(args[1] || "0", 10);
      if (isNaN(prob) || prob < 0 || prob > 100) {
        await m.reply(
          claraHeader("Probability", "⚙️") + "\n\n" +
          bracketBox("⚙️", "ᴄᴀʀᴀ", [
            `◦ *${prefix}aigrup prob 30* — 30% chance`,
            `◦ Range: 0-100`,
            `◦ Saat ini: *${aigrup.probability}%*`,
          ]) + "\n\n" + separator("━", 22)
        );
        return { handled: true };
      }
      aigrup.probability = prob;
      db.save();
      await m.reply(`✅ Probability diatur ke *${prob}%*`);
      return { handled: true };
    }

    // ═══ list ═══
    if (subcmd === "list") {
      const groups = Object.entries(aigrup.groups || {}).filter(([, v]) => v);
      await m.reply(
        claraHeader("Grup AI Aktif", "🤖") + "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ Global: *${aigrup.enabled ? "ON" : "OFF"}*`,
          `◦ Grup terdaftar: *${groups.length}*`,
          ...(groups.length ? groups.map(([gid]) => `◦ ${gid}`) : ["◦ (kosong)"]),
        ]) + "\n\n" + separator("━", 22)
      );
      return { handled: true };
    }

    // ═══ on (simple, pakai format saat ini) ═══
    if (subcmd === "on") {
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      if (!currentKey) {
        await m.reply(
          claraHeader("API Key Belum Diisi", "⚠️") + "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ API Key untuk format *${TIO_FORMATS[currentFmt]?.label || currentFmt}* belum di-set`,
            `◦ Set di config.js: aiHelp.${TIO_FORMATS[currentFmt]?.apiKeyField || "apiKey"}`,
          ]) + "\n\n" + separator("━", 22)
        );
        return { handled: true };
      }
      aigrup.enabled = true;
      db.save();
      await m.reply(
        claraHeader("AI Grup Aktif", "✅") + "\n\n" +
        bracketBox("✅", "ᴀᴋᴛɪꜰ", [
          `◦ Status: *ON*`,
          `◦ Format: *${TIO_FORMATS[currentFmt]?.label || currentFmt}*`,
          `◦ Model: *${currentModel}*`,
          `◦ Probability: *${aigrup.probability}%*`,
          `◦ Bot nimbrung di semua grup`,
          `◦ 100% respon kalau di-tag/reply`,
        ]) + "\n\n" + separator("━", 22) + "\n" +
        tipText(`Matikan: ${prefix}aigrup off`)
      );
      return { handled: true };
    }

    // ═══ off ═══
    if (subcmd === "off") {
      if (await blockFromGroup("Toggle AI Grup")) return { handled: true };
      aigrup.enabled = false;
      db.save();
      await m.reply(
        claraHeader("AI Grup Nonaktif", "✅") + "\n\n" +
        bracketBox("✅", "ᴅɪᴍᴀᴛɪᴋᴀɴ", [
          `◦ Status: *OFF*`,
          `◦ Bot tidak nimbrung lagi`,
          `◦ Command biasa tetap jalan`,
        ]) + "\n\n" + separator("━", 22) + "\n" +
        tipText(`Aktifkan: ${prefix}aigrup on`)
      );
      return { handled: true };
    }

    // ═══ Format-based commands ═══
    // .aigrup openai <model> on   → set format + model + ON
    // .aigrup openai <model>      → set format + model (no toggle)
    // .aigrup openai on           → set format + ON (default model)
    // .aigrup openai              → show models for this format
    const fmtKey = resolveFormat(subcmd);

    if (fmtKey) {
      if (await blockFromGroup("Set format/model AI Grup")) return { handled: true };

      const fmt = TIO_FORMATS[fmtKey];
      const apiKey = getKeyForFormat(aiHelp, fmtKey);

      // .aigrup openai (tanpa argumen lain) → tampilkan model
      if (args.length === 1) {
        const freeModels = TIO_MODELS.filter((mdl) => mdl.free);
        const premiumModels = TIO_MODELS.filter((mdl) => !mdl.free);
        const fmtLines = (list) => list.map((mdl) =>
          `  *${mdl.label}* (${mdl.id})`
        ).join("\n");
        await m.reply(
          claraHeader(`Model ${fmt.label}`, fmt.emoji) + "\n\n" +
          bracketBox(fmt.emoji, `${fmt.label.toUpperCase()} ꜰᴏʀᴍᴀᴛ`, [
            `◦ API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*`,
            `◦ Model saat ini: *${aigrup.format === fmtKey ? currentModel : fmt.defaultModel}*`,
          ]) + "\n\n" +
          bracketBox("🆓", "ꜰʀᴇᴇ", [fmtLines(freeModels)]) + "\n\n" +
          bracketBox("💎", "ᴘʀᴇᴍɪᴜᴍ", [fmtLines(premiumModels)]) + "\n\n" +
          separator("━", 22) + "\n" +
          tipText(`Contoh: ${prefix}aigrup ${fmtKey} deepseek-v4-flash:free on`)
        );
        return { handled: true };
      }

      // Cari "on" di args terakhir
      const lastArg = (args[args.length - 1] || "").toLowerCase();
      const turnOn = lastArg === "on";
      const modelArgs = turnOn ? args.slice(1, -1) : args.slice(1);
      const modelInput = modelArgs.join(" ").trim();

      // Kalau cuma ".aigrup openai on" → pakai default model
      if (!modelInput && turnOn) {
        if (!apiKey) {
          await m.reply(
            claraHeader("API Key Belum Diisi", "⚠️") + "\n\n" +
            bracketBox("⚠️", "ᴇʀʀᴏʀ", [
              `◦ API Key untuk *${fmt.label}* belum di-set`,
              `◦ Set di config.js: aiHelp.${fmt.apiKeyField}`,
            ]) + "\n\n" + separator("━", 22)
          );
          return { handled: true };
        }
        aigrup.format = fmtKey;
        aigrup.model = fmt.defaultModel;
        aigrup.enabled = true;
        db.save();
        await m.reply(
          claraHeader("AI Grup Aktif", fmt.emoji) + "\n\n" +
          bracketBox("✅", "ᴀᴋᴛɪꜰ", [
            `◦ Status: *ON*`,
            `◦ Format: *${fmt.label}*`,
            `◦ Model: *${fmt.defaultModel}* (default)`,
            `◦ Probability: *${aigrup.probability}%*`,
          ]) + "\n\n" + separator("━", 22)
        );
        return { handled: true };
      }

      // Validasi model
      const foundModel = TIO_MODELS.find(
        (mdl) => mdl.id === modelInput || mdl.label.toLowerCase() === modelInput.toLowerCase()
      );

      if (!foundModel) {
        await m.reply(
          claraHeader("Model Tidak Ditemukan", "⚠️") + "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ Model *${modelInput}* tidak ada`,
            `◦ Ketik *${prefix}aigrup model* untuk lihat semua`,
          ]) + "\n\n" + separator("━", 22)
        );
        return { handled: true };
      }

      // Set format + model
      aigrup.format = fmtKey;
      aigrup.model = foundModel.id;

      if (turnOn) {
        if (!apiKey) {
          await m.reply(
            claraHeader("API Key Belum Diisi", "⚠️") + "\n\n" +
            bracketBox("⚠️", "ᴇʀʀᴏʀ", [
              `◦ API Key untuk *${fmt.label}* belum di-set`,
              `◦ Set di config.js: aiHelp.${fmt.apiKeyField}`,
              `◦ Model sudah disimpan, tapi bot belum ON`,
            ]) + "\n\n" + separator("━", 22)
          );
          db.save();
          return { handled: true };
        }
        aigrup.enabled = true;
      }

      db.save();

      await m.reply(
        claraHeader("AI Grup Update", fmt.emoji) + "\n\n" +
        bracketBox(fmt.emoji, "ᴘᴇʀᴜʙᴀʜᴀɴ", [
          `◦ Format: *${fmt.label}*`,
          `◦ Model: *${foundModel.label}*`,
          `◦ ID: *${foundModel.id}*`,
          `◦ Gratis: *${foundModel.free ? "Ya ✅" : "Tidak 💎"}*`,
          `◦ API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `◦ Status: *${aigrup.enabled ? "ON ✅" : "OFF (belum di-on)"}*`,
          `◦ Probability: *${aigrup.probability}%*`,
        ]) + "\n\n" + separator("━", 22) + "\n" +
        (aigrup.enabled
          ? tipText(`Matikan: ${prefix}aigrup off`)
          : tipText(`Aktifkan: ${prefix}aigrup on`))
      );
      return { handled: true };
    }

    // Unknown
    await m.reply(
      `❌ Command tidak dikenal.\n\nKetik *${prefix}aigrup status* untuk lihat panduan.`
    );
    return { handled: true };
  } catch (error) {
    console.error("[aigrup]", error);
    await m.reply(`❌ Error: ${error.message || "Unknown"}`);
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
