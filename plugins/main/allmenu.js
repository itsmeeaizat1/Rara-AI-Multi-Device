// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua fitur (Futuristic Command Catalog v4)
import { getCasesByCategory } from "../../case/nova.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import path from "path";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import {
  futuristicHeader, futuristicSection, progressBar, statusDot,
  futuristicDivider, futuristicFooter, kv, futuristicCategory,
  buildNavButtons, CATEGORY_NAMES, CATEGORY_EMOJIS, CATEGORY_ORDER,
} from "../../src/lib/nova-menu-style.js";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["all", "totalmenu", "fitur", "listmenu"],
  category: "main",
  description: "Menampilkan semua fitur bot dalam satu pesan",
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

function formatUptime(ms) {
  if (!ms || ms < 0) return "0d";
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d > 0) parts.push(`${d}h`);
  if (h > 0) parts.push(`${h}j`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}d`);
  return parts.join(" ");
}

async function buildAllMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const timeStr = fmtTime("HH:mm");
    const dateStr = fmtFull("DD MMMM YYYY");
    const uptimeStr = formatUptime(uptime);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    let userRole = "Free", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expCurr = userExp - (userLevel - 1) * 20000;
    const expBar = progressBar(expCurr, 20000, 8);

    let weatherLine = "—";
    try { const w = await getWeatherAddress(); if (w) weatherLine = w; } catch {}

    // Collect all commands per category
    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    let totalFitur = 0, totalKategori = 0;
    const categorySections = [];

    for (const cat of allCatKeys.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })) {
      const pluginCmds = (commandsByCategory[cat] || []).map(c => c.command || c);
      const caseCmds = (caseCats[cat] || []).map(c => typeof c === "string" ? c : (c.command || c));
      const allCmds = [...new Set([...pluginCmds, ...caseCmds])];

      if (allCmds.length === 0) continue;
      if (cat === "owner" && !m.isOwner) continue;

      totalFitur += allCmds.length;
      totalKategori++;

      const catName = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
      const catEmoji = CATEGORY_EMOJIS[cat] || "📂";

      categorySections.push(futuristicCategory(catEmoji, catName, allCmds, prefix, 3));
    }

    const header = futuristicHeader("Command Catalog");

    const userProfile = futuristicSection("User", [
      kv("Nama", m.pushName || "User"),
      kv("Status", `${roleEmoji} ${userRole}`),
      kv("Level", `${userLevel} ${expBar}`),
    ]);

    const systemStatus = futuristicSection("System", [
      kv("Status", `${statusDot("online")} Online`),
      kv("Version", botConfig.bot?.version || "v4.0.0"),
      kv("Prefix", `[ ${prefix} ]`),
      kv("Uptime", uptimeStr),
      kv("Waktu", `${timeStr} WIB · ${dateStr}`),
      kv("Cuaca", weatherLine),
    ]);

    const footer = futuristicFooter(
      `${totalFitur} fitur · ${totalKategori} kategori · ${prefix} prefix`,
      botName
    );

    return [
      header,
      "",
      userProfile,
      "",
      systemStatus,
      "",
      ...categorySections.map((s, i) => i === 0 ? s : "\n" + s),
      "",
      footer,
    ].join("\n");
  } catch (e) {
    console.error("[allmenu] buildAllMenuText error:", e.message);
    return `◆ ◇ ◆ Error ◆ ◇ ◆\n\n┊ ${e.message}`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildAllMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    const buttons = buildNavButtons(
      prefix, true, allCatKeys, commandsByCategory, caseCats, m.isOwner
    );

    await m.react("🐣");
    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan allmenu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
