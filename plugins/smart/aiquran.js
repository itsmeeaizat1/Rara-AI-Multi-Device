// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import {  raraHeader, separator, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";
import axios from "axios";

const pluginConfig = {
  name: "aiquran2", alias: ["aiquran2", "aiquran"], category: "smart",
  alias: ["aiquran2", "aiquran"],
  description: "Cari ayat Quran dengan bahasa natural", usage: ".aiquran <topik>",
  example: ".aiquran ayat tentang sabar", isOwner: false, isPremium: true,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const query = m.text?.trim();
    if (!query) {
      await m.reply( raraCaption({
  emoji: "📖",
  name: "aiquran2",
  description: "Cari ayat Quran dengan bahasa natural",
  usage: `${prefix}aiquran <topik>`,
  example: `${prefix}aiquran ayat tentang sabar`,
}), "aiquran");
      return { handled: true };
    }
    const result = await callAI(`Cari ayat Al-Quran yang berkaitan dengan: "${query}". Berikan surah, ayat, teks Arab (jika tahu), dan terjemahan dalam Bahasa Indonesia. Maksimal 3 ayat.`, {
      systemPrompt: "Kamu adalah ahli Al-Quran. Berikan jawaban akurat dan singkat.",
    });
    await m.reply(raraWrap("AI Quran", "📖") + "\n\n" + result );
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };