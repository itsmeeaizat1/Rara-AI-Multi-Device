// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// dreammeaning.js — Arti mimpi
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

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
    if (!text) return m.reply(raraWrap("artimimpi", "Contoh: .artimimpi belanja", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/tafsir-mimpi?mimpi=${encodeURIComponent(text)}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("artimimpi", "Mimpi tidak ditemukan!", "error"));

    let _lines = [];
      _lines.push(`Mimpi: ${d.mimpi || text}`);
      _lines.push(`Arti: ${d.arti || "-"}`);
    let msg = raraBox("ARTI MIMPI", _lines);
    if (d.solusi) _lines.push(`Solusi: ${d.solusi}`);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("artimimpi error:", err);
    await m.react("❌");
    return m.reply(raraWrap("artimimpi", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
