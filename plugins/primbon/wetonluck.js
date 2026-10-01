// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// wetonluck.js — Rejeki weton
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rejeki",
  alias: ["rejeki", "rejeki"],
  category: "primbon",
  description: "Rejeki weton",
  usage: ".rejeki <tgl,bln,thn>",
  example: ".rejeki 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(novaWrap("rejeki", "Contoh: .rejeki 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(novaWrap("rejeki", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/rejeki?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(novaWrap("rejeki", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = novaBox("REJEKI", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("rejeki error:", err);
    await m.react("\u274C");
    return m.reply(novaWrap("rejeki", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
