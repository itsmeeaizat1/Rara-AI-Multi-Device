// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ai-prompt",
  alias: ["ai-prompt", "promptai", "prompt", "optiprompt", "improveprompt"],
  category: "ai",
  description: "Buat atau optimalkan prompt AI",
  usage: ".ai-prompt <ide>",
  example: ".ai-prompt iklan kopi untuk TikTok",
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
    const raw = m.text?.trim() || "";
    const prompt = raw.replace(/^\.ai-prompt\s+/i, "").trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`╎❏ Penggunaan: *${prefix}ai-prompt <ide>*`,
          `╎❏ Contoh: *${prefix}ai-prompt iklan kopi untuk TikTok*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "ai-prompt");
      return { handled: true };
    }

    m.react("🕐");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah ahli prompt engineering. Buat prompt AI yang detail, jelas, dan mudah dijalankan untuk model generative AI." },
        { role: "user", content: `Buatkan prompt AI yang optimal untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Prompt", [`╎❏ Ide: *${prompt}*`,
        `╎❏ Prompt: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-prompt <ide> untuk prompt lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "ai-prompt");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
