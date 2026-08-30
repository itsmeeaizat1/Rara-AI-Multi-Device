// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// artimimpi.js — Arti mimpi
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "artimimpi",
  alias: ["artimimpi", "tafsirmimpi"],
  category: "primbon",
  description: "Arti mimpi menurut primbon",
  usage: ".artimimpi <mimpi>",
  example: ".artimimpi belanja",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(claraWrap("artimimpi", "Contoh: .artimimpi belanja", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/tafsir-mimpi?mimpi=${encodeURIComponent(text)}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(claraWrap("artimimpi", "Mimpi tidak ditemukan!", "error"));

    let msg = `╭──「 *ARTI MIMPI* 」\n`;
    msg += `│ Mimpi: ${d.mimpi || text}\n`;
    msg += `│ Arti: ${d.arti || "-"}\n`;
    if (d.solusi) msg += `│ Solusi: ${d.solusi}\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("artimimpi error:", err);
    await m.react("❌");
    return m.reply(claraWrap("artimimpi", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
