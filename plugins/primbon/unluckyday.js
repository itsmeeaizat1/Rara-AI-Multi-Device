// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// unluckyday.js — Hari naas
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "harinaas",
  alias: ["harinaas", "harisial"],
  category: "primbon",
  description: "Hari naas",
  usage: ".harinaas <tgl,bln,thn>",
  example: ".harinaas 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("harinaas", "Contoh: .harinaas 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(raraWrap("harinaas", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/hari-naas?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("harinaas", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("HARINAAS", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("harinaas error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("harinaas", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
