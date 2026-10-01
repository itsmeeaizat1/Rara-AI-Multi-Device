// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fortunepath.js — Arah rejeki
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "arahrejeki",
  alias: ["arahrejeki", "arahrezeki"],
  category: "primbon",
  description: "Arah rejeki berdasarkan tanggal lahir",
  usage: ".arahrejeki <tgl,bln,thn>",
  example: ".arahrejeki 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("arahrejeki", "Contoh: .arahrejeki 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(raraWrap("arahrejeki", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/arah-rejeki?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("arahrejeki", "Data tidak ditemukan!", "error"));

    let _lines = [];
      _lines.push(`📅 Hari Lahir: ${d.hari_lahir || "-"}`);
      _lines.push(`📆 Tanggal: ${d.tgl_lahir || "-"}`);
      _lines.push(`🧭 Arah Rezeki: ${d.arah_rejeki || "-"}`);
      _lines.push(`📝 Catatan: ${d.catatan || "-"}`);
    let msg = raraBox("ARAH REJEKI", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("arahrejeki error:", err);
    await m.react("❌");
    return m.reply(raraWrap("arahrejeki", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
