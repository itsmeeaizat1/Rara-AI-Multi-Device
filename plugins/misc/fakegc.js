// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fakegc.js — Fake group chat screenshot
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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

    let result = `╭─「 ✦ GROUP CHAT ✦ 」\n`;
    result += `│ ${name || "Anonymous"} - ${time}\n`;
    result += `│ ${msg}\n`;
    result += `│\n`;
    result += `│ ${m.pushName || "Kamu"} - ${time}\n`;
    result += `│ ↩️ ${msg}\n`;
    result += `╰────  •  ────`;
    await m.react("🐣");
    return m.reply(result);
  } catch (err) {
    console.error("fakegc error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fakegc", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
