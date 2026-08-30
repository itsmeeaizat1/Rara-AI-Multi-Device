// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ramalanjodohbali.js — Ramalan jodoh bali
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ramalanjodohbali",
  alias: ["ramalanjodohbali", "jodohbali"],
  category: "primbon",
  description: "Ramalan jodoh bali",
  usage: ".ramalanjodohbali <nama,tgl,bln,thn>",
  example: ".ramalanjodohbali Aizat,7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(claraWrap("ramalanjodohbali", "Contoh: .ramalanjodohbali Aizat,7,7,2005", "guide"));
    const [nama, tgl, bln, thn] = text.split(",");
    if (!nama || !tgl || !bln || !thn) return m.reply(claraWrap("ramalanjodohbali", "Format: nama,tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/ramalan-jodoh-bali?nama=${encodeURIComponent(nama)}&tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("ramalanjodohbali", "Data tidak ditemukan!", "error"));

    let msg = `\u256d\u2500\u2500\u300c *RAMALANJODOHBALI* \u300d\u2500\u2500\u2510\n`;
    Object.entries(d).forEach(([k, v]) => {
      msg += `\u2502 ${k}: ${v}\n`;
    });
    msg += `\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("ramalanjodohbali error:", err);
    await m.react("\u274C");
    return m.reply(claraWrap("ramalanjodohbali", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
