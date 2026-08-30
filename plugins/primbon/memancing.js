// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// memancing.js — Waktu memancing
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "memancing",
  alias: ["memancing", "memancing"],
  category: "primbon",
  description: "Waktu memancing",
  usage: ".memancing <tgl,bln,thn>",
  example: ".memancing 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(claraWrap("memancing", "Contoh: .memancing 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(claraWrap("memancing", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/waktu-memancing?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("memancing", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = novaBox("MEMANCING", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("memancing error:", err);
    await m.react("\u274C");
    return m.reply(claraWrap("memancing", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
