// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (Clara-MD box style + type 1 buttons + thumbnail menu.jpg)
import { getCaseCount, getCasesByCategory } from "../../case/nova.js";
import config from "../../config.js";
import {
  getImportantDay,
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import fs from "fs";
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { buildCategoryButton } from "../../src/lib/nova-category-list.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, toSC, closeBoxRight, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "menu",
  alias: ["menu"],
  category: "main",
  description: "Menampilkan menu utama bot",
  usage: ".menu",
  example: ".menu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getWeton(date = new Date()) {
  const days = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];
  const ref = new Date(1900, 0, 1);
  const diff = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  return days[((diff % 5) + 5) % 5];
}

function getIslamicDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch { return "-"; }
}

function formatBytes(b) {
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

// Thumbnail: menu.jpg — cached once
let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[menu] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[menu] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function buildMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();
    const timeStr = fmtTime("HH:mm");
    const dayName = fmtFull("dddd");
    const dateStr = fmtFull("DD MMMM YYYY");
    const weton = getWeton(now);
    const islamicDate = getIslamicDate(now);
    const importantDay = await getImportantDay(now).catch(() => "-");

    let userRole = "User";
    if (m.isOwner) { userRole = "Owner"; }
    else if (m.isPremium) { userRole = "Premium"; }

    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt || u.isRegistered).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const totalBanned = Object.values(allUsers).filter(u => u.isBanned).length;
    const allGroups = db.getAllGroups();
    const totalGroups = Object.keys(allGroups).length;
    const totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;
    // Hitung user yang punya warning/spam record
    const totalUnregistered = Object.values(allUsers).filter(u => u.unregisteredAt).length;
    const totalWarned = Object.values(allUsers).filter(u => {
      const w = u.warnings;
      return Array.isArray(w) ? w.length > 0 : (w && typeof w === 'object' ? Object.keys(w).length > 0 : false);
    }).length;
    // Stats dari db.stats
    const dbStats = db.getStats();
    const totalCommandsRun = dbStats.commandsRun || dbStats.totalCommands || 0;
    const totalMessagesIn = dbStats.messagesReceived || dbStats.totalMessages || 0;
    const totalMessagesOut = dbStats.messagesSent || 0;
    const totalStickerMade = dbStats.stickerMade || 0;
    const totalDownloads = dbStats.downloads || 0;
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const cpuCores = os.cpus().length;
    let cpuSpeed = os.cpus()[0]?.speed || 0;
    let cpuModel = os.cpus()[0]?.model || "Unknown";
    // Fallback: baca /proc/cpuinfo kalau container tidak expose CPU info
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
    const hostname = os.hostname();
    const serverUptime = formatUptime(os.uptime());
    const loadAvg = os.loadavg()[0].toFixed(2);
    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;
    const runtimeStr = formatUptime(uptime);
    const platform = process.platform;

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `\n${wf}\n`;
    } catch {}

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0;
    for (const cat of pluginCats) totalFitur += (commandsByCategory[cat] || []).length;
    for (const cat of Object.keys(caseCats)) totalFitur += (caseCats[cat] || []).length;

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    return `
╭──「 *${toSC("Info Profil")}* 」
│ *${toSC("Nama")}:*  ${toSC(m.pushName || "User")}
│ *${toSC("Nomor")}:* @${m.sender.split("@")[0]}
│ *${toSC("Premium")}:* ${toSC(m.isPremium ? "Aktif" : "Free")}
│ *${toSC("Energi")}:* ${m.isOwner || m.isPremium ? toSC("∞ Unlimited") : (user?.energi ?? 25)}
│ *${toSC("Koin")}:* ${(user?.koin ?? 0).toLocaleString()}
│ *${toSC("Limit")}:* ${m.isOwner || m.isPremium ? toSC("Unlimited") : (user?.limit ?? "-")}
│ *${toSC("Role")}:* ${toSC(userRole)}
│ *${toSC("Level")}:* ${userLevel}
│ *${toSC("Xp")}:* ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
│ *${toSC("Total Xp")}:* ${userExp.toLocaleString()}
│ *${toSC("Status")}:* ${toSC(user?.banned ? "Banned" : "Aktif")}
├──「 *${toSC("Info Waktu")}*
│ *${toSC("Waktu")}:* ${timeStr} ${toSC("WIB")}
│ *${toSC("Hari")}:* ${toSC(dayName)} ${toSC(weton)}
│ *${toSC("Tanggal")}:* ${dateStr}
│ *${toSC("Tanggal Islam")}:* ${islamicDate}
│ *${toSC("Zona")}:* ${toSC("Asia/Jakarta")}
│ *${toSC("Hari Penting")}:* ${toSC(importantDay)}
├──「 *${toSC("Info Bot")}*
│ *${toSC("Bot Name")}:* ${toSC(botConfig.bot?.name || "Nova AI Whatsapp Bot")}
│ *${toSC("Bot Nomor")}:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : toSC("Unknown")}
│ *${toSC("Version")}:* ${botConfig.bot?.version || "-"}
│ *${toSC("Developer")}:* ${toSC(botConfig.bot?.developer || "-")}
│ *${toSC("Mode")}:* ${toSC((botConfig.mode || "public").toUpperCase())}
│ *${toSC("Prefix")}:* [ *${prefix}* ]
│ *${toSC("Uptime")}:* ${runtimeStr}
│ *${toSC("Total User")}:* ${totalUsers}
│ *${toSC("Total Registrasi")}:* ${totalRegistered}
│ *${toSC("Premium User")}:* ${totalPremium}
├──「 *${toSC("Info Database")}*
│ *${toSC("Total User")}:* ${totalUsers}
│ *${toSC("Terdaftar")}:* ${totalRegistered}
│ *${toSC("Premium")}:* ${totalPremium}
│ *${toSC("Diblokir")}:* ${totalBanned}
│ *${toSC("Batal Daftar")}:* ${totalUnregistered}
│ *${toSC("Kena Warn")}:* ${totalWarned}
│ *${toSC("Grup Aktif")}:* ${totalActiveGroups} / ${totalGroups}
│ *${toSC("Pesan Masuk")}:* ${totalMessagesIn > 0 ? totalMessagesIn.toLocaleString() : '-'}
│ *${toSC("Pesan Keluar")}:* ${totalMessagesOut > 0 ? totalMessagesOut.toLocaleString() : '-'}
│ *${toSC("Command Run")}:* ${totalCommandsRun > 0 ? totalCommandsRun.toLocaleString() : '-'}
│ *${toSC("Sticker Dibuat")}:* ${totalStickerMade > 0 ? totalStickerMade.toLocaleString() : '-'}
│ *${toSC("Download")}:* ${totalDownloads > 0 ? totalDownloads.toLocaleString() : '-'}
├──「 *${toSC("Info Server")}*
│ *${toSC("Platform")}:* ${toSC(platform)}
│ *${toSC("Hostname")}:* ${toSC(hostname)}
│ *${toSC("Type")}:* ${toSC("Node.Js")}
│ *${toSC("Baileys")}:* ${toSC("Multi Device")}
│ *${toSC("Node.js")}:* ${process.version}
│ *${toSC("Server Uptime")}:* ${serverUptime}
│ *${toSC("CPU")}:* ${cpuModel}
│ *${toSC("Cores")}:* ${cpuCores} ${toSC("threads")} @ ${cpuSpeed} MHz
│ *${toSC("Load Avg")}:* ${loadAvg}
│ *${toSC("RAM")}:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
│ *${toSC("RAM Bot")}:* ${formatBytes(memUsage.rss)}
╰──────────╯
${weatherBlock}${readMore}
${novaBox(toSC("Menu"), [
  `${prefix}menu`,
  `${prefix}allmenu`,
  `${prefix}allmenucategory ${toSC("<kategori>")}`,
  `${prefix}tanyaai`,
])}

${novaBox(toSC("Info"), [
  `${prefix}info`,
  `${prefix}owner`,
  `${prefix}rules`,
  `${prefix}donasi`,
])}

${novaBox(toSC("Store"), [
  `${prefix}sewa`,
  `${prefix}payment`,
  `${prefix}listban`,
])}

*${toSC("Total")}: ${totalFitur} ${toSC("Fitur")}*

${toSC(getTimeGreeting())} *${toSC(m.pushName || "User")}* 

${toSC("Ketik")} *${prefix}allmenu* ${toSC("untuk melihat semua fitur")}

${toSC("Nova AI WhatsApp Bot")}`;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return "Menu error: " + e.message;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // 6 tombol quick access — nativeFlowMessage (proven pattern, bukan legacy type 1)
    // "Kategori" pakai single_select → klik buka popup list semua kategori
    const navButtons = [
      { id: `${prefix}menu`, text: toSC("Menu") },
      { id: `${prefix}allmenu`, text: toSC("All Menu") },
      buildCategoryButton(m, db, prefix),
      { id: `${prefix}tanyaai`, text: toSC("Tanya AI") },
      { id: `${prefix}info`, text: toSC("Info") },
      { id: `${prefix}owner`, text: toSC("Owner") },
    ];
    await sendMenuCard(sock, m, {
      text: closeBoxRight(text),
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply(`╭──「 ${toSC("Menu")} 」\n│ ${toSC("Ada error nih")}\n│ ${toSC("Coba lagi ya")}\n╰──────────╯`); } catch {}
  }
}

export { pluginConfig as config, handler };
