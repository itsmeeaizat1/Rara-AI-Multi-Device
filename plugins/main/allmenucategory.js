// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenucategory.js — Commands per kategori (Clara-MD box style + thumbnail menu.jpg)
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/nova-plugins.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import fs from "fs";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { buildCategoryButton, CATEGORY_EMOJI } from "../../src/lib/nova-category-list.js";
import { commandListLine, toSC } from "../../src/lib/nova-menu-style.js";
import { buildMenuInfo } from "../../src/lib/nova-info-section.js";

const pluginConfig = {
  name: "allmenucategory",
  alias: ["allmenucategory"],
  category: "main",
  description: "Menampilkan commands dalam kategori tertentu",
  usage: ".allmenucategory <kategori>",
  example: ".allmenucategory tools",
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
  canvas: "Canvas", tools: "Tools", game: "Game", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
  anime: "Anime", asupan: "Asupan", clan: "Clan", convert: "Convert",
  downloader: "Downloader", education: "Education", future: "Future",
  islami: "Islami", islamic: "Islamic", menu: "Menu", maker: "Maker",
  news: "News", linode: "Linode", primbon: "Primbon", cecan: "Cecan",
  stalker: "Stalker", tts: "TTS", vps: "VPS",
};

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";
  const symbols = [];
  if (plugin.config.isOwner) symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin) symbols.push("Ⓐ");
  if (plugin.config.isGroup) symbols.push("Ⓖ");
  if (plugin.config.isPrivate) symbols.push("Ⓟ");
  return symbols.length > 0 ? " " + symbols.join(" ") : "";
}

