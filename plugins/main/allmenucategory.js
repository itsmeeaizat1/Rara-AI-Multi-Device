// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenucategory.js — Menu per kategori (elegant, style ◈ untuk list command)
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import path from "path";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { listBox } from "../../src/lib/nova-menu-style.js";

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

async function buildCategoryText(m, botConfig, db, category) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const catName = CATEGORY_NAMES[category] || (category.charAt(0).toUpperCase() + category.slice(1));
    const catEmoji = CATEGORY_EMOJIS[category] || "📂";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

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

    if (allCmds.length === 0) {
      return `${listBox(`${catEmoji} ${catName}`, ["Tidak ada command di kategori ini"])}\n\n${botName}`;
    }

    const items = allCmds.map((c) => `${prefix}${c.command}${c.description ? ` — ${c.description}` : ""}`);

    return `${listBox(`${catEmoji} ${catName}`, items)}\n\nTotal ${allCmds.length} fitur\n${botName}`;
  } catch (e) {
    console.error("[menukategori] buildCategoryText error:", e.message);
    return `╭─「 Menu Kategori 」\n│ Error: ${e.message}\n╰──────────────`;
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

    if (!inputCat) {
      const pluginCats = getCategories();
      const commandsByCategory = getCommandsByCategory();
      const caseCats = getCasesByCategory();
      const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

      const rows = [];
      for (const cat of allCatKeys.sort()) {
        if (cat === "owner" && !m.isOwner) continue;
        const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
        if (total === 0) continue;
        const name = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        const emoji = CATEGORY_EMOJIS[cat] || "📂";
        rows.push(`${emoji} ${prefix}menukategori ${cat} — ${name} (${total})`);
      }

      const text = `${listBox("Kategori", rows)}\n\nTotal ${rows.length} kategori · ketik *${prefix}menukategori <nama>*\n${botName}`;

      const navButtons = [
        { id: `${prefix}menu`, text: "🏠 Menu" },
        { id: `${prefix}allmenu`, text: "📋 All Menu" },
        { id: `${prefix}owner`, text: "👑 Owner" },
      ];

      await m.react("🐣");
      await sendMenuCard(sock, m, {
        text,
        footer: botName,
        thumbnailPath,
        buttons: navButtons,
        title: "Menu Kategori",
      });

      try { await sendMenuAudio(sock, m, db, false); } catch {}
      return;
    }

    const matchedCat = findCategory(inputCat);
    if (!matchedCat) {
      await m.reply(`${listBox("Kategori", [`Kategori "${inputCat}" tidak ditemukan`])}\n\nKetik *${prefix}menukategori* untuk daftar kategori`);
      await m.react("❌");
      return;
    }

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply(listBox("👑 Owner", ["Kategori ini khusus owner"]));
      await m.react("❌");
      return;
    }

    const text = await buildCategoryText(m, botConfig, db, matchedCat);
    const catName = CATEGORY_NAMES[matchedCat] || matchedCat;
    const catEmoji = CATEGORY_EMOJIS[matchedCat] || "📂";

    const navButtons = [
      { id: `${prefix}menu`, text: "🏠 Menu" },
      { id: `${prefix}allmenu`, text: "📋 All Menu" },
      { id: `${prefix}allmenucategory`, text: "📂 Kategori" },
    ];

    await m.react("🐣");
    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath,
      buttons: navButtons,
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
