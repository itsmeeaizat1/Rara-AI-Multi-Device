// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// partnercompat.js — Kecocokan pasangan
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kecocokanpasangan",
  alias: ["kecocokanpasangan", "cocokpasangan"],
  category: "primbon",
  description: "Kecocokan pasangan",
  usage: ".kecocokanpasangan <nama1|nama2>",
  example: ".kecocokanpasangan Aizat|Novia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text || !text.includes("|")) return m.reply(novaWrap("kecocokanpasangan", "Contoh: .kecocokanpasangan Aizat|Novia", "guide"));
    const [nama1, nama2] = text.split("|");

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/kecocokan-pasangan?nama1=${encodeURIComponent(nama1)}&nama2=${encodeURIComponent(nama2)}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(novaWrap("kecocokanpasangan", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = novaBox("KECOCOKANPASANGAN", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("kecocokanpasangan error:", err);
    await m.react("\u274C");
    return m.reply(novaWrap("kecocokanpasangan", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
