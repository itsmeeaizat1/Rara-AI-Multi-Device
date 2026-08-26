// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command lengkap per kategori
// Thumbnail: menu.jpg (cewek pantai) + externalAdReply di ROOT contextInfo
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import config from "../../config.js";
import {
  getTimeGreeting,
  formatUptime,
  getImportantDay,
} from "../../src/lib/nova-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/nova-plugins.js";
import fs from "fs";
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["allmenu", "menuall", "fullmenu"],
  category: "main",
  description: "Menampilkan semua command lengkap per kategori",
  usage: ".allmenu",
  example: ".allmenu",
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

const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "game", "rpg", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Game", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";
  const symbols = [];
  if (plugin.config.isOwner) symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin) symbols.push("Ⓐ");
  if (plugin.config.isGroup) symbols.push("Ⓖ");
  if (plugin.config.isPrivate) symbols.push("Ⓟ");
  return symbols.length > 0 ? " " + symbols.join(" ") : "";
}

// Thumbnail: menu.jpg (cewek pantai) — cached once
let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenu] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[allmenu] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();

    // Import time helpers
    const timeHelper = await import("../../src/lib/nova-time.js");
    const timeStr = timeHelper.formatTime("HH:mm");
    const dayName = timeHelper.formatFull("dddd");
    const dateStr = timeHelper.formatFull("DD MMMM YYYY");
    const weton = getWeton(now);
    const islamicDate = getIslamicDate(now);
    const importantDay = await getImportantDay(now).catch(() => "-");

    const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
    const botMode = groupData.botMode || "md";
    const categories = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const casesByCategory = getCasesByCategory();
    let totalCommands = 0;
    for (const cat of categories) totalCommands += (commandsByCategory[cat] || []).length;
    const totalCases = getCaseCount();
    const totalFeatures = totalCommands + totalCases;

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const greeting = getTimeGreeting();
    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `\n${wf}\n`;
    } catch {}

    const runtimeStr = formatUptime(uptime);
    const platform = process.platform;
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

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    const botName = config.bot?.name || "Nova AI Whatsapp Bot";

    // ── Info section ──
    let txt = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Iɴғᴏ Usᴇʀ
┊
  ┊  ➶ *ɴᴀᴍᴀ:* ${m.pushName || "User"}
  ┊  ➶ *ɴᴏᴍᴏʀ:* @${m.sender.split("@")[0]}
  ┊  ➶ *ᴘʀᴇᴍɪᴜᴍ:* ${m.isPremium ? "Aktif" : "Free"}
  ┊  ➶ *ᴇɴᴇʀɢɪ:* ${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}
  ┊  ➶ *ᴋᴏɪɴ:* ${(user?.koin ?? 0).toLocaleString()}
  ┊  ➶ *ʟɪᴍɪᴛ:* ${m.isOwner || m.isPremium ? "Unlimited" : (user?.limit ?? "-")}
  ┊  ➶ *ʀᴏʟᴇ:* ${roleEmoji} ${userRole}
  ┊  ➶ *ʟᴇᴠᴇʟ:* ${userLevel}
  ┊  ➶ *Xp:* ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
  ┊  ➶ *ᴛᴏᴛᴀʟ xᴘ:* ${userExp.toLocaleString()}
  ┊  ➶ *ꜱᴛᴀᴛᴜꜱ:* ${user?.banned ? "Banned" : "Aktif"}
╠┈┈「 *Iɴғᴏ Wᴀᴋᴛᴜ* 」
  ┊  ➶ *ᴡᴀᴋᴛᴜ:* ${timeStr} WIB
  ┊  ➶ *ʜᴀʀɪ:* ${dayName} ${weton}
  ┊  ➶ *ᴛᴀɴɢɢᴀʟ:* ${dateStr}
  ┊  ➶ *ᴛᴀɴɢɢᴀʟ ɪꜱʟᴀᴍ:* ${islamicDate}
  ┊  ➶ *ᴢᴏɴᴀ:* Asia/Jakarta
  ┊  ➶ *ʜᴀʀɪ ᴘᴇɴᴛɪɴɢ:* ${importantDay}
╠┈┈「 *Iɴғᴏ Bᴏᴛ* 」
  ┊  ➶ *ʙᴏᴛ ɴᴀᴍᴇ:* ${botConfig.bot?.name || botName}
  ┊  ➶ *ʙᴏᴛ ɴᴏᴍᴏʀ:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : "Unknown"}
  ┊  ➶ *ᴠᴇʀꜱɪᴏɴ:* ${botConfig.bot?.version || "-"}
  ┊  ➶ *ᴅᴇᴠᴇʟᴏᴘᴇʀ:* ${botConfig.bot?.developer || "-"}
  ┊  ➶ *ᴍᴏᴅᴇ:* ${(botConfig.mode || "public").toUpperCase()}
  ┊  ➶ *ᴘʀᴇꜰɪx:* [ *${prefix}* ]
  ┊  ➶ *ᴜᴘᴛɪᴍᴇ:* ${runtimeStr}
  ┊  ➶ *ᴛᴏᴛᴀʟ ᴜꜱᴇʀ:* ${totalUsers}
  ┊  ➶ *ᴛᴏᴛᴀʟ ʀᴇɢɪꜱᴛʀᴀꜱɪ:* ${totalRegistered}
  ┊  ➶ *ᴘʀᴇᴍɪᴜᴍ ᴜꜱᴇʀ:* ${totalPremium}
  ┊  ➶ *ᴛᴏᴛᴀʟ ꜰɪᴛᴜʀ:* ${totalFeatures}
