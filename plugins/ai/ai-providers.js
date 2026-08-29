// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { DEFAULT_PROVIDERS } from "../../src/lib/nova-ai-service.js";


const pluginConfig = {
  name: "ai-providers",
  alias: ["ai-providers", "ai"],
  category: "ai",
  description: "Lihat semua provider AI yang tersedia",
  usage: ".ai-providers",
  example: ".ai-providers",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const lines = Object.entries(DEFAULT_PROVIDERS).map(([key, provider]) => {
      const models = (provider.models || []).slice(0, 5).join(", ");
      const vision = provider.supportsVision ? "Ya" : "Tidak";
      return `${provider.name} (${key})\n  Model: ${models}\n  Vision: ${vision}\n  Default: ${provider.defaultModel}`;
    });

    const text = claraWrap("AI Providers",
      lines.join("\n") +
      "\n\nPAKAI:\n" +
      `│ *${prefix}multi-ai <provider> <pesan>* — chat dengan provider tertentu\n` +
      `│ *${prefix}ai-set provider <nama>* — ganti provider default\n` +
      `│ *${prefix}ai-addprovider list* — lihat provider custom\n` +
      `│ *${prefix}menu* — kembali ke menu utama`
    );

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text = novaError("AIProviders",
      `Status: *ɢᴀɢᴀʟ*\n` +
      `Alasan: *${error.message}*`,
      "error"
    );

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
