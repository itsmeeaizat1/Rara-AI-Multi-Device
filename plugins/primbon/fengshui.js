// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fengshui.js — Perhitungan feng shui
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fengshui",
  alias: ["fengshui", "fengshui"],
  category: "primbon",
  description: "Perhitungan feng shui",
  usage: ".fengshui <nama,gender,thn>",
  example: ".fengshui Aizat,1,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(novaWrap("fengshui", "Contoh: .fengshui Aizat,1,2005", "guide"));
    const [nama, gender, tahun] = text.split(",");
    if (!nama || !gender || !tahun) return m.reply(novaWrap("fengshui", "Format: nama,gender,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/feng-shui?nama=${encodeURIComponent(nama)}&gender=${gender}&tahun=${tahun}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(novaWrap("fengshui", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = novaBox("FENG SHUI", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("fengshui error:", err);
    await m.react("\u274C");
    return m.reply(novaWrap("fengshui", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
