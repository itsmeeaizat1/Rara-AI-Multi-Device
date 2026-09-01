// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "define",
  alias: ["define", "kamus"],
  category: "tools",
  description: "Mencari definisi / arti kata dalam bahasa Inggris",
  usage: ".define <kata>",
  example: ".define algorithm",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const word = m.args?.[0]?.trim() || (m.quoted && (m.quoted.text || m.quoted.caption))?.trim();
    if (!word) {
      return m.reply(claraWrap("define", `Masukkan kata yang ingin dicari definisinya!\n\nContoh: ${m.prefix}define algorithm`, "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      validateStatus: (status) => status < 500,
      timeout: 10000,
    });

    if (res.status === 404 || !Array.isArray(res.data) || res.data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("define", `Kata "*${word}*" tidak ditemukan di dalam kamus.`));
    }

    const entry = res.data[0];
    const wordName = entry.word || word;
    const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || "-";

    let text = `╭─「 *DICTIONARY DEFINE* 」\n`;
    text += `│ Word: ${wordName}\n`;
    text += `│ Phonetic: ${phonetic}\n`;
    text += `╰──────────\n\n`;

    if (entry.meanings && entry.meanings.length > 0) {
      entry.meanings.slice(0, 3).forEach((meaning, index) => {
        text += `*${index + 1}. [${meaning.partOfSpeech}]*\n`;
        if (meaning.definitions && meaning.definitions.length > 0) {
          meaning.definitions.slice(0, 2).forEach((def) => {
            text += `• ${def.definition}\n`;
            if (def.example) {
              text += `  _Ex: "${def.example}"_\n`;
            }
          });
        }
        text += `\n`;
      });
    }

    await m.react("🐣");
    return m.reply(text.trim());
  } catch (err) {
    console.error("define error:", err);
    await m.react("❌");
    return m.reply(claraWrap("define", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
