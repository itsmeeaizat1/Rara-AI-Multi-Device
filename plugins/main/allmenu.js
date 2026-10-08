// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command per kategori (Rara box style + thumbnail menu.jpg)
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory, getCaseCount } from "../../case/rara.js";
import config from "../../config.js";
import {
  getTimeGreeting,
  formatUptime,
  getImportantDay,
} from "../../src/lib/rara-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/rara-plugins.js";
import fs from "fs";
import os from "os";
import path from "path";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/rara-menu-card.js";
import { buildNavButtons } from "../../src/lib/rara-menu-card.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, commandListLine, toSC, closeBoxRight, raraBox, raraMenuLayout, getAccessSymbols } from "../../src/lib/rara-menu-style.js";
import { buildMenuInfo } from "../../src/lib/rara-info-section.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["allmenu"],
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
  // URUTAN BARU (owner 10 Sep 2026): user dulu → ai → ai image → stiker →
  // maker → download → group → tools → sisanya → PALING AKHIR admin section.
  "user", "ai", "ai agent", "ai image", "sticker", "maker", "download", "group", "anonim", "sewa premium", "tools",
  "browser", "html", "convert", "fun", "couple", "confess menfess", "game",
  "rpg", "rpg couple", "clan",
  "search", "stalker", "anime", "jkt48", "airich", "asupan", "cecan", "nsfw",
  "media", "tts", "quotes", "primbon",
  "education", "food", "berita", "cuaca", "loker",
  "islami", "smart", "utility", "misc", "random",
  "store", "market", "jpm", "promotion",
  // PALING AKHIR (revisi owner 26 Sep): main & bot sebelum owner, panel setelah owner
  "vps", "main", "info", "bot", "owner", "panel",
];

const CATEGORY_NAMES = {
  ai: "AI", "ai agent": "AI Agent", "smart": "Smart", "ai image": "AI Image", sticker: "Sticker", maker: "Maker",
  vps: "VPS", tts: "TTS", quotes: "Quotes", primbon: "Primbon",
  berita: "Berita", cuaca: "Cuaca & Bencana", loker: "Lowongan Kerja",
  anime: "Anime", nsfw: "NSFW", convert: "Convert", search: "Search",
  stalker: "Stalker", jkt48: "JKT48", airich: "AI Rich", education: "Education", islami: "Islami", browser: "Browser", html: "HTML",
  download: "Download", fun: "Fun", couple: "Couple", "confess menfess": "Confess & Menfess", anonim: "Chat Anonim & Anonymous",
  tools: "Tools", game: "Game", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", promotion: "Promotion",
  panel: "Panel", owner: "Owner", store: "Store", "sewa premium": "Sewa & Premium",
  bot: "Bot",
};

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  return getAccessSymbols(plugin?.config);
}

let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu", "allmenuthumbnail.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenu] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[allmenu] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const user = db.getUser(m.sender);
    const now = new Date();

    const timeHelper = await import("../../src/lib/rara-time.js");
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

    let userRole = "User";
    if (m.isOwner) { userRole = "Owner"; }
    else if (m.isPremium) { userRole = "Premium"; }

    // Weather sudah dihandle oleh buildMenuInfo

    const runtimeStr = formatUptime(uptime);
    const platform = process.platform;
    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.isRegistered).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const totalBanned = Object.values(allUsers).filter(u => u.isBanned).length;
    const totalUnregistered = Object.values(allUsers).filter(u => u.unregisteredAt).length;
    const allGroups = db.getAllGroups();
    let totalGroups = Object.keys(allGroups).length;
    let totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;
    // live count grup (request owner 13 Sep) — registry bisa kosong
    try {
      const { countGroupsLive } = await import("../../src/lib/rara-group-registry.js");
      const live = await countGroupsLive(sock, db);
      if (live > 0) { totalGroups = live; totalActiveGroups = live; }
    } catch {}

    const totalWarned = Object.values(allUsers).filter(u => {
      const w = u.warnings;
      return Array.isArray(w) ? w.length > 0 : (w && typeof w === 'object' ? Object.keys(w).length > 0 : false);
    }).length;
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
        // fs already imported at top
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

    const botName = config.bot?.name || "Rara AI - Multi Device";

    // ── Info section lengkap (user, bot, database, server, weather) ──
    const { greeting: aiIntro, info: menuInfo, weatherStr } = await buildMenuInfo(m, { db, config: botConfig, uptime, sock });
    const info = menuInfo;

    // ── Category sections ──
    const sortedCategories = [...categories].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a); const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let modeExcludeMap = { md: ["panel", "store"] };
    try {
      if (botmodePlugin?.MODES) {
        modeExcludeMap = {};
        for (const [k, v] of Object.entries(botmodePlugin.MODES)) {
          modeExcludeMap[k] = v.excludeCategories;
        }
      }
    } catch (e) { console.error('[allmenu]:', e.message); }

    const excludeCategories = modeExcludeMap[botMode] || [];

    const menuCats = [];
    for (const category of sortedCategories) {
      if ((category === "owner" || category === "bot") && !m.isOwner) continue;
      if (category === "hidden") continue;
      if (excludeCategories.includes(category.toLowerCase())) continue;
      const pluginCmds = commandsByCategory[category] || [];
      const caseCmds = casesByCategory[category] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const catName = CATEGORY_NAMES[category] || category.charAt(0).toUpperCase() + category.slice(1);
      // Command + symbol akses di kanan (Ⓕ free / Ⓟ premium / Ⓞ owner / dst)
      menuCats.push({ name: catName, commands: allCmds.map((cmd) => ({ name: cmd, symbols: getCommandSymbols(cmd) })) });
    }

    const intro = aiIntro || `${getTimeGreeting()}!`; // Pengenalan AI — berubah tiap menu dimuat

    // Legend symbol akses fitur (request owner — tampil di bawah info section)
    const legend = [
      { sym: "Ⓤ", desc: "User - semua user bisa" },
      { sym: "Ⓕ", desc: "Free - ada quota gratis" },
      { sym: "Ⓟ", desc: "Premium - khusus premium" },
      { sym: "Ⓞ", desc: "Owner - hanya owner" },
      { sym: "Ⓛ", desc: "Limit - akses fitur" },
      { sym: "r", desc: "Register - wajib daftar" },
      { sym: "Ⓐ", desc: "Admin - khusus admin grup" },
      { sym: "Ⓖ", desc: "Grup - khusus di grup" },
    ];

    const txt = raraMenuLayout({
      intro,
      introTitle: "Rara",
      infoTitle: "Info",
      info,
      legend,
      categories: menuCats,
      prefix,
      readMoreBeforeCategories: true,
      footerName: botName,
      // OWNER 8 Okt 2026: gaya box per kategori — ╭─『 Nama 』 / ᯓ .cmd / ╰—༓
      categoryBoxStyle: true,
      // OWNER 8 Okt: judul info section jadi 『 *Title* 』
      infoTitleStyle: "bracket",
    });

    let finalText = txt;



    // ── Send: nativeFlowMessage buttons (proven pattern) + real image header ──
    // "Kategori" pakai single_select → klik buka popup list semua kategori
    const navButtons = buildNavButtons(m, db, prefix);
    await sendMenuCard(sock, m, {
      text: finalText,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "allmenuthumbnail.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply(raraError("Allmenu", "Ada error nih, coba lagi ya")); } catch {}
  }
}

export { pluginConfig as config, handler };
