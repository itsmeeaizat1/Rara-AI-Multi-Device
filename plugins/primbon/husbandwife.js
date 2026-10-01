// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// husbandwife.js — Sifat suami istri
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "suamiistri",
  alias: ["suamiistri", "suamiistri"],
  category: "primbon",
  description: "Sifat suami istri",
  usage: ".suamiistri <tgl,bln,thn>",
  example: ".suamiistri 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("suamiistri", "Contoh: .suamiistri 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(raraWrap("suamiistri", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/suami-istri?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("suamiistri", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("SUAMIISTRI", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("suamiistri error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("suamiistri", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
