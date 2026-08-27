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
import { getCommandsByCategory, getCategories } from "./nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", rpg: "RPG", "rpg cinta": "RPG Cinta",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
  anime: "Anime", asupan: "Asupan", clan: "Clan", convert: "Convert",
  downloader: "Downloader", education: "Education", food: "Food",
  future: "Future", islami: "Islami", islamic: "Islamic", menu: "Menu",
  maker: "Maker", news: "News", nsfw: "NSFW", linode: "Linode",
  primbon: "Primbon", cecan: "Cecan", stalker: "Stalker", tts: "TTS",
  vps: "VPS",
};

const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "rpg", "rpg cinta", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

const CATEGORY_EMOJI = {
  ai: "🤖", sticker: "🖼️", download: "⬇️", fun: "🎉",
  canvas: "🎨", tools: "🛠️", rpg: "🎮", "rpg cinta": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🧰", religi: "🕌", info: "ℹ️", cek: "🔎",
  economy: "💰", user: "👤", random: "🎲", premium: "💎",
  ephoto: "📸", jpm: "📦", pushkontak: "📲",
  panel: "🖥️", owner: "👑", store: "🏬",
  anime: "🎌", asupan: "😍", clan: "🛡️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍔",
  future: "🌌", islami: "☪️", islamic: "🕋", menu: "📋",
  maker: "🖌️", news: "📰", nsfw: "🔞", linode: "☁️",
  primbon: "🔮", cecan: "💃", stalker: "🕵️", tts: "🔊",
  vps: "🖧",
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
function buildCategoryButton(m, db, prefix = ".", label = "Kategori") {
  const rows = buildCategoryRows(m, db, prefix);
  return {
    type: "single_select",
    text: label,
    title: "Pilih Kategori",
    sections: [
      {
        title: `Semua Kategori (${rows.length})`,
        rows,
      },
    ],
  };
}

export { buildCategoryRows, buildCategoryButton, CATEGORY_NAMES, CATEGORY_EMOJI };
