// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ramalancinta.js — Ramalan cinta
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ramalancinta",
  alias: ["ramalancinta", "ramalancinta"],
  category: "primbon",
  description: "Ramalan cinta",
  usage: ".ramalancinta <nama1|nama2>",
  example: ".ramalancinta Aizat|Novia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text || !text.includes("|")) return m.reply(claraWrap("ramalancinta", "Contoh: .ramalancinta Aizat|Novia", "guide"));
    const [nama1, nama2] = text.split("|");

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/ramalan-cinta?nama1=${encodeURIComponent(nama1)}&nama2=${encodeURIComponent(nama2)}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("ramalancinta", "Data tidak ditemukan!", "error"));

    let msg = `\u256d\u2500\u2500\u300c *RAMALANCINTA* \u300d\u2500\u2500\u2510\n`;
    Object.entries(d).forEach(([k, v]) => {
      msg += `\u2502 ${k}: ${v}\n`;
    });
    msg += `\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("ramalancinta error:", err);
    await m.react("\u274C");
    return m.reply(claraWrap("ramalancinta", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
