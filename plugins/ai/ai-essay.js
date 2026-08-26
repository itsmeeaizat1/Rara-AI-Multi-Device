// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-essay",
  alias: ["aiessay", "essayai", "essayhelper"],
  category: "ai",
  description: "Tulis essay/artikel dengan AI",
  usage: ".ai-essay <topik>",
  example: ".ai-essay Dampak AI dalam pendidikan",
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
    const raw = m.text?.trim() || "";
    const topic = raw.replace(/^\.ai-essay\s+/i, "").trim();

    if (!topic) {
      const text =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}ai-essay <topik>*`,
          `│ ❏ Contoh: *${prefix}ai-essay Dampak AI dalam pendidikan*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-essay");
      return { handled: true };
    }

    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah penulis artikel. Tulis essay yang jelas, terstruktur, dan mudah dipahami dalam bahasa Indonesia." },
        { role: "user", content: `Tulis essay tentang: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Essay", [`│ ❏ Topik: *${topic}*`,
        `│ ❏ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-essay <topik> untuk tulis lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ai-essay");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
