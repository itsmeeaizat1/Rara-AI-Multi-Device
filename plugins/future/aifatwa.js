// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aifatwa", alias: ["aifatwa", "tanyaislam2", "fatwaai"], category: "future",
  description: "Tanya hukum Islam, AI cari referensi", usage: ".aifatwa <pertanyaan>",
  example: ".aifatwa hukum trading forex", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const q = m.text?.trim();
    if (!q) {
      await m.reply( claraWrap("AI Fatwa", [`  ┊  ➶ Penggunaan: *${prefix}aifatwa <pertanyaan>*`,
        `  ┊  ➶ Contoh: *${prefix}aifatwa hukum trading*`,
        "  ┊  ➶ AI berdasarkan referensi umum, bukan fatwa resmi"].join("\n")), "aifatwa");
      return { handled: true };
    }
    const result = await callAI(`Jawab pertanyaan Islam berikut berdasarkan Al-Quran, Hadis, dan pendapat ulama. Berikan referensi. Bahasa Indonesia.\n\nPertanyaan: ${q}`, {
      systemPrompt: "Kamu adalah asisten Islam yang berpengetahuan. Berikan jawaban seimbang dengan referensi. Ingatkan bahwa ini bukan fatwa resmi.",
    });
    await m.reply(claraWrap("AI Fatwa", "⚖️") + "\n\n" + result + "\n\n" + separator("━", 22) + "\n" + tipText("Ini bukan fatwa resmi. Konsultasi ulama untuk kepastian."));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };