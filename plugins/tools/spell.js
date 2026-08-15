// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "spell", alias: ["spelling", "ejaan"], category: "tools",
  description: "Cek ejaan kata", usage: ".spell <kata>",
  example: ".spell recieve", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const word = m.text?.trim();
    if (!word) {
      await sendReplyWithNav(sock, m, claraWrap("Spell Check", [`◦ Penggunaan: *${prefix}spell <kata>*`,
        `◦ Contoh: *${prefix}spell recieve*`].join("\n")), "spell");
      return { handled: true };
    }
    const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
    if (Array.isArray(data) && data.length > 0) {
      await m.reply(claraWrap("Spell Check", [`◦ Kata: *${word}*`, `◦ Ejaan benar!`].join("\n")));
    } else {
      await m.reply(claraWrap("Spell Check", [`◦ Kata: *${word}*`, "◦ Kata tidak ditemukan dalam kamus"].join("\n")));
    }
  } catch (e) {
    await m.reply(claraWrap("Spell Check", [`◦ Kata: *${m.text?.trim()}*`, "◦ Tidak ditemukan di kamus"].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };