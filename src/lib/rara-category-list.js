// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * rara-category-list.js
 * Helper untuk generate isi popup "single_select" (list kategori) yang dipakai
 * tombol "Kategori" di menu.js / allmenu.js / allmenucategory.js.
 *
 * SATU sumber logic — dipakai bersama biar gak perlu file per kategori.
 * Klik row → kirim command `.allmenucategory <kategori>` yang sudah
 * ditangani oleh Mode 2 di allmenucategory.js (tidak ada file baru).
 */

import * as botmodePlugin from "../../plugins/group/botmode.js";
import { toSC } from "./rara-menu-style.js";
import { getCommandsByCategory, getCategories } from "./rara-plugins.js";
import { getCasesByCategory } from "../../case/rara.js";

const CATEGORY_NAMES = {
  ai: "AI",
  "ai image": "AI Image", sticker: "Sticker", group: "Group", anonim: "Chat Anonim & Anonymous", download: "Download",
  tools: "Tools", browser: "Browser", fun: "Fun",
  couple: "Couple", "confess menfess": "Confess & Menfess", game: "Game",
  rpg: "RPG", "rpg couple": "RPG Couple", clan: "Clan",
  search: "Search", stalker: "Stalker", anime: "Anime", jkt48: "JKT48", airich: "AI Rich",
  asupan: "Asupan", cecan: "Cecan", nsfw: "NSFW",
  convert: "Convert", maker: "Maker", ephoto: "Ephoto",
  media: "Media", tts: "TTS", quotes: "Quotes",
  education: "Education", food: "Food", primbon: "Primbon",
  info: "Info", berita: "Berita",
  cuaca: "Cuaca & Bencana", loker: "Lowongan Kerja",
  islami: "Islami", religi: "Religi",
  main: "Main", user: "User", premium: "Premium",
  "sewa premium": "Sewa & Premium", store: "Store", market: "Market",
  future: "Future", misc: "Misc", random: "Random",
  utility: "Utility", vps: "VPS", linode: "Linode",
  panel: "Panel", jpm: "JPM",
  telegram: "Telegram",
  bot: "Bot",
  owner: "Owner",
};

const CATEGORY_ORDER = [
  // URUTAN BARU (owner 10 Sep 2026) — sama dengan allmenu:
  // user dulu → ai → ai image → stiker → maker → download → group → tools → sisanya
  // → PALING AKHIR: panel, vps, main, info, owner
  // URUTAN BARU (owner 10 Sep 2026): user dulu → ai → ai image → stiker →
  // maker → download → group → tools → sisanya → PALING AKHIR admin section.
  "user", "ai", "ai agent", "ai image", "sticker", "maker", "download", "group", "anonim", "sewa premium", "tools",
  "browser", "convert", "fun", "couple", "confess menfess", "game",
  "rpg", "rpg couple", "clan",
  "search", "stalker", "anime", "jkt48", "airich", "asupan", "cecan", "nsfw",
  "media", "tts", "quotes", "primbon",
  "education", "food", "berita", "cuaca", "loker",
  "islami", "smart", "utility", "misc", "random",
  "store", "market", "jpm",
  // PALING AKHIR (revisi owner 26 Sep): main & bot sebelum owner, panel setelah owner
  "vps", "main", "info", "bot", "owner", "panel", "telegram",
];

const CATEGORY_EMOJI = {
  telegram: "✈️",
  ai: "🧠",
  "ai agent": "🤖", "smart": "✨",
  "ai image": "🎨", sticker: "🖼️", group: "👥", download: "⬇️", tools: "🛠️", browser: "🌐",
  convert: "🔄", maker: "🖌️", ephoto: "📸", anonim: "🕵️",
  fun: "🎉", couple: "💕", "confess menfess": "💌", game: "🎮", rpg: "⚔️", "rpg couple": "❤️", clan: "🛡️", turnamen: "🏆",
  search: "🔍", stalker: "🕵️", anime: "🎌", jkt48: "🌸", airich: "✨", asupan: "😍", cecan: "💃", nsfw: "🔞",
  media: "🎬", tts: "🔊", quotes: "💬", primbon: "🔮",
  education: "📚", food: "🍔", info: "ℹ️", berita: "📰",
  cuaca: "🌦️", loker: "💼",
  islami: "☪️", religi: "🕌",
  main: "🏠", user: "👤", premium: "💎", future: "🌌",
  "sewa premium": "💳", store: "🏬", market: "🛒",
  misc: "📦", random: "🎲", utility: "🧰", clean: "🧹",
  vps: "🖧", linode: "☁️", panel: "🖥️", jpm: "📡",
  bot: "🚀",
  owner: "👑",
  kerja: "💼", sekolah: "🎓", umum: "🏷️", general: "⚙️", date: "📅", primary: "⭐",
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
    md: ["panel", "store"],
    store: ["panel", "jpm", "cpanel"],
    cpanel: ["store", "jpm"],
  };
  try {
    if (botmodePlugin?.MODES) {
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(botmodePlugin.MODES)) {
        if (val.excludeCategories) modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) {
    console.error("[rara-category-list]:", e.message);
  }
  const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;

  const allCats = [...new Set([...categories, ...Object.keys(casesByCategory)])];
  const sortedCats = allCats.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  // ── REQUEST OWNER 2026-09-07: label RECOMMENDED • PALING DICARI wajib
  // muncul di popup kategori. Kalau belum ada data klik (DB baru), fallback
  // rekomendasi = 3 kategori dengan fitur terbanyak biar label tetep ada.
  if (!topCategories.length) {
    topCategories = [...sortedCats]
      .sort((a, b) => {
        const ta = (commandsByCategory[a] || []).length + (casesByCategory[a] || []).length;
        const tb = (commandsByCategory[b] || []).length + (casesByCategory[b] || []).length;
        return tb - ta;
      })
      .slice(0, 3);
  }

  const rows = [];
  for (const cat of sortedCats) {
    if ((cat === "owner" || cat === "bot") && !m?.isOwner) continue;
    if (excludeCategories.includes(cat.toLowerCase())) continue;

    const pluginCmds = commandsByCategory[cat] || [];
    const caseCmds = casesByCategory[cat] || [];
    const total = pluginCmds.length + caseCmds.length;
    if (total === 0) continue;

    const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    const emoji = CATEGORY_EMOJI[cat] || "📋";

    const rankIdx = topCategories.indexOf(cat);
    const headerLabel = rankIdx === 0 ? "🔥 Recommended • Paling Dicari"
      : rankIdx === 1 ? "🔥 Paling Dicari"
      : rankIdx === 2 ? "🔥 Populer"
      : "";
    rows.push({
      header: headerLabel,
      title: `${emoji} ${catName}`,
      description: `${total} perintah tersedia`,
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