╠┈┈「 *Iɴғᴏ Sᴇʀᴠᴇʀ* 」
  ┊  ➶ *ᴘʟᴀᴛꜰᴏʀᴍ:* ${platform}
  ┊  ➶ *ʜᴏꜱᴛɴᴀᴍᴇ:* ${hostname}
  ┊  ➶ *ᴛʏᴘᴇ:* Node.Js
  ┊  ➶ *ʙᴀɪʟᴇʏꜱ:* Multi Device
  ┊  ➶ *ɴᴏᴅᴇ.ᴊꜱ:* ${process.version}
  ┊  ➶ *ꜱᴇʀᴠᴇʀ ᴜᴘᴛɪᴍᴇ:* ${serverUptime}
  ┊  ➶ *ᴄᴘᴜ:* ${cpuModel}
  ┊  ➶ *ᴄᴏʀᴇꜱ:* ${cpuCores} threads @ ${cpuSpeed} MHz
  ┊  ➶ *ʟᴏᴀᴅ ᴀᴠɢ:* ${loadAvg}
  ┊  ➶ *ʀᴀᴍ:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
  ┊  ➶ *ʀᴀᴍ ʙᴏᴛ:* ${formatBytes(memUsage.rss)}
${weatherBlock}❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}
`;

    // ── Keterangan simbol ──
    txt += `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ALLMENU

  ° ✿ Keterangan ✿ °
  ┊  ➶ Ⓞ = Hanya untuk owner
  ┊  ➶ ⓟ = Hanya untuk premium
  ┊  ➶ Ⓛ = Membutuhkan limit
  ┊  ➶ Ⓐ = Hanya untuk admin
  ┊  ➶ Ⓖ = Hanya di dalam grup
  ┊  ╰➶ Ⓟ = Hanya di private chat

`;

    // ── Category commands ──
    const sortedCategories = [...categories].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a); const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let modeExcludeMap = { md: ["panel", "pushkontak", "store"] };
    try {
      if (botmodePlugin?.MODES) {
        modeExcludeMap = {};
        for (const [k, v] of Object.entries(botmodePlugin.MODES)) {
          modeExcludeMap[k] = v.excludeCategories;
        }
      }
    } catch (e) { console.error('[allmenu]:', e.message); }

    const excludeCategories = modeExcludeMap[botMode] || [];

    for (const category of sortedCategories) {
      if (category === "owner" && !m.isOwner) continue;
      if (excludeCategories.includes(category.toLowerCase())) continue;
      const pluginCmds = commandsByCategory[category] || [];
      const caseCmds = casesByCategory[category] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const catName = CATEGORY_NAMES[category] || category.charAt(0).toUpperCase() + category.slice(1);

      txt += `  ° ✿ ${catName} ✿ °\n`;
      for (let i = 0; i < allCmds.length; i++) {
        const cmd = allCmds[i];
        const symbols = getCommandSymbols(cmd);
        const isLast = i === allCmds.length - 1;
        txt += `  ┊  ${isLast ? '╰' : ''}➶ ${prefix}${cmd}${symbols}\n`;
      }
      txt += `\n`;
    }

    txt += `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n`;

    // ── Send: text + type 1 buttons + externalAdReply di ROOT contextInfo ──
    const menuThumb = getThumb();
    const botVersion = `v${config.bot?.version || "1.0.0"}`;
    const buttons = [
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}allmenucategory`, buttonText: { displayText: "📂 Kategori" }, type: 1 },
      { buttonId: `${prefix}owner`, buttonText: { displayText: "👑 Owner" }, type: 1 },
    ];

    try {
      await sock.sendMessage(m.chat, {
        text: txt,
        footer: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀",
        buttons: buttons,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "WhatsApp Multi Device",
            thumbnail: menuThumb,
            sourceUrl: botConfig.saluran?.link || "",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      console.error("[allmenu] buttons gagal, fallback:", btnErr.message);
      await sock.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "WhatsApp Multi Device",
            thumbnail: menuThumb,
            sourceUrl: botConfig.saluran?.link || "",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("🐣");

    // Kirim musik menu (jika audioMenu aktif)
    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan allmenu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
