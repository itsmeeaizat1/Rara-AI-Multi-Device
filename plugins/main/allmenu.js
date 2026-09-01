// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command per kategori (Clara-MD box style + thumbnail menu.jpg)
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
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { buildCategoryButton } from "../../src/lib/nova-category-list.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, commandListLine, toSC, closeBoxRight, novaBox, novaMenuLayout } from "../../src/lib/nova-menu-style.js";

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
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();

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

    let userRole = "User";
    if (m.isOwner) { userRole = "Owner"; }
    else if (m.isPremium) { userRole = "Premium"; }

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `\n${wf}\n`;
    } catch {}

    const runtimeStr = formatUptime(uptime);
    const platform = process.platform;
    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt || u.isRegistered).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const totalBanned = Object.values(allUsers).filter(u => u.isBanned).length;
    const totalUnregistered = Object.values(allUsers).filter(u => u.unregisteredAt).length;
    const allGroups = db.getAllGroups();
    const totalGroups = Object.keys(allGroups).length;
    const totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;
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

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    const botName = config.bot?.name || "Nova AI Whatsapp Bot";

    // ── Info section (compact, novaMenuLayout) ──
    const info = [
      `${getTimeGreeting()}, ${m.pushName || "User"}`,
      { label: "Uptime", value: runtimeStr },
      { label: "Mode", value: (botConfig.mode || "public").toUpperCase() },
      { label: "Prefix", value: prefix },
      { label: "User", value: `${totalUsers} (${totalPremium} Premium)` },
      { label: "Grup", value: `${totalActiveGroups} / ${totalGroups}` },
      { label: "Terdaftar", value: `${totalRegistered}` },
      { label: "Diblokir", value: `${totalBanned}` },
      { label: "Total Fitur", value: `${totalFeatures}` },
      { label: "Role", value: userRole },
      { label: "Energi", value: m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25) },
    ];

    // ── Category sections ──
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

    const menuCats = [];
    for (const category of sortedCategories) {
      if (category === "owner" && !m.isOwner) continue;
      if (excludeCategories.includes(category.toLowerCase())) continue;
      const pluginCmds = commandsByCategory[category] || [];
      const caseCmds = casesByCategory[category] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const catName = CATEGORY_NAMES[category] || category.charAt(0).toUpperCase() + category.slice(1);
      menuCats.push({ name: catName, commands: allCmds });
    }

    const txt = novaMenuLayout({
      infoTitle: "Info",
      info,
      categories: menuCats,
      prefix,
    });



    // ── Send: nativeFlowMessage buttons (proven pattern) + real image header ──
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
      text: txt,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply(`╭─「 ✦ ${toSC("Menu")} ✦ 」\n│ ${toSC("Ada error nih")}\n│ ${toSC("Coba lagi ya")}\n╰────  •  ────`); } catch {}
  }
}

export { pluginConfig as config, handler };
