// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// myip.js — Cek IP address
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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

    let msg = `╭──「 *IP INFO* 」\n`;
    msg += `│ 🌐 IP: ${d.ip || "Unknown"}\n`;
    msg += `│ 🏙️ City: ${d.city || "Unknown"}\n`;
    msg += `│ 🗺️ Region: ${d.region || "Unknown"}\n`;
    msg += `│ 🇮🇩 Country: ${d.country_name || "Unknown"}\n`;
    msg += `│ 📮 Postal: ${d.postal || "Unknown"}\n`;
    msg += `│ 🏢 ISP: ${d.org || "Unknown"}\n`;
    msg += `│ 📍 Lat: ${d.latitude || "?"} Lon: ${d.longitude || "?"}\n`;
    msg += `│ 🕐 Timezone: ${d.timezone || "Unknown"}\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("myip error:", err);
    await m.react("❌");
    return m.reply(claraWrap("myip", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
