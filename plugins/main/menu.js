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
import { novaError, novaEmpty, novaGuide, novaNoInput, toSC, closeBoxRight, novaBox, novaMenuLayout } from "../../src/lib/nova-menu-style.js";

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

    // ── Info section (compact) ──
    const info = [
      `${getTimeGreeting()}, ${m.pushName || "User"}`,
      { label: "Uptime", value: runtimeStr },
      { label: "Mode", value: (botConfig.mode || "public").toUpperCase() },
      { label: "Prefix", value: prefix },
      { label: "User", value: `${totalUsers} (${totalPremium} Premium)` },
      { label: "Grup", value: `${totalActiveGroups} / ${totalGroups}` },
      { label: "Total Fitur", value: `${totalFitur}` },
      { label: "Role", value: userRole },
      { label: "Energi", value: m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25) },
    ];

    // ── Categories ──
    const menuCats = [
      { name: "Menu", commands: ["menu", "allmenu", "allmenucategory", "tanyaai"] },
      { name: "Info", commands: ["info", "owner", "rules", "donasi"] },
      { name: "Store", commands: ["sewa", "payment", "listban"] },
    ];

    const txt = novaMenuLayout({
      infoTitle: "Info",
      info,
      categories: menuCats,
      prefix,
    });

    return txt + "\n\n" + toSC("Ketik") + " *" + prefix + "allmenu* " + toSC("untuk melihat semua fitur");
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return novaError("menu", e.message);
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
      text: text,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply(`╭─「 ${toSC("Menu")} 」\n│ ${toSC("Ada error nih")}\n│ ${toSC("Coba lagi ya")}\n╰──────────`); } catch {}
  }
}

export { pluginConfig as config, handler };
