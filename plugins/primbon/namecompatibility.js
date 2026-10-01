// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// namecompatibility.js — Kecocokan nama
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "kecocokannama",
  alias: ["kecocokannama", "cocoknama"],
  category: "primbon",
  description: "Kecocokan nama",
  usage: ".kecocokannama <nama,tgl,bln,thn>",
  example: ".kecocokannama Aizat,7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("kecocokannama", "Contoh: .kecocokannama Aizat,7,7,2005", "guide"));
    const [nama, tgl, bln, thn] = text.split(",");
    if (!nama || !tgl || !bln || !thn) return m.reply(raraWrap("kecocokannama", "Format: nama,tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/kecocokan-nama?nama=${encodeURIComponent(nama)}&tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("kecocokannama", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("KECOCOKANNAMA", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("kecocokannama error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("kecocokannama", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
