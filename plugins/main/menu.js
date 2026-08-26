// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (bracket box, info lengkap + cuaca + tombol)
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
    const uptimeStr = formatUptime(uptime);

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    // Hitung level/XP
    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;

    // Cuaca (1-line compact)
    let weatherLine = null;
    try {
      weatherLine = await getWeatherAddress();
    } catch {}

    // Hitung total fitur
    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0;
    for (const cat of pluginCats) totalFitur += (commandsByCategory[cat] || []).length;
    for (const cat of Object.keys(caseCats)) totalFitur += (caseCats[cat] || []).length;

    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // Info lengkap: User + Bot + Cuaca
    const infoText = infoBox(botName, {
      intro: `${getTimeGreeting()} *${m.pushName || "User"}* 👋`,
      sections: [
        {
          heading: "User",
          lines: [
            `Nama: ${m.pushName || "User"}`,
            `Nomor: @${m.sender.split("@")[0]}`,
            `Role: ${roleEmoji} ${userRole}`,
            `Premium: ${m.isPremium ? "Aktif" : "Free"}`,
            `Energi: ${m.isOwner || m.isPremium ? "∞" : (user?.energi ?? 25)}`,
            `Limit: ${m.isOwner || m.isPremium ? "∞" : (user?.limit ?? "-")}`,
            `Koin: 🪙 ${(user?.koin || 0).toLocaleString("id-ID")}`,
            `Level: ${userLevel} · ${expCurr.toLocaleString()}/${(expMax - expMin).toLocaleString()} XP`,
          ],
        },
        {
          heading: "Bot",
          lines: [
            `Nama: ${botName}`,
            `Version: ${botConfig.bot?.version || "-"}`,
            `Prefix: [ ${prefix} ]`,
            `Mode: ${botConfig.mode || "public"}`,
            `Uptime: ${uptimeStr}`,
            `Waktu: ${timeStr} WIB · ${dateStr}`,
          ],
        },
        {
          heading: "Cuaca",
          lines: weatherLine
            ? [weatherLine]
            : ["Cuaca tidak tersedia"],
        },
      ],
    });

    // Quick menu
    const quickMenuText = listBox("Quick Menu", [
      `${prefix}allmenu — semua fitur`,
      `${prefix}allmenucategory — fitur per kategori`,
      `${prefix}tanyaai — tanya AI`,
      `${prefix}owner — kontak owner`,
    ]);

    return `${infoText}\n\n${quickMenuText}\n\nTotal ${totalFitur} fitur · prefix [ ${prefix} ]\n${botName}`;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return `╭─「 Menu 」\n│ Error: ${e.message}\n╰──────────────`;
  }
}

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

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    // Build tombol: Kategori = single_select popup, sisanya quick_reply
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
