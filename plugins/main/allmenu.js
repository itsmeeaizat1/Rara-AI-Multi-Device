// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua fitur (bracket box, info lengkap + cuaca + tombol)
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
import { infoBox, listBox, buildNavButtons } from "../../src/lib/nova-menu-style.js";
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

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Games", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

const CATEGORY_EMOJIS = {
  ai: "🤖", sticker: "🖼️", download: "📥", fun: "🎮",
  canvas: "🎨", tools: "🛠️", game: "🎯", rpg: "🗡️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
};

const CATEGORY_ORDER = [
  "main", "ai", "download", "sticker", "tools", "game", "rpg",
  "fun", "canvas", "media", "search", "group", "utility",
  "info", "cek", "religi", "economy", "user", "random",
  "premium", "ephoto", "jpm", "pushkontak", "panel",
  "store", "owner",
];

function formatUptime(ms) {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

async function buildAllMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const timeStr = fmtTime("HH:mm");
    const dateStr = fmtFull("DD MMMM YYYY");
    const uptimeStr = formatUptime(uptime);

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;

    let weatherLine = null;
    try { weatherLine = await getWeatherAddress(); } catch {}

    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // Info lengkap di atas (sama kayak menu, tapi lebih compact)
    const infoText = infoBox(botName, {
      intro: `${getTimeGreeting()} *${m.pushName || "User"}* 👋`,
      sections: [
        {
          heading: "User",
          lines: [
            `Nama: ${m.pushName || "User"}`,
            `Role: ${roleEmoji} ${userRole}`,
            `Level: ${userLevel} · ${expCurr.toLocaleString()}/${(expMax - expMin).toLocaleString()} XP`,
            `Koin: 🪙 ${(user?.koin || 0).toLocaleString("id-ID")}`,
          ],
        },
        {
          heading: "Bot",
          lines: [
            `Version: ${botConfig.bot?.version || "-"}`,
            `Prefix: [ ${prefix} ]`,
            `Uptime: ${uptimeStr}`,
            `Waktu: ${timeStr} WIB · ${dateStr}`,
            ...(weatherLine ? [`Cuaca: ${weatherLine}`] : []),
          ],
        },
      ],
    });

    // Daftar semua command per kategori
    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    let totalFitur = 0;
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
      const catName = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
      const catEmoji = CATEGORY_EMOJIS[cat] || "📂";

      const items = allCmds.map(cmd => `${prefix}${cmd}`);
      categorySections.push(listBox(`${catEmoji} ${catName}`, items));
    }

    return `${infoText}\n\n${categorySections.join("\n\n")}\n\nTotal ${totalFitur} fitur · prefix [ ${prefix} ]\n${botName}`;
  } catch (e) {
    console.error("[allmenu] buildAllMenuText error:", e.message);
    return `╭─「 All Menu 」\n│ Error: ${e.message}\n╰──────────────`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildAllMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // Build tombol: Kategori = single_select popup, sisanya quick_reply
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
