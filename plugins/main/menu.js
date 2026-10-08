// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (Rara box style + type 1 buttons + thumbnail menu.jpg)
import { getCaseCount, getCasesByCategory } from "../../case/rara.js";
import config from "../../config.js";
import {
  getImportantDay,
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/rara-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/rara-time.js";
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
import { raraError, raraEmpty, raraGuide, raraNoInput, toSC, closeBoxRight, raraBox, raraMenuLayout, getAccessSymbols } from "../../src/lib/rara-menu-style.js";
import { buildMenuInfo } from "../../src/lib/rara-info-section.js";

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

// Thumbnail: menu/menuthumbnail.jpg — cached once
let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
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
    const runtimeStr = formatUptime(uptime);
    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.isRegistered).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const allGroups = db.getAllGroups();
    let totalGroups = Object.keys(allGroups).length;
    let totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;
    // live count grup (request owner 13 Sep) — registry bisa kosong
    try {
      const { countGroupsLive } = await import("../../src/lib/rara-group-registry.js");
      const live = await countGroupsLive(sock, db);
      if (live > 0) { totalGroups = live; totalActiveGroups = live; }
    } catch {}


    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0;
    for (const cat of pluginCats) totalFitur += (commandsByCategory[cat] || []).length;
    for (const cat of Object.keys(caseCats)) totalFitur += (caseCats[cat] || []).length;

    let userRole = "User";
    if (m.isOwner) userRole = "Owner";
    else if (m.isPremium) userRole = "Premium";

    // ── Info section lengkap (user, bot, database, server, weather) ──
    const { greeting: aiIntro, info: menuInfo, weatherStr } = await buildMenuInfo(m, { db, config: botConfig, uptime, sock });
    const info = menuInfo;

    // ── Categories ──
    // Command + symbol akses di kanan (Ⓕ free / Ⓟ premium / Ⓞ owner / dst)
    const sym = (cmd) => getAccessSymbols(getPlugin(cmd)?.config);
    const menuCats = [
      { name: "Menu", commands: ["menu", "allmenu", "allmenucategory", "tanyaai"].map((cmd) => ({ name: cmd, symbols: sym(cmd) })) },
      { name: "Info", commands: ["info", "owner", "rules", "donasi"].map((cmd) => ({ name: cmd, symbols: sym(cmd) })) },
      { name: "Store", commands: ["sewa", "buyprem"].map((cmd) => ({ name: cmd, symbols: sym(cmd) })) },
    ];

    const intro = aiIntro || `${getTimeGreeting()}!`; // Pengenalan AI — berubah tiap menu dimuat

    const txt = raraMenuLayout({
      intro,
      introTitle: "Rara",
      infoTitle: "Info",
      info,
      categories: menuCats,
      prefix,
      footerName: botConfig?.bot?.name || "Rara AI - Multi Device",
      // OWNER 8 Okt 2026: gaya kotak kategori (sama kayak .allmenu)
      categoryBoxStyle: true,
      // OWNER 8 Okt: judul info section jadi 『 *Title* 』
      infoTitleStyle: "bracket",
    });

    let result = txt;
    result += "\n\n" + toSC("Ketik") + " *" + prefix + "allmenu* " + toSC("untuk melihat semua fitur");
    return result;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return raraError("menu", e.message);
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Rara AI - Multi Device";

    // 6 tombol quick access — nativeFlowMessage (proven pattern, bukan legacy type 1)
    // "Kategori" pakai single_select → klik buka popup list semua kategori
    const navButtons = buildNavButtons(m, db, prefix);
    await sendMenuCard(sock, m, {
      text: text,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply(raraError("Menu", "Ada error nih, coba lagi ya")); } catch {}
  }
}

export { pluginConfig as config, handler };
