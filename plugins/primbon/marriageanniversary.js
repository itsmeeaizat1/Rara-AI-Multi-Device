// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// marriageanniversary.js — Tanggal jadian pernikahan
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "jadianpernikahan",
  alias: ["jadianpernikahan", "jadiannikah"],
  category: "primbon",
  description: "Tanggal jadian pernikahan",
  usage: ".jadianpernikahan <tgl,bln,thn>",
  example: ".jadianpernikahan 6,12,2020",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("jadianpernikahan", "Contoh: .jadianpernikahan 6,12,2020", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(raraWrap("jadianpernikahan", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/tanggal-jadian?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("jadianpernikahan", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("JADIANPERNIKAHAN", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("jadianpernikahan error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("jadianpernikahan", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
