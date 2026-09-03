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
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { buildCategoryButton } from "../../src/lib/nova-category-list.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, toSC, closeBoxRight, novaBox, novaMenuLayout } from "../../src/lib/nova-menu-style.js";
import { buildMenuInfo } from "../../src/lib/nova-info-section.js";

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
    const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt || u.isRegistered).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const allGroups = db.getAllGroups();
    const totalGroups = Object.keys(allGroups).length;
    const totalActiveGroups = Object.values(allGroups).filter(g => g.isLeft !== true && g.isBanned !== true).length;

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
    const { greeting: aiIntro, info: menuInfo, weatherStr } = await buildMenuInfo(m, { db, config: botConfig, uptime });
    const info = menuInfo;

    // ── Categories ──
    const menuCats = [
      { name: "Menu", commands: ["menu", "allmenu", "allmenucategory", "tanyaai"] },
      { name: "Info", commands: ["info", "owner", "rules", "donasi"] },
      { name: "Store", commands: ["sewa", "buyprem"] },
    ];

    const intro = aiIntro || `${getTimeGreeting()}!`; // Pengenalan AI — berubah tiap menu dimuat

    const txt = novaMenuLayout({
      intro,
      introTitle: "Nova",
      infoTitle: "Info",
      info,
      categories: menuCats,
      prefix,
    });

    let result = txt;
    result += "\n\n" + toSC("Ketik") + " *" + prefix + "allmenu* " + toSC("untuk melihat semua fitur");
    return result;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return novaError("menu", e.message);
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
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
      text: text,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply(`╭─「 ✦ ${toSC("Menu")} ✦ 」\n│ ${toSC("Ada error nih")}\n│ ${toSC("Coba lagi ya")}\n╰────  •  ────`); } catch {}
  }
}

export { pluginConfig as config, handler };
