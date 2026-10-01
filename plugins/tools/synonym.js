// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "synonym", alias: ["synonym"], category: "tools",
  alias: ["synonym"],
  description: "Cari sinonim kata", usage: ".synonym <kata>",
  example: ".synonym happy", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const word = m.text?.trim();
    if (!word) {
      await m.reply( novaCaption({
  emoji: "🛠️",
  name: "synonym",
  description: "Cari sinonim kata",
  usage: `${prefix}synonym <kata>`,
  example: `${prefix}synonym happy`,
}), "synonym");
      return { handled: true };
    }
    const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
    if (!Array.isArray(data) || !data.length) throw new Error("Kata tidak ditemukan");
    const syns = new Set();
    for (const entry of data) {
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          for (const s of def.synonyms || []) syns.add(s);
        }
      }
    }
    if (!syns.size) {
      await m.reply(novaWrap("Synonym", [`Kata: *${word}*`, "Sinonim tidak ditemukan"].join("\n")));
      return { handled: true };
    }
    const list = [...syns].slice(0, 15).join(", ");
    await m.react("🐣");
    await m.reply(novaWrap("Synonym", [`Kata: *${word}*`, `Sinonim: ${list}`].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };