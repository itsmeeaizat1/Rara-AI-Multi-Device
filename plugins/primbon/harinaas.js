// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// harinaas.js — Hari naas
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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
    if (!text) return m.reply(claraWrap("harinaas", "Contoh: .harinaas 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(claraWrap("harinaas", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/hari-naas?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("harinaas", "Data tidak ditemukan!", "error"));

    let msg = `\u256d\u2500\u2500\u300c *HARINAAS* \u300d\u2500\u2500\u2510\n`;
    Object.entries(d).forEach(([k, v]) => {
      msg += `\u2502 ${k}: ${v}\n`;
    });
    msg += `\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("harinaas error:", err);
    await m.react("\u274C");
    return m.reply(claraWrap("harinaas", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
