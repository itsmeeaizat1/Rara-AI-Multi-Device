// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { DEFAULT_PROVIDERS } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aiset",
  alias: ["aiset"],
  category: "ai",
  description: "Kelola pengaturan AI dari dalam bot",
  usage: ".aiset list | .aiset provider <nama> | .aiset on/off",
  example: ".aiset provider gemini",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getAIHelpConfig(botConfig) {
  return (botConfig && botConfig.aiHelp) ? botConfig.aiHelp : {};
}

function buildProviderList(prefix) {
  const lines = Object.entries(DEFAULT_PROVIDERS).map(([key, provider]) => {
    const models = (provider.models || []).slice(0, 3).join(", ");
    return `${provider.name} (${key})\n  Model: ${models}\n  Default: ${provider.defaultModel}`;
  });

  return [
    `Berikut daftar provider yang didukung:`,
    "",
    ...lines,
    "",
    `💡 Contoh: ${prefix}multi-ai gemini Jelaskan quantum computing`,
    `Provider aktif sekarang diatur lewat config aiHelp di config.js.`,
  ];
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const action = (parts[1] || "").toLowerCase();
    const value = (parts[2] || "").trim();

    const aiHelpConfig = getAIHelpConfig(botConfig);
    const enabled = aiHelpConfig.enabled !== false;
    const currentMode = String(aiHelpConfig.mode || "offline").toLowerCase();

    if (!action || action === "list" || action === "daftar") {
      const text =
        claraWrap("AI Settings", [`Status: *${enabled ? "ON" : "OFF"}*`,
          `Mode: *${currentMode.toUpperCase()}*`,
          `Provider: *${aiHelpConfig.provider || "openai"}*`,
          `Model: *${aiHelpConfig.model || "gpt-4o-mini"}*`,
          `Endpoint: *${aiHelpConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions"}*`].join("\n")) +
        claraWrap("Provider", buildProviderList(prefix)) +
        claraWrap("Pakai", [`*${prefix}aiset list* — lihat pengaturan AI`, `*${prefix}aiset provider <nama>* — lihat provider`, `*${prefix}aiset on/off* — owner toggle AI Help`, `*${prefix}aiset mode offline/online* — owner ganti mode`].join("\n")) +
        
        "\n" ;

      await m.react("🐣");
      await m.reply(text, "aiset");
      return { handled: true };
    }

    if (action === "provider") {
      const key = String(value || "").toLowerCase();
      const provider = DEFAULT_PROVIDERS[key];
      if (!provider) {
        const text =
          claraWrap("Tidak Dikenal", [`Provider *${value || ""}* tidak dikenali.`,
            `Ketik *${prefix}aiset list* untuk lihat daftar.`].join("\n")) +
          "\n" ;

        await m.reply(text, "aiset");
        return { handled: true };
      }

      const models = (provider.models || []).join(", ");
      const text =
        claraWrap("Provider", "🤖") +
        claraWrap(provider.name.toUpperCase(), [
          `Key: *${key}*`,
          `Default model: *${provider.defaultModel}*`,
          `Models: *${models}*`,
          `Supports vision: *${provider.supportsVision ? "Ya" : "Tidak"}*`,
        ]) +
        
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "on" || action === "off") {
      if (!m.isOwner) {
        const text =
          claraWrap("aiset", "Perintah ini khusus owner — Hanya owner yang bisa menyalakan/mematikan AI Help.", "error") +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      const newState = action === "on";
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.enabled = newState;
      if (!botConfig.aiHelp.mode) botConfig.aiHelp.mode = "offline";

      const text =
        claraWrap("AI Settings", [`Status: *${newState ? "ON" : "OFF"}*`,
          `Mode: *${String(botConfig.aiHelp.mode || "offline").toUpperCase()}*`,
          "Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (action === "mode") {
      if (!m.isOwner) {
        const text =
          claraWrap("aiset", "Perintah ini khusus owner — ʜᴀɴʏᴀ ᴏᴡɴᴇʀ ʏᴀɴɢ ʙɪꜱᴀ ᴍᴇɴɢɢᴀɴᴛɪ ᴍᴏᴅᴇ ᴀɪ ʜᴇʟᴘ.", "error") +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      const newMode = String(value || "").toLowerCase();
      if (!["offline", "online"].includes(newMode)) {
        const text =
          claraWrap("aiset", ["Mode yang tersedia: offline atau online.",
            "",
            `💡 Contoh: ${prefix}aiset mode online`]) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.mode = newMode;

      const text =
        claraWrap("AI Settings", [`Mode: *${newMode.toUpperCase()}*`,
          "Perubahan akan berlaku setelah config reload."].join("\n")) +
        "\n"  +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    const text =
      claraWrap("Tidak Dikenal", [`Aksi *${action}* tidak dikenali.`,
        `Ketik *${prefix}aiset list* untuk lihat opsi.`].join("\n")) +
      "\n" ;

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AISet", "Gagal nih, coba lagi ya") +
      "\n" ;

    await m.reply(text, "aiset");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
