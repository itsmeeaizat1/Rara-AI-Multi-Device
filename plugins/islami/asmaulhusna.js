// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// asmaulhusna.js — Asmaul Husna
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "asmaulhusna",
  alias: ["asmaulhusna", "asma"],
  category: "islami",
  description: "99 Asmaul Husna",
  usage: ".asmaulhusna [nomor]",
  example: ".asmaulhusna\n.asmaulhusna 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const num = parseInt(m.args?.[0]);
    const res = await axios.get("https://api.alquran.cloud/v1/asmaAlHusna/1-99");
    const list = res.data?.data || [];
    if (!list.length) return m.reply(claraWrap("asmaulhusna", "Gagal mengambil data!", "error"));

    if (num && num >= 1 && num <= 99) {
      const item = list.find(v => v.number === num);
      if (!item) return m.reply(claraWrap("asmaulhusna", "Nomor tidak valid!", "error"));
      let msg = `╭──「 *ASMAUL HUSNA* 」\n`;
      msg += `│ No: ${item.number}\n`;
      msg += `│ Arabic: ${item.name}\n`;
      msg += `│ Latin: ${item.transliteration}\n`;
      msg += `│ Arti: ${item.en.meaning}\n`;
      msg += `╰──────────`;
      await m.react("🐣");
      return m.reply(msg);
    }

    let msg = `╭──「 *99 ASMAUL HUSNA* 」\n`;
    list.slice(0, 20).forEach((item) => {
      msg += `│ ${item.number}. ${item.transliteration}\n`;
    });
    msg += `│\n`;
    msg += `│ Lihat detail: .asmaulhusna <nomor>\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("asmaulhusna error:", err);
    await m.react("❌");
    return m.reply(claraWrap("asmaulhusna", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
