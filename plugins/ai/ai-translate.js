// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-translate",
  alias: ["ai-translate", "ai"],
  category: "ai",
  description: "Terjemahkan teks dengan AI",
  usage: ".ai-translate <teks> | .ai-translate <bahasa> <teks>",
  example: ".ai-translate English I love programming",
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
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const lang = parts[0] && !parts[0].startsWith(".") ? parts[0] : "English";
    const text = parts.slice(1).join(" ") || raw.replace(/^\.ai-translate\s+/i, "").trim();

    if (!text) {
      const out =
        novaCaption({
  emoji: "🤖",
  name: "ai-translate",
  description: "Terjemahkan teks dengan AI",
  usage: `${prefix}ai-translate <teks> | .ai-translate <bahasa> <teks>`,
  example: `${prefix}ai-translate English I love programming`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    const prompt = `Terjemahkan teks berikut ke ${lang}. Hanya kirim hasil terjemahan tanpa penjelasan tambahan.\n\n${text.slice(0, 4000)}`;
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const out =
      claraWrap("AI Translate", [`│ Bahasa: *${lang}*`,
        `│ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-translate <teks> untuk terjemahkan lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AITranslate", "Gagal nih, coba lagi ya");

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