let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenucategory] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[allmenucategory] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function handler(m, { sock, db, config: botConfig, uptime }) {
    const prefix = config.command?.prefix || ".";
  try {
    const args = m.args || [];
    const categoryArg = args[0]?.toLowerCase();
    const categories = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const casesByCategory = getCasesByCategory();
    const menuThumb = getThumb();
    const botName = config.bot?.name || "Nova AI Whatsapp Bot";

    // ── Mode 1: Tanpa argumen → semua kategori ──
    if (!categoryArg) {
      const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
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
      } catch (e) { console.error('[allmenucategory]:', e.message); }
      const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;

      const categoryOrder = [
        // Core Bot
        "ai", "sticker", "group", "download", "tools",
        // Media & Kreatif
        "canvas", "convert", "maker", "ephoto", "fun", "game",
        // Game & RPG
        "rpg", "rpg couple", "clan", "turnamen",
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

      const allCats = [...new Set([...categories, ...Object.keys(casesByCategory)])];
      const sortedCats = allCats.sort((a, b) => {
        const ia = categoryOrder.indexOf(a);
        const ib = categoryOrder.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

      const visibleCats = sortedCats.filter((cat) => {
        if (cat === "owner" && !m.isOwner) return false;
        if (excludeCategories.includes(cat.toLowerCase())) return false;
        const total = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
        return total > 0;
      });

      // ── Info section lengkap dari shared builder ──
      const { info: menuInfo, weatherStr: weatherBlock } = await buildMenuInfo(m, { db, config: botConfig, uptime: uptime || process.uptime() * 1000 });

      // Build info section text
      let infoText = "";
      let maxLabel = 6;
      for (const item of menuInfo) {
        if (item && item.label) {
          const ll = toSC(item.label).length;
          if (ll > maxLabel) maxLabel = ll;
        }
      }
      for (const item of menuInfo) {
        if (typeof item === "string") {
          infoText += `│ ${toSC(item)}\n`;
        } else if (item && item.label !== undefined) {
          infoText += `│ • ${toSC(item.label).padEnd(maxLabel)} : ${item.value}\n`;
        }
      }

      // Compact index — cuma nama kategori + jumlah command, BUKAN dump semua command
      // (yang itu tugas allmenu, bukan allmenucategory)
      let totalAllCmds = 0;
      const catEntries = [];
      for (const cat of visibleCats) {
        const pluginCmds = commandsByCategory[cat] || [];
        const caseCmds = casesByCategory[cat] || [];
        const total = pluginCmds.length + caseCmds.length;
        if (total === 0) continue;
        totalAllCmds += total;
        const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
        const emoji = CATEGORY_EMOJI?.[cat] || "📋";
        catEntries.push({ cat, catName, emoji, total });
      }

      let txt = `╭─「 ✦ ${toSC("Info")} ✦ 」
${infoText}╰────  •  ────
╭─「 ✦ ${toSC("Daftar Kategori")} ✦ 」
│ *${toSC("Total")}:* ${catEntries.length} ${toSC("kategori")}
│ *${toSC("Total Fitur")}:* ${totalAllCmds} ${toSC("command")}
│
`;
      for (const entry of catEntries) {
        txt += `│ ${entry.emoji} \`\`${entry.catName}\`\` — ${entry.total} cmd\n`;
      }
      txt += `│\n│ Ketik \`\`${prefix}allmenucategory <nama>\`\`\n│   atau klik tombol Kategori di bawah\n╰────  •  ────\n\nNova AI WhatsApp Bot`;

      const navButtons = [
        { id: `${prefix}menu`, text: toSC("Menu") },
        { id: `${prefix}allmenu`, text: toSC("All Menu") },
        buildCategoryButton(m, db, prefix),
        { id: `${prefix}tanyaai`, text: toSC("Tanya AI") },
        { id: `${prefix}info`, text: toSC("Info") },
        { id: `${prefix}owner`, text: toSC("Owner") },
      ];
      await sendMenuCard(sock, m, {
        text: txt,
        footer: "",
        thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
        buttons: navButtons,
        title: botName,
      });

      return;
    }

    // ── Mode 2: Kategori spesifik ──
    const allCategories = [...new Set([...categories, ...Object.keys(casesByCategory)])];
    const matchedCat = allCategories.find((c) => c.toLowerCase() === categoryArg);

    if (!matchedCat) {
      await m.reply(
        `╭─「 ✦ Error ✦ 」\n│ Kategori \`${categoryArg}\` tidak ditemukan\n│ Ketik \`${prefix}allmenucategory\` untuk list kategori\n╰────  •  ────`
      );
      return;
    }

    // Track klik kategori (buat badge "Viral" di popup kategori)
    try { db.incrementStat(`categoryClicks_${matchedCat}`); } catch {}

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply(
        `╭─「 ✦ ${toSC("Akses Ditolak")} ✦ 」\n│ ${toSC("Kategori ini hanya untuk owner")}\n╰────  •  ────`
      );
      return;
    }

    const pluginCommands = commandsByCategory[matchedCat] || [];
    const caseCommands = casesByCategory[matchedCat] || [];
    const allCommands = [...pluginCommands, ...caseCommands];

    if (allCommands.length === 0) {
      await m.reply(
        `╭─「 ✦ Kosong ✦ 」\n│ Kategori \`${matchedCat}\` tidak ada command\n╰────  •  ────`
      );
      return;
    }

    const catName = CATEGORY_NAMES[matchedCat] || matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);
    const totalFitur = allCommands.length;

    // ── Info section lengkap (sama kayak menu/allmenu) ──
    const { info: menuInfo, weatherStr: weatherBlock } = await buildMenuInfo(m, { db, config: botConfig, uptime: uptime || process.uptime() * 1000 });

    let infoText = "";
    let maxLabel = 6;
    for (const item of menuInfo) {
      if (item && item.label) {
        const ll = toSC(item.label).length;
        if (ll > maxLabel) maxLabel = ll;
      }
    }
    for (const item of menuInfo) {
      if (typeof item === "string") {
        infoText += `│ ${toSC(item)}\n`;
      } else if (item && item.label !== undefined) {
        infoText += `│ • ${toSC(item.label).padEnd(maxLabel)} : ${item.value}\n`;
      }
    }

    // Compact 2-column layout — beda dari allmenu yang dump semua kategori
    const emoji = CATEGORY_EMOJI?.[matchedCat] || "📋";
    let txt = `╭─「 ✦ ${toSC("Info")} ✦ 」
${infoText}╰────  •  ────
╭─「 ✦ ${emoji} *${toSC(catName)}* ✦ 」
│ *${toSC("Total")}:* ${totalFitur} ${toSC("fitur")}
│
`;
    for (let i = 0; i < allCommands.length; i++) {
      const cmd = allCommands[i];
      const symbols = getCommandSymbols(cmd);
      const pinfo = getPlugin(cmd);
      const usage = pinfo?.config?.usage || "";
      const desc = pinfo?.config?.description || "";
      // Truncate description to keep it compact
      txt += `│ ${commandListLine(prefix, cmd, usage, symbols)}\n`;
    }

    txt += `│\n╰────  •  ────\n\n${toSC("Nova AI WhatsApp Bot")}`;

    const navButtons2 = [
      buildCategoryButton(m, db, prefix, toSC("Kategori Lain")),
      { id: `${prefix}menu`, text: toSC("Menu") },
      { id: `${prefix}allmenu`, text: toSC("All Menu") },
      { id: `${prefix}tanyaai`, text: toSC("Tanya AI") },
      { id: `${prefix}info`, text: toSC("Info") },
      { id: `${prefix}owner`, text: toSC("Owner") },
    ];
    await sendMenuCard(sock, m, {
      text: txt,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      buttons: navButtons2,
      title: `${botName} — ${catName}`,
    });
  } catch (e) {
    console.error("[allmenucategory] handler error:", e.message);
    try { await m.reply(`╭─「 ✦ ${toSC("Menu")} ✦ 」\n│ ❌ ${toSC("Gagal menampilkan kategori")}\n│ ${toSC("Coba lagi nanti")}\n╰────  •  ────`); } catch {}
  }
}

export { pluginConfig as config, handler };
