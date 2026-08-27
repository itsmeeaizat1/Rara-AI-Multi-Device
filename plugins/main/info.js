// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { getPluginCount, getCategories } from "../../src/lib/nova-plugins.js";
import { getCaseCount } from "../../case/nova.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "info",
  alias: ["info"],
  category: "main",
  description: "Tampilkan info lengkap tentang bot",
  usage: ".info",
  example: ".info",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatBytes(b) {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI WhatsApp Bot";

    const dbInstance = getDatabase();
    const users = dbInstance?.db?.data?.users || {};
    const groups = dbInstance?.db?.data?.groups || {};
    const premium = dbInstance?.db?.data?.premium || [];

    const totalUsers = Object.keys(users).length;
    const totalGroups = Object.keys(groups).length;
    const totalPremium = Array.isArray(premium) ? premium.length : 0;
    const totalRegistered = Object.values(users).filter((u) => u?.name || u?.registered).length;

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const cpuCores = os.cpus().length;
    let cpuSpeed = os.cpus()[0]?.speed || 0;
    let cpuModel = os.cpus()[0]?.model || "Unknown";
    if ((!cpuSpeed || cpuSpeed === 0) || cpuModel === "Unknown") {
      try {
        const fs = require("fs");
        const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        const mhzMatch = cpuinfo.match(/cpu MHz\s*:\s*([\d.]+)/i);
        if (mhzMatch) cpuSpeed = Math.round(parseFloat(mhzMatch[1]));
        const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/i);
        if (modelMatch) cpuModel = modelMatch[1].trim();
      } catch {}
    }
    if (!cpuSpeed || cpuSpeed === 0) cpuSpeed = "-";
    const loadAvg = os.loadavg()[0].toFixed(2);
    const serverUptime = formatUptime(os.uptime() * 1000);
    const botUptime = uptime ? formatUptime(uptime) : formatUptime(process.uptime() * 1000);

    const pluginCount = getPluginCount();
    const caseCount = getCaseCount();
    const totalCategories = getCategories().length;
    const totalFeatures = pluginCount + caseCount;

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `${wf}\n\n`;
    } catch {}

    const text = `${weatherBlock}╭──「 *Bot Info* 」
│
├──「 *Identitas* 」
│ *Nama:* ${botName}
│ *Nomor:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : "Unknown"}
│ *Versi:* ${botConfig.bot?.version || "1.0.0"}
│ *Developer:* ${botConfig.bot?.developer || "-"}
│ *Platform:* Node.js + Baileys
│ *Mode:* ${(botConfig.mode || "public").toUpperCase()}
│ *Prefix:* [ *${prefix}* ]
├──「 *Info Database* 」
│ *Total User:* ${totalUsers}
│ *Total Grup:* ${totalGroups}
│ *User Terdaftar:* ${totalRegistered}
│ *Premium User:* ${totalPremium}
│ *Total Fitur:* ${totalFeatures}
│ *Total Kategori:* ${totalCategories}
├──「 *Server* 」
│ *OS:* ${os.platform()} ${os.arch()}
│ *Hostname:* ${os.hostname()}
│ *Node.js:* ${process.version}
│ *CPU:* ${cpuModel}
│ *Cores:* ${cpuCores} threads @ ${cpuSpeed} MHz
│ *Load Avg:* ${loadAvg}
│ *RAM:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
│ *RAM Bot:* ${formatBytes(memUsage.rss)}
│ *Uptime Server:* ${serverUptime}
│ *Uptime Bot:* ${botUptime}
╰──────────❀

Nova AI WhatsApp Bot`;

    const navButtons = [
      { id: `${prefix}menu`, text: "Menu" },
      { id: `${prefix}allmenu`, text: "All Menu" },
      { id: `${prefix}owner`, text: "Owner" },
    ];

    await m.react("🐣");

    await sendMenuCard(sock, m, {
      text,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: `${botName} — Info`,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[info] handler error:", e.message);
    try { await m.reply("╭──「 Info 」\n├── ❌ Gagal menampilkan info\n├── Coba lagi nanti ya\n╰──────────❀"); } catch {}
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
