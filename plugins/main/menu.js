// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (elegant, ringkas, tombol navigasi)
import { getCasesByCategory } from "../../case/nova.js";
import config from "../../config.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import path from "path";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { bracketBox } from "../../src/lib/nova-menu-style.js";

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

async function buildMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const timeStr = fmtTime("HH:mm");
    const dateStr = fmtFull("DD MMMM YYYY");

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;

    let weatherLine = "";
    try {
      const addr = await getWeatherAddress();
      if (addr) weatherLine = addr;
    } catch {}

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0;
    for (const cat of pluginCats) totalFitur += (commandsByCategory[cat] || []).length;
    for (const cat of Object.keys(caseCats)) totalFitur += (caseCats[cat] || []).length;

    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const profileBox = bracketBox("👋", "User Profile", [
      `${getTimeGreeting()}, *${m.pushName || "User"}*`,
      `Role: ${roleEmoji} ${userRole}`,
      `Energi: ${m.isOwner || m.isPremium ? "∞" : (user?.energi ?? 25)}`,
      `Limit: ${m.isOwner || m.isPremium ? "∞" : (user?.limit ?? "-")}`,
      `Level: ${userLevel} · ${expCurr.toLocaleString()}/${(expMax - expMin).toLocaleString()} XP`,
      `Waktu: ${timeStr} WIB · ${dateStr}`,
      ...(weatherLine ? [`Cuaca: ${weatherLine}`] : []),
    ]);

    const quickMenuBox = bracketBox("📋", "Quick Menu", [
      `${prefix}allmenu — semua fitur`,
      `${prefix}allmenucategory — fitur per kategori`,
      `${prefix}tanyaai — tanya AI`,
      `${prefix}owner — kontak owner`,
    ]);

    return `${profileBox}\n\n${quickMenuBox}\n\nTotal ${totalFitur} fitur · prefix [ ${prefix} ]\n${botName}`;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return `╭─「 Menu 」\n│ Error: ${e.message}\n╰─`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const navButtons = [
      { id: `${prefix}allmenu`, text: "📋 All Menu" },
      { id: `${prefix}allmenucategory`, text: "📂 Kategori" },
      { id: `${prefix}owner`, text: "👑 Owner" },
    ];

    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: botName,
    });

    await m.react("🐣");
    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
