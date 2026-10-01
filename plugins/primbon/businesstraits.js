// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// businesstraits.js — Sifat usaha
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "sifatusaha",
  alias: ["sifatusaha", "sifatusaha"],
  category: "primbon",
  description: "Sifat usaha",
  usage: ".sifatusaha <tgl,bln,thn>",
  example: ".sifatusaha 7,7,2005",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("\U0001F560");
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(raraWrap("sifatusaha", "Contoh: .sifatusaha 7,7,2005", "guide"));
    const [tgl, bln, thn] = text.split(",");
    if (!tgl || !bln || !thn) return m.reply(raraWrap("sifatusaha", "Format: tgl,bln,thn", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/sifat-usaha?tgl=${tgl}&bln=${bln}&thn=${thn}`, { timeout: 15000 });
    const d = res.data?.data;
    if (!d) return m.reply(raraWrap("sifatusaha", "Data tidak ditemukan!", "error"));

    let _lines = [];
    Object.entries(d).forEach(([k, v]) => {
      _lines.push(`${k}: ${v}`);
    });
    let msg = raraBox("SIFATUSAHA", _lines);
    await m.react("\U0001F423");
    return m.reply(msg);
  } catch (err) {
    console.error("sifatusaha error:", err);
    await m.react("\u274C");
    return m.reply(raraWrap("sifatusaha", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
