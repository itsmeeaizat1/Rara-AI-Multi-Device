// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// asmaulhusna.js — Asmaul Husna
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

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
      let _lines = [];
        _lines.push(`No: ${item.number}`);
        _lines.push(`Arabic: ${item.name}`);
        _lines.push(`Latin: ${item.transliteration}`);
        _lines.push(`Arti: ${item.en.meaning}`);
      let msg = novaBox("ASMAUL HUSNA", _lines);
      await m.react("🐣");
      return m.reply(msg);
    }

    let _lines = [];
    list.slice(0, 20).forEach((item) => {
      _lines.push(`${item.number}. ${item.transliteration}`);
    });
      _lines.push(`Lihat detail: .asmaulhusna <nomor>`);
    let msg = novaBox("99 ASMAUL HUSNA", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("asmaulhusna error:", err);
    await m.react("❌");
    return m.reply(claraWrap("asmaulhusna", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
