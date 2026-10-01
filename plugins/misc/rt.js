// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rt.js — Bot runtime info
import os from "os";
import te from "../../src/lib/nova-error.js";
import { novaWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const startTime = Date.now();

const pluginConfig = {
  name: "rt",
  alias: ["rt", "runtime", "uptime"],
  category: "misc",
  description: "Cek uptime bot",
  usage: ".rt",
  example: ".rt",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let str = "";
  if (d) str += `${d}d `;
  if (h) str += `${h}h `;
  if (m) str += `${m}m `;
  str += `${sec}s`;
  return str;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const uptime = Date.now() - startTime;
    const mem = process.memoryUsage();

    let _lines = [];
      _lines.push(`⏱️ Uptime: ${formatUptime(uptime)}`);
      _lines.push(`🖥️ Platform: ${os.platform()} ${os.arch()}`);
      _lines.push(`💾 RAM: ${(mem.rss / 1024 / 1024).toFixed(1)} MB`);
      _lines.push(`⚡ CPU: ${os.loadavg()[0].toFixed(2)}`);
      _lines.push(`🕐 Time: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`);
    let msg = novaBox("RUNTIME", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("rt error:", err);
    await m.react("❌");
    return m.reply(novaWrap("rt", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
