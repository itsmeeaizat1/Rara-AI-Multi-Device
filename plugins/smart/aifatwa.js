// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  novaHeader, separator, tipText, novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aifatwa", alias: ["aifatwa"], category: "smart",
  alias: ["aifatwa"],
  description: "Tanya hukum Islam, AI cari referensi", usage: ".aifatwa <pertanyaan>",
  example: ".aifatwa hukum trading forex", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const q = m.text?.trim();
    if (!q) {
      await m.reply( novaCaption({
  emoji: "🕌",
  name: "aifatwa",
  description: "Tanya hukum Islam, AI cari referensi",
  usage: `${prefix}aifatwa <pertanyaan>`,
  example: `${prefix}aifatwa hukum trading forex`,
}), "aifatwa");
      return { handled: true };
    }
    const result = await callAI(`Jawab pertanyaan Islam berikut berdasarkan Al-Quran, Hadis, dan pendapat ulama. Berikan referensi. Bahasa Indonesia.\n\nPertanyaan: ${q}`, {
      systemPrompt: "Kamu adalah asisten Islam yang berpengetahuan. Berikan jawaban seimbang dengan referensi. Ingatkan bahwa ini bukan fatwa resmi.",
    });
    await m.reply(novaWrap("AI Fatwa", "⚖️") + "\n\n" + result + "\n\n" +  tipText("Ini bukan fatwa resmi. Konsultasi ulama untuk kepastian."));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };