// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// myip.js — Cek IP address
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "myip",
  alias: ["myip", "cekip", "ipinfo"],
  category: "misc",
  description: "Cek info IP address",
  usage: ".myip [ip_address]",
  example: ".myip\n.myip 8.8.8.8",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const ip = m.args?.[0]?.trim() || "";
    const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
    const res = await axios.get(url);
    const d = res.data;

    let _lines = [];
      _lines.push(`🌐 IP: ${d.ip || "Unknown"}`);
      _lines.push(`🏙️ City: ${d.city || "Unknown"}`);
      _lines.push(`🗺️ Region: ${d.region || "Unknown"}`);
      _lines.push(`🇮🇩 Country: ${d.country_name || "Unknown"}`);
      _lines.push(`📮 Postal: ${d.postal || "Unknown"}`);
      _lines.push(`🏢 ISP: ${d.org || "Unknown"}`);
      _lines.push(`📍 Lat: ${d.latitude || "?"} Lon: ${d.longitude || "?"}`);
      _lines.push(`🕐 Timezone: ${d.timezone || "Unknown"}`);
    let msg = novaBox("IP INFO", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("myip error:", err);
    await m.react("❌");
    return m.reply(novaWrap("myip", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
