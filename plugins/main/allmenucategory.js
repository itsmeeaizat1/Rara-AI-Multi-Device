// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenucategory.js — Menu per kategori (Indo Dev Bot Style v5)
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import path from "path";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import {
  botHeader, botSignature, sectionBox, progressBar, statusDot,
  kv, categoryBox, buildNavButtons,
  CATEGORY_NAMES, CATEGORY_EMOJIS, CATEGORY_ORDER,
} from "../../src/lib/nova-menu-style.js";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "allmenucategory",
  alias: ["menukategori", "mk", "kategori", "kat"],
  category: "main",
  description: "Menampilkan commands dalam kategori tertentu",
  usage: ".menukategori <kategori>",
  example: ".menukategori tools",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function findCategory(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (CATEGORY_NAMES[lower]) return lower;
  for (const [key, name] of Object.entries(CATEGORY_NAMES)) {
    if (name.toLowerCase() === lower) return key;
  }
  for (const [key, name] of Object.entries(CATEGORY_NAMES)) {
    if (key.includes(lower) || name.toLowerCase().includes(lower)) return key;
  }
  return null;
}

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

async function buildCategoryText(m, botConfig, db, uptime, category) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const catName = CATEGORY_NAMES[category] || (category.charAt(0).toUpperCase() + category.slice(1));
    const catEmoji = CATEGORY_EMOJIS[category] || "📂";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const user = db.getUser(m.sender);
    let userRole = "Free", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expCurr = userExp - (userLevel - 1) * 20000;
    const expBar = progressBar(expCurr, 20000, 8);

    // Collect commands
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const pluginCmds = (commandsByCategory[category] || []).map(c => ({
      command: c.command || c, description: c.description || "",
    }));
    const caseCmds = (caseCats[category] || []).map(c => {
      if (typeof c === "string") return { command: c, description: "" };
      return { command: c.command || c, description: c.description || "" };
    });

    const seen = new Set();
    const allCmds = [];
    for (const cmd of [...pluginCmds, ...caseCmds]) {
      if (!seen.has(cmd.command)) { seen.add(cmd.command); allCmds.push(cmd); }
    }

    const parts = [];

    parts.push(botHeader(botName));
    parts.push(`│`);
    parts.push(`┊ ${catEmoji} *${catName}* — ${getTimeGreeting()} ${m.pushName || "User"} 👋`);
    parts.push(`│`);

    // User info
    parts.push(sectionBox("👤", "Info User", [
      kv("Nama", m.pushName || "User"),
      kv("Status", `${roleEmoji} ${userRole}`),
      kv("Level", `${userLevel} ${expBar}`),
      kv("Prefix", `[ ${prefix} ]`),
    ]));

    parts.push("");

    if (allCmds.length === 0) {
      parts.push(sectionBox(catEmoji, catName, [
        "Tidak ada command di kategori ini",
      ]));
    } else {
      // Command list with descriptions
      const cmdLines = allCmds.map((c, i) => {
        const num = String(i + 1).padStart(2, "0");
        const desc = c.description ? ` — ${c.description}` : "";
        return `${num}. ${prefix}${c.command}${desc}`;
      });

      parts.push(sectionBox(catEmoji, `${catName} (${allCmds.length})`, cmdLines));
    }

    parts.push("");
    parts.push(`❀°˖✧ ${allCmds.length} fitur ✧˖°❀`);
    parts.push(botSignature(botName));

    return parts.join("\n");
  } catch (e) {
    console.error("[menukategori] buildCategoryText error:", e.message);
    return `╭─「 *Error* 」\n│ ❏ ${e.message}\n╰──────────`;
  }
}

async function buildCategoryListText(m, botConfig, db, uptime) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const user = db.getUser(m.sender);

    let userRole = "Free", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expCurr = userExp - (userLevel - 1) * 20000;
    const expBar = progressBar(expCurr, 20000, 8);

    const timeStr = fmtTime("HH:mm");
    const uptimeStr = formatUptime(uptime);

    let weatherLine = "—";
    try { const w = await getWeatherAddress(); if (w) weatherLine = w; } catch {}

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    let totalFitur = 0, totalKategori = 0;
    const catEntries = [];

    for (const cat of allCatKeys.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })) {
      if (cat === "owner" && !m.isOwner) continue;
      const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
      if (total === 0) continue;

      const name = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
      const emoji = CATEGORY_EMOJIS[cat] || "📂";
      catEntries.push(`${emoji}  ${prefix}menukategori ${cat.padEnd(12)} — ${name} (${total})`);
      totalFitur += total;
      totalKategori++;
    }

    const parts = [];

    parts.push(botHeader(botName));
    parts.push(`│`);
    parts.push(`┊ ${getTimeGreeting()} *${m.pushName || "User"}* 👋`);
    parts.push(`│`);

    parts.push(sectionBox("👤", "Info User", [
      kv("Nama", m.pushName || "User"),
      kv("Status", `${roleEmoji} ${userRole}`),
      kv("Level", `${userLevel} ${expBar}`),
    ]));

    parts.push("");

    parts.push(sectionBox("🤖", "Info Bot", [
      kv("Status", `${statusDot("online")} Online`),
      kv("Prefix", `[ ${prefix} ]`),
      kv("Uptime", uptimeStr),
      kv("Waktu", `${timeStr} WIB`),
      kv("Cuaca", weatherLine),
    ]));

    parts.push("");

    parts.push(sectionBox("📂", `Kategori (${totalKategori})`, catEntries));

    parts.push("");
    parts.push(`❀°˖✧ ${totalFitur} fitur · ${totalKategori} kategori ✧˖°❀`);
    parts.push(botSignature(botName));

    return parts.join("\n");
  } catch (e) {
    console.error("[menukategori] buildCategoryListText error:", e.message);
    return `╭─「 *Error* 」\n│ ❏ ${e.message}\n╰──────────`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.slice(prefix.length).trim().split(/\s+/).slice(1) || [];
    const inputCat = args[0] || "";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const thumbnailPath = path.join(process.cwd(), "assets", "image", "menu.jpg");

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    if (!inputCat) {
      const text = await buildCategoryListText(m, botConfig, db, uptime);
      const buttons = buildNavButtons(
        prefix, false, allCatKeys, commandsByCategory, caseCats, m.isOwner
      );

      await m.react("🐣");
      await sendMenuCard(sock, m, {
        text,
        footer: botName,
        thumbnailPath,
        buttons,
        title: "Menu Kategori",
      });

      try { await sendMenuAudio(sock, m, db, false); } catch {}
      return;
    }

    const matchedCat = findCategory(inputCat);
    if (!matchedCat) {
      await m.reply(`╭─「 *Tidak Ditemukan* 」\n│ ❏ Kategori "${inputCat}" tidak ada\n│ ❏ Ketik *${prefix}menukategori* untuk daftar\n╰──────────`);
      await m.react("❌");
      return;
    }

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply(`╭─「 *Akses Ditolak* 」\n│ ❏ Kategori ini khusus Owner 👑\n╰──────────`);
      await m.react("❌");
      return;
    }

    const text = await buildCategoryText(m, botConfig, db, uptime, matchedCat);
    const catName = CATEGORY_NAMES[matchedCat] || matchedCat;
    const catEmoji = CATEGORY_EMOJIS[matchedCat] || "📂";

    const buttons = buildNavButtons(
      prefix, false, allCatKeys, commandsByCategory, caseCats, m.isOwner
    );

    await m.react("🐣");
    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath,
      buttons,
      title: `${catEmoji} ${catName}`,
    });

    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menukategori] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan kategori: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
