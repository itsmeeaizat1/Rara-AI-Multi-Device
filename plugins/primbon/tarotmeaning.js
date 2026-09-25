// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tarotmeaning.js — Arti kartu tarot
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "artitarot",
  alias: ["artitarot", "tarot"],
  category: "primbon",
  description: "Arti kartu tarot",
  usage: ".artitarot <tgl,bln,thn>",
  example: ".artitarot 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(claraWrap("artitarot", "Contoh: .artitarot 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(claraWrap("artitarot", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/arti-tarot?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("artitarot", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = novaBox("ARTITAROT", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("artitarot error:", err);
    await m.react("\u274C");
    return m.reply(claraWrap("artitarot", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
