// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (Futuristic Dashboard v4)
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
  futuristicDivider, futuristicFooter, kv, buildNavButtons,
  CATEGORY_NAMES, CATEGORY_EMOJIS,
} from "../../src/lib/nova-menu-style.js";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";

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

async function buildMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const timeStr = fmtTime("HH:mm");
    const dateStr = fmtFull("DD MMMM YYYY");
    const uptimeStr = formatUptime(uptime);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // User info
    let userRole = "Free", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;
    const expBar = progressBar(expCurr, 20000, 8);
    const expPct = Math.round((expCurr / 20000) * 100);

    // Energi bar
    const energiVal = m.isOwner || m.isPremium ? 100 : (user?.energi ?? 25);
    const energiMax = 100;
    const energiBar = m.isOwner || m.isPremium ? "▰▰▰▰▰▰▰▰ ∞" : progressBar(energiVal, energiMax, 8);

    // Limit bar
    const limitVal = m.isOwner || m.isPremium ? 100 : (user?.limit ?? 50);
    const limitBar = m.isOwner || m.isPremium ? "▰▰▰▰▰▰▰▰ ∞" : progressBar(limitVal, 100, 8);

    // Cuaca
    let weatherLine = "Cuaca tidak tersedia";
    try { const w = await getWeatherAddress(); if (w) weatherLine = w; } catch {}

    // Hitung total fitur & kategori
    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0, totalKategori = 0;
    for (const cat of pluginCats) {
      const count = (commandsByCategory[cat] || []).length;
      if (count > 0) { totalFitur += count; totalKategori++; }
    }
    for (const cat of Object.keys(caseCats)) {
      const count = caseCats[cat]?.length || 0;
      if (count > 0 && !pluginCats.includes(cat)) totalKategori++;
      totalFitur += count;
    }

    // Runtime info
    const memUsage = process.memoryUsage();
    const ramMB = Math.round(memUsage.rss / 1024 / 1024);
    const cpuUsage = process.cpuUsage();
    const cpuSec = ((cpuUsage.user + cpuUsage.system) / 1e6).toFixed(1);
    const nodeVer = process.version;

    // Build futuristic dashboard
    const header = futuristicHeader("Nova AI Logic Core");

    const greeting = `${getTimeGreeting()} *${m.pushName || "User"}* — selamat datang di sistem.`;

    const userProfile = futuristicSection("User Profile", [
      kv("Nama", m.pushName || "User"),
      kv("Status", `${roleEmoji} ${userRole}`),
      kv("Level", `${userLevel}  ${expBar}  ${expPct}%`),
      kv("Energi", energiBar),
      kv("Limit", limitBar),
      kv("Koin", `🪙 ${(user?.koin || 0).toLocaleString("id-ID")}`),
      kv("XP", `${(expCurr).toLocaleString("id-ID")} / 20.000`),
    ]);

    const systemInfo = futuristicSection("System Info", [
      kv("Status", `${statusDot("online")} Online`),
      kv("Bot", botName),
      kv("Version", botConfig.bot?.version || "v4.0.0"),
      kv("Prefix", `[ ${prefix} ]`),
      kv("Mode", botConfig.mode || "public"),
      kv("Uptime", uptimeStr),
      kv("Runtime", `Node ${nodeVer} · ${ramMB}MB RAM`),
      kv("Waktu", `${timeStr} WIB · ${dateStr}`),
    ]);

    const envInfo = futuristicSection("Lingkungan", [
      kv("Cuaca", weatherLine),
      kv("Total Fitur", `${totalFitur} tersedia`),
      kv("Kategori", `${totalKategori} aktif`),
    ]);

    const quickAccess = futuristicSection("Quick Access", [
      `${prefix}allmenu       — semua fitur`,
      `${prefix}menukategori  — per kategori`,
      `${prefix}tanyaai       — tanya AI`,
      `${prefix}owner         — kontak owner`,
    ]);

    const footer = futuristicFooter(
      `${totalFitur} fitur · ${totalKategori} kategori · ${prefix} prefix`,
      botName
    );

    return [
      header,
      "",
      greeting,
      "",
      userProfile,
      "",
      systemInfo,
      "",
      envInfo,
      "",
      quickAccess,
      "",
      footer,
    ].join("\n");
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return `◆ ◇ ◆ Error ◆ ◇ ◆\n\n┊ ${e.message}`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    const buttons = buildNavButtons(
      prefix, false, allCatKeys, commandsByCategory, caseCats, m.isOwner
    );

    await m.react("🐣");
    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons,
      title: botName,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
