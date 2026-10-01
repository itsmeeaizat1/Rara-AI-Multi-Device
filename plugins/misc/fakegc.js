// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// fakegc.js — Fake group chat screenshot
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fakegc",
  alias: ["fakegc", "fakechat", "fakegroup"],
  category: "misc",
  description: "Buat fake group chat (prank)",
  usage: ".fakegc <nama>|<pesan>",
  example: ".fakegc Budi|Bro, kamu dimana?",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const text = m.args?.join(" ") || "";
    const [name, ...msgParts] = text.split("|");
    const msg = msgParts.join("|") || "Halo!";
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

    let result = "";
    result += `${name || "Anonymous"} - ${time}\n`;
    result += `${msg}\n`;
    result += `
`;
    result += `${m.pushName || "Kamu"} - ${time}\n`;
    result += `↩️ ${msg}\n`;
        await m.react("🐣");
    return m.reply(result);
  } catch (err) {
    console.error("fakegc error:", err);
    await m.react("❌");
    return m.reply(raraWrap("fakegc", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
