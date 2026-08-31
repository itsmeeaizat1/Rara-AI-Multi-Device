// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-category-list.js
 * Helper untuk generate isi popup "single_select" (list kategori) yang dipakai
 * tombol "📂 Kategori" di menu.js / allmenu.js / allmenucategory.js.
 *
 * SATU sumber logic — dipakai bersama biar gak perlu file per kategori.
 * Klik row → kirim command `.allmenucategory <kategori>` yang sudah
 * ditangani oleh Mode 2 di allmenucategory.js (tidak ada file baru).
 */

import * as botmodePlugin from "../../plugins/group/botmode.js";
import { toSC } from "./nova-menu-style.js";
import { getCommandsByCategory, getCategories } from "./nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", group: "Group", download: "Download",
  tools: "Tools", canvas: "Canvas", fun: "Fun", game: "Game",
  rpg: "RPG", "rpg cinta": "RPG Cinta", clan: "Clan",
  search: "Search", stalker: "Stalker", anime: "Anime",
  asupan: "Asupan", cecan: "Cecan", nsfw: "NSFW",
  convert: "Convert", maker: "Maker", ephoto: "Ephoto",
  media: "Media", tts: "TTS", quotes: "Quotes",
  education: "Education", food: "Food", primbon: "Primbon",
  info: "Info", cek: "Cek", berita: "Berita",
  islami: "Islami", religi: "Religi",
  main: "Main", user: "User", premium: "Premium",
  store: "Store", market: "Market",
  future: "Future", misc: "Misc", random: "Random",
  utility: "Utility", vps: "VPS", linode: "Linode",
  panel: "Panel", jpm: "JPM", pushkontak: "Push Kontak",
  owner: "Owner",
};

const CATEGORY_ORDER = [
  // Core Bot
  "ai", "sticker", "group", "download", "tools",
  // Media & Kreatif
  "canvas", "convert", "maker", "ephoto", "fun", "game",
  // Game & RPG
  "rpg", "rpg cinta", "clan", "turnamen",
  // Search & Info
  "search", "stalker", "anime", "asupan", "cecan", "nsfw",
  // Entertainment
  "media", "tts", "quotes", "primbon",
  // Knowledge
  "education", "food", "info", "cek", "berita",
  // Religion
  "islami", "religi",
  // System & User
  "main", "user", "premium", "future",
  // Store
  "store", "market",
  // Misc
  "misc", "random", "utility", "clean",
  // Admin
  "vps", "linode", "panel", "jpm", "pushkontak", "kerja",
  "sekolah", "umum", "general", "date", "primary",
  "owner",
];

const CATEGORY_EMOJI = {
  ai: "🤖", sticker: "🖼️", group: "👥", download: "⬇️", tools: "🛠️",
  canvas: "🎨", convert: "🔄", maker: "🖌️", ephoto: "📸",
  fun: "🎉", game: "🎮", rpg: "⚔️", "rpg cinta": "❤️", clan: "🛡️", turnamen: "🏆",
  search: "🔍", stalker: "🕵️", anime: "🎌", asupan: "😍", cecan: "💃", nsfw: "🔞",
  media: "🎬", tts: "🔊", quotes: "💬", primbon: "🔮",
  education: "📚", food: "🍔", info: "ℹ️", cek: "🔎", berita: "📰",
  islami: "☪️", religi: "🕌",
  main: "🏠", user: "👤", premium: "💎", future: "🌌",
  store: "🏬", market: "🛒",
  misc: "📦", random: "🎲", utility: "🧰", clean: "🧹",
  vps: "🖧", linode: "☁️", panel: "🖥️", jpm: "📡", pushkontak: "📲",
  owner: "👑",
  kerja: "💼", sekolah: "🎓", umum: "📂", general: "⚙️", date: "📅", primary: "⭐",
};

/**
 * Bangun array rows untuk popup single_select berisi semua kategori
 * yang punya command, dengan mode/exclude/owner filtering sama seperti
 * yang dipakai allmenucategory.js.
 *
 * @param {object} m - Message object (untuk cek m.isOwner, m.isGroup, m.chat)
 * @param {object} db - Database instance (untuk cek botMode grup)
 * @param {string} prefix - Command prefix
 * @returns {Array} rows siap dipakai di sections
 */
function buildCategoryRows(m, db, prefix = ".") {
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();

  // Ranking kategori berdasarkan klik (buat badge label)
  let topCategories = [];
  try {
    if (db) {
      const allStats = db.getStats() || {};
      const clickEntries = [];
      for (const [key, val] of Object.entries(allStats)) {
        if (key.startsWith("categoryClicks_") && val > 0) {
          clickEntries.push({ cat: key.replace("categoryClicks_", ""), clicks: val });
        }
      }
      clickEntries.sort((a, b) => b.clicks - a.clicks);
      topCategories = clickEntries.slice(0, 3).map(e => e.cat);
    }
  } catch {}

  const groupData = m?.isGroup && db ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";

  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    store: ["panel", "pushkontak", "jpm", "ephoto", "cpanel"],
    pushkontak: ["panel", "store", "jpm", "ephoto", "cpanel"],
    cpanel: ["pushkontak", "store", "jpm", "ephoto"],
  };
  try {
    if (botmodePlugin?.MODES) {
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(botmodePlugin.MODES)) {
        if (val.excludeCategories) modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) {
    console.error("[nova-category-list]:", e.message);
  }
  const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;

  const allCats = [...new Set([...categories, ...Object.keys(casesByCategory)])];
  const sortedCats = allCats.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const rows = [];
  for (const cat of sortedCats) {
    if (cat === "owner" && !m?.isOwner) continue;
    if (excludeCategories.includes(cat.toLowerCase())) continue;

    const pluginCmds = commandsByCategory[cat] || [];
    const caseCmds = casesByCategory[cat] || [];
    const total = pluginCmds.length + caseCmds.length;
    if (total === 0) continue;

    const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    const emoji = CATEGORY_EMOJI[cat] || "📋";

    const rankIdx = topCategories.indexOf(cat);
    const headerLabel = rankIdx === 0 ? "🔥 Paling sering digunakan"
      : rankIdx === 1 ? "🔥 Sering digunakan"
      : rankIdx === 2 ? "🔥 Populer"
      : "";
    rows.push({
      header: headerLabel,
      title: `${emoji} ${catName}`,
      description: `${total} command tersedia`,
      id: `${prefix}allmenucategory ${cat}`,
    });
  }

  return rows;
}

/**
 * Bangun tombol single_select siap pakai untuk array `buttons` di sendMenuCard.
 *
 * @param {object} m
 * @param {object} db
 * @param {string} prefix
 * @returns {object} { type: "single_select", text, title, sections }
 */
function buildCategoryButton(m, db, prefix = ".", label = toSC("Kategori")) {
  const rows = buildCategoryRows(m, db, prefix);
  return {
    type: "single_select",
    text: label,
    title: toSC("Pilih Kategori"),
    sections: [
      {
        title: `${toSC("Semua Kategori")} (${rows.length})`,
        rows,
      },
    ],
  };
}

export { buildCategoryRows, buildCategoryButton, CATEGORY_NAMES, CATEGORY_EMOJI };
