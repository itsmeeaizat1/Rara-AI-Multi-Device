// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  raraHeader, separator, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "aihadith", alias: ["aihadith"], category: "smart",
  alias: ["aihadith"],
  description: "Cari hadis dengan bahasa natural", usage: ".aihadith <topik>",
  example: ".aihadith hadis tentang sabar", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const query = m.text?.trim();
    if (!query) {
      await m.reply( raraCaption({
  emoji: "📚",
  name: "aihadith",
  description: "Cari hadis dengan bahasa natural",
  usage: `${prefix}aihadith <topik>`,
  example: `${prefix}aihadith hadis tentang sabar`,
}), "aihadith");
      return { handled: true };
    }
    const result = await callAI(`Cari hadis yang berkaitan dengan: "${query}". Berikan riwayat (Bukhari/Muslim/dll), teks hadis, dan terjemahan dalam Bahasa Indonesia. Maksimal 3 hadis.`, {
      systemPrompt: "Kamu adalah ahli hadis. Berikan jawaban akurat dan singkat.",
    });
    await m.reply(raraWrap("AI Hadith", "📖") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };