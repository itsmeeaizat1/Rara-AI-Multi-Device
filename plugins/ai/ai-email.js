// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ai-email",
  alias: ["ai-email", "emailai", "email", "surat", "mailai"],
  category: "ai",
  description: "Tulis email/resmi surat dengan AI",
  usage: ".ai-email <tujuan/isi>",
  example: ".ai-email lamaran kerja sebagai frontend engineer",
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
    const prompt = raw.replace(/^\.ai-email\s+/i, "").trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}ai-email <tujuan/isi>*`,
          `◦ Contoh: *${prefix}ai-email permohonan maaf atas keterlambatan pengiriman*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "ai-email");
      return { handled: true };
    }

    m.react("🕐");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah ahli komunikasi. Tulis email atau surat yang sopan, jelas, dan sesuai konteks dalam bahasa Indonesia." },
        { role: "user", content: `Tulis email untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Email", [`◦ Tujuan: *${prompt}*`,
        `◦ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-email <tujuan> untuk tulis lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "ai-email");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
