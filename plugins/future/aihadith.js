// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraHeader, separator, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aihadith", alias: ["aihadith"], category: "future",
  alias: ["aihadith"],
  description: "Cari hadis dengan bahasa natural", usage: ".aihadith <topik>",
  example: ".aihadith hadis tentang sabar", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();
    if (!query) {
      await m.reply( novaCaption({
  emoji: "📁",
  name: "aihadith",
  description: "Cari hadis dengan bahasa natural",
  usage: `$prefixaihadith <topik>`,
  example: `$prefixaihadith hadis tentang sabar`,
}), "aihadith");
      return { handled: true };
    }
    const result = await callAI(`Cari hadis yang berkaitan dengan: "${query}". Berikan riwayat (Bukhari/Muslim/dll), teks hadis, dan terjemahan dalam Bahasa Indonesia. Maksimal 3 hadis.`, {
      systemPrompt: "Kamu adalah ahli hadis. Berikan jawaban akurat dan singkat.",
    });
    await m.reply(claraWrap("AI Hadith", "📖") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };