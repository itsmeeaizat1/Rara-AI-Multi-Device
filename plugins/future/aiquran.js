// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import axios from "axios";

const pluginConfig = {
  name: "aiquran2", alias: ["aiquran2", "quranai", "aiquranfuture"], category: "future",
  description: "Cari ayat Quran dengan bahasa natural", usage: ".aiquran <topik>",
  example: ".aiquran ayat tentang sabar", isOwner: false, isPremium: true,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();
    if (!query) {
      await m.reply( claraWrap("AI Quran", [`  ┊  ➶ Penggunaan: *${prefix}aiquran <topik>*`,
        `  ┊  ➶ Contoh: *${prefix}aiquran ayat tentang sabar*`].join("\n")), "aiquran");
      return { handled: true };
    }
    const result = await callAI(`Cari ayat Al-Quran yang berkaitan dengan: "${query}". Berikan surah, ayat, teks Arab (jika tahu), dan terjemahan dalam Bahasa Indonesia. Maksimal 3 ayat.`, {
      systemPrompt: "Kamu adalah ahli Al-Quran. Berikan jawaban akurat dan singkat.",
    });
    await m.reply(claraWrap("AI Quran", "📖") + "\n\n" + result + "\n\n" + separator("━", 22));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };