// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-social",
  alias: ["ai-social"],
  category: "ai",
  description: "Buat caption/post sosial media dengan AI",
  usage: ".ai-social <topik/platform>",
  example: ".ai-social kopi susu gula aren untuk Instagram",
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
    const prompt = raw.replace(/^\.ai-social\s+/i, "").trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}ai-social <topik/platform>*`,
          `│ ❏ Contoh: *${prefix}ai-social promo murah meriah untuk TikTok*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-social");
      return { handled: true };
    }

    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah ahli konten sosial media. Buat caption, hashtag, dan ide konten yang menarik dan sesuai tren." },
        { role: "user", content: `Buatkan konten untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Social", [`│ ❏ Topik: *${prompt}*`,
        `│ ❏ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-social <topik> untuk konten lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *Gagal*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ai-social");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
