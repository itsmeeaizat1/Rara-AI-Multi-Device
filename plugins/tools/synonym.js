// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "synonym", alias: ["synonym"], category: "tools",
  alias: ["synonym"],
  description: "Cari sinonim kata", usage: ".synonym <kata>",
  example: ".synonym happy", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const word = m.text?.trim();
    if (!word) {
      await m.reply( claraWrap("Synonym", [`│ ❏ Penggunaan: *${prefix}synonym <kata>*`,
        `│ ❏ Contoh: *${prefix}synonym happy*`].join("\n")), "synonym");
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
      await m.reply(claraWrap("Synonym", [`│ ❏ Kata: *${word}*`, "│ ❏ Sinonim tidak ditemukan"].join("\n")));
      return { handled: true };
    }
    const list = [...syns].slice(0, 15).join(", ");
    await m.reply(claraWrap("Synonym", [`│ ❏ Kata: *${word}*`, `│ ❏ Sinonim: ${list}`].join("\n")));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };