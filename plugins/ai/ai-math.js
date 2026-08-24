// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aimath",
  alias: ["aimath", "mathsolver", "aimathsolver"],
  category: "ai",
  description: "Selesaikan soal matematika dengan AI",
  usage: ".ai-math <soal>",
  example: ".ai-math Integral dari x^2 dx",
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
    const prompt = raw.replace(/^\.ai-math\s+/i, "").trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}ai-math <soal>*`,
          `  ┊  ➶ Contoh: *${prefix}ai-math Integral dari x^2 dx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-math");
      return { handled: true };
    }

    m.react("🕒");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah tutor matematika. Jelaskan langkah penyelesaian soal secara detail dalam bahasa Indonesia." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Math", [`  ┊  ➶ Soal: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `  ┊  ➶ Jawaban: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-math <soal> untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("🐣");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ai-math");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
