// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ai-web",
  alias: ["deepresearch", "webresearch", "deepresearchv2"],
  category: "ai",
  description: "Cari dan ringkas info dari web dengan AI",
  usage: ".ai-web <pertanyaan>",
  example: ".ai-web Ringkasan berita teknologi hari ini",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}ai-web <pertanyaan>*`,
          `  ┊  ➶ Contoh: *${prefix}ai-web Ringkasan berita teknologi hari ini*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "ai-web");
      return { handled: true };
    }

    m.react("🕐");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah asisten yang menelusuri dan merangkum informasi secara akurat dalam bahasa Indonesia." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Web", [`  ┊  ➶ Pertanyaan: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `  ┊  ➶ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-web <pertanyaan> untuk cari lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "ai-web");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
