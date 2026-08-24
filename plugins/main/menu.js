// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (root sendMessage + externalAdReply preview card + type 1 buttons)
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

const pluginConfig = {
  name: "menu",
  alias: ["help", "bantuan", "commands", "m"],
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

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c);

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

// ── Load thumbnail raw buffer (NO sharp, cached) ──
let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "nova-thumbnail-menu.jpg");
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

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const cpuModel = os.cpus()[0]?.model || "Unknown";
    const cpuCores = os.cpus().length;
    const cpuSpeed = os.cpus()[0]?.speed || "-";
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

    return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Iɴғᴏ Usᴇʀ
┊
  ┊  ➶ *Nama:* ${m.pushName || "User"}
  ┊  ➶ *Nomor:* @${m.sender.split("@")[0]}
  ┊  ➶ *Premium:* ${m.isPremium ? "Aktif" : "Free"}
  ┊  ➶ *Energi:* ${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}
  ┊  ➶ *Koin:* ${(user?.koin ?? 0).toLocaleString()}
  ┊  ➶ *Limit:* ${m.isOwner || m.isPremium ? "Unlimited" : (user?.limit ?? "-")}
  ┊  ➶ *Role:* ${roleEmoji} ${userRole}
  ┊  ➶ *Level:* ${userLevel}
  ┊  ➶ *Xp:* ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
  ┊  ➶ *Total Xp:* ${userExp.toLocaleString()}
  ┊  ➶ *Status:* ${user?.banned ? "Banned" : "Aktif"}
╠┈┈「 *Iɴғᴏ Wᴀᴋᴛᴜ* 」
  ┊  ➶ *Waktu:* ${timeStr} WIB
  ┊  ➶ *Hari:* ${dayName} ${weton}
  ┊  ➶ *Tanggal:* ${dateStr}
  ┊  ➶ *Tanggal Islam:* ${islamicDate}
  ┊  ➶ *Zona:* Asia/Jakarta
  ┊  ➶ *Hari Penting:* ${importantDay}
╠┈┈「 *Iɴғᴏ Bᴏᴛ* 」
  ┊  ➶ *Bot Name:* ${botConfig.bot?.name || "Nova AI Whatsapp Bot"}
  ┊  ➶ *Bot Nomor:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : "Unknown"}
  ┊  ➶ *Version:* ${botConfig.bot?.version || "-"}
  ┊  ➶ *Developer:* ${botConfig.bot?.developer || "-"}
  ┊  ➶ *Mode:* ${(botConfig.mode || "public").toUpperCase()}
  ┊  ➶ *Prefix:* [ *${prefix}* ]
  ┊  ➶ *Uptime:* ${runtimeStr}
  ┊  ➶ *Total User:* ${totalUsers}
  ┊  ➶ *Total Registrasi:* ${totalRegistered}
  ┊  ➶ *Premium User:* ${totalPremium}
╠┈┈「 *Iɴғᴏ Sᴇʀᴠᴇʀ* 」
  ┊  ➶ *Platform:* ${platform}
  ┊  ➶ *Hostname:* ${hostname}
  ┊  ➶ *Type:* Node.Js
  ┊  ➶ *Baileys:* Multi Device
  ┊  ➶ *Node.js:* ${process.version}
  ┊  ➶ *Server Uptime:* ${serverUptime}
  ┊  ➶ *CPU:* ${cpuModel}
  ┊  ➶ *Cores:* ${cpuCores} threads @ ${cpuSpeed} MHz
  ┊  ➶ *Load Avg:* ${loadAvg}
  ┊  ➶ *RAM:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
  ┊  ➶ *RAM Bot:* ${formatBytes(memUsage.rss)}
${weatherBlock ? weatherBlock : ""}❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}
❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Nᴏᴠᴀ Mᴇɴᴜ
┊
  ° ✿ Menu ✿ °
  ┊  ➶ ${prefix}menu
  ┊  ➶ ${prefix}allmenu
  ┊  ➶ ${prefix}allmenucategory <kategori>
  ┊  ➶ ${prefix}tanyaai
┊
  ° ✿ Info ✿ °
  ┊  ➶ ${prefix}info
  ┊  ➶ ${prefix}owner
  ┊  ➶ ${prefix}rules
  ┊  ➶ ${prefix}donasi
┊
  ° ✿ Store ✿ °
  ┊  ➶ ${prefix}sewa
  ┊  ➶ ${prefix}payment
  ┊  ➶ ${prefix}listban
┊
  *Total: ${totalFitur} Fitur*
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${getTimeGreeting()} *${m.pushName || "User"}* 👋
Ketik *${prefix}allmenu* untuk melihat semua fitur`;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return "❀°˖ Menu ˖°❀\n\nError: " + e.message + "\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕐");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const thumbBuffer = getThumb();
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const saluranLink = botConfig.saluran?.link || "";
    const footerText = `${botName} | Nova AI WhatsApp Bot`;

    // Tombol navigasi type 1 (support externalAdReply preview card)
    // Thumbnail sebagai preview card = TIDAK tersimpan ke galeri HP
    const buttons = [
      { buttonId: `${prefix}allmenu`, buttonText: { displayText: "📋 All Menu" }, type: 1 },
      { buttonId: `${prefix}allmenucategory`, buttonText: { displayText: "📂 Kategori" }, type: 1 },
      { buttonId: `${prefix}tanyaai`, buttonText: { displayText: "🤖 Tanya AI" }, type: 1 },
      { buttonId: `${prefix}owner`, buttonText: { displayText: "👑 Owner" }, type: 1 },
    ];

    try {
      await sock.sendMessage(m.chat, {
        text: text,
        footer: footerText,
        buttons: buttons,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "WhatsApp Multi Device",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      console.error("[menu] buttons gagal, fallback:", btnErr.message);
      await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "WhatsApp Multi Device",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("✅");

    // Kirim musik menu (jika audioMenu aktif)
    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig, handler };
