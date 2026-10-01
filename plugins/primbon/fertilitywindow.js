// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// fertilitywindow.js — Masa subur
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "masasubur",
  alias: ["masasubur", "masasubur"],
  category: "primbon",
  description: "Masa subur",
  usage: ".masasubur <tgl,bln,thn,siklus>",
  example: ".masasubur 12,1,2022,28",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("masasubur", "Contoh: .masasubur 12,1,2022,28", "guide"));
    const [tgl, bln, thn, siklus] = text.split(",");
    if (!tgl || !bln || !thn || !siklus) return m.reply(raraWrap("masasubur", "Format: tgl,bln,thn,siklus", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/masa-subur?tgl=${tgl}&bln=${bln}&thn=${thn}&siklus=${siklus}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("masasubur", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("MASA SUBUR", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("masasubur error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("masasubur", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
