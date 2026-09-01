// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fitnah.js — Fake chat untuk fitnah (prank)
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fitnah",
  alias: ["fitnah", "fakefitnah"],
  category: "misc",
  description: "Buat fake chat fitnah (prank)",
  usage: ".fitnah @target | pesan_target | pesan_balasan",
  example: ".fitnah @Budi | Bro pinjam duit | Gak ada duit bro",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const text = m.args?.join(" ") || "";
    const parts = text.split("|").map(s => s.trim());
    const target = parts[0] || "Someone";
    const targetMsg = parts[1] || "Halo";
    const replyMsg = parts[2] || "Oh iya";
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

    let result = "";
    result += `
`;
    result += `${target} - ${time}\n`;
    result += `${targetMsg}\n`;
    result += `
`;
    result += `${m.pushName || "Kamu"} - ${time}\n`;
    result += `${replyMsg}\n`;
    result += `
`;
    result += `⚠️ Ini hanya prank/hiburan\n`;
        await m.react("🐣");
    return m.reply(result);
  } catch (err) {
    console.error("fitnah error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fitnah", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
