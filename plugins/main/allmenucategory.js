// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// allmenucategory.js — Commands per kategori (layout standar raraMenuLayout — sama kayak .menu/.allmenu)
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory } from "../../case/rara.js";
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/rara-plugins.js";
import path from "path";
import { sendMenuCard } from "../../src/lib/rara-menu-card.js";
import { buildNavButtons } from "../../src/lib/rara-menu-card.js";
import { toSC, raraMenuLayout, getAccessSymbols, raraError } from "../../src/lib/rara-menu-style.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "│ " manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import { buildMenuInfo } from "../../src/lib/rara-info-section.js";

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
  ai: "AI", airich: "AI Rich", sticker: "Sticker", download: "Download", fun: "Fun", jkt48: "JKT48", anonim: "Chat Anonim & Anonymous",
  tools: "Tools", game: "Game", html: "HTML", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info",
  berita: "Berita", cuaca: "Cuaca & Bencana", loker: "Lowongan Kerja",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", promotion: "Promotion",
  panel: "Panel", owner: "Owner", store: "Store", "sewa premium": "Sewa & Premium", bot: "Bot",
  telegram: "Telegram",
  anime: "Anime", asupan: "Asupan", clan: "Clan", convert: "Convert",
  downloader: "Downloader", education: "Education", future: "Future",
  islami: "Islami", islamic: "Islamic", menu: "Menu", maker: "Maker",
  news: "News", linode: "Linode", primbon: "Primbon", cecan: "Cecan",
  stalker: "Stalker", tts: "TTS", vps: "VPS",
};

// Legend symbol akses fitur (sama kayak .allmenu)
const LEGEND = [
  { sym: "Ⓤ", desc: "User - semua user bisa" },
  { sym: "Ⓕ", desc: "Free - ada quota gratis" },
  { sym: "Ⓟ", desc: "Premium - khusus premium" },
  { sym: "Ⓞ", desc: "Owner - hanya owner" },
  { sym: "Ⓛ", desc: "Limit - akses fitur" },
  { sym: "r", desc: "Register - wajib daftar" },
  { sym: "Ⓐ", desc: "Admin - khusus admin grup" },
  { sym: "Ⓖ", desc: "Grup - khusus di grup" },
];

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  return getAccessSymbols(plugin?.config);
}

async function handler(m, { sock, db, config: botConfig, uptime }) {
    const prefix = config.command?.prefix || ".";
  try {
    const args = m.args || [];
    // JOIN SEMUA ARGS — fix bug kategori dua kata (request owner 11 Sep:
    // popup kirim ".allmenucategory confess menfess" tapi args[0] cuma
    // "confess" → kategori gak ketemu; sama utk "ai image"/"rpg couple")
    const categoryArg = args.join(" ").trim().toLowerCase() || undefined;
    const categories = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const casesByCategory = getCasesByCategory();
    const botName = config.bot?.name || "Rara AI - Multi Device";

    // ── Mode 1: Tanpa argumen → semua kategori ──
    if (!categoryArg) {
      const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
      const botMode = groupData.botMode || "md";

      let modeExcludeMap = {
        md: ["panel", "store"],
        store: ["panel", "jpm", "ephoto", "cpanel"],
        cpanel: ["store", "jpm", "ephoto"],
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
        "ai", "sticker", "group", "anonim", "sewa premium", "download", "tools", "browser",
        // Media & Kreatif
        "convert", "maker", "ephoto", "fun", "game",
        // Game & RPG
        "rpg", "rpg couple", "clan", "turnamen",
        // Search & Info
        "search", "stalker", "anime", "asupan", "cecan", "nsfw",
        // Entertainment
        "media", "tts", "quotes", "primbon",
        // Knowledge
        "education", "food", "info", "berita", "cuaca", "loker",
        // Religion
        "islami", "religi",
        // System & User
        "main", "user", "premium", "future",
        // Store
        "store", "market",
        // Misc
        "misc", "random", "utility", "clean",
        // Admin
        "vps", "linode", "jpm", "kerja",
        "sekolah", "umum", "general", "date", "primary",
        "bot", "owner", "panel",
      ];

      const allCats = [...new Set([...categories, ...Object.keys(casesByCategory)])];
      const sortedCats = allCats.sort((a, b) => {
        const ia = categoryOrder.indexOf(a);
        const ib = categoryOrder.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

      const visibleCats = sortedCats.filter((cat) => {
        if ((cat === "owner" || cat === "bot") && !m.isOwner) return false;
        if (cat === "hidden") return false;
        if (excludeCategories.includes(cat.toLowerCase())) return false;
        const total = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
        return total > 0;
      });

      // ── Info section lengkap dari shared builder (sama kayak .menu/.allmenu) ──
      const { greeting: aiIntro, info: menuInfo } = await buildMenuInfo(m, { db, config: botConfig, uptime: uptime || process.uptime() * 1000, sock });

      // Index kategori — layout standar: baris • tanpa emoji, smallcaps
      let totalAllCmds = 0;
      const catEntries = [];
      for (const cat of visibleCats) {
        const pluginCmds = commandsByCategory[cat] || [];
        const caseCmds = casesByCategory[cat] || [];
        const total = pluginCmds.length + caseCmds.length;
        if (total === 0) continue;
        totalAllCmds += total;
        const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
        catEntries.push({ cat, catName, total });
      }

      // Section index pakai raraMenuLayout: intro AI + box info terpisah + section kategori
      const txt = raraMenuLayout({
        intro: aiIntro || "Halo!",
        introTitle: "Rara",
        info: menuInfo,
        categories: [
          {
            name: "Daftar Kategori",
            // baris kategori dipakai sebagai "command" — smallcaps di sini
            // (raraMenuLayout gak nge-smallcaps nama command, biar .cmd tetep apa adanya)
            commands: catEntries.map((e) => ({ name: `${toSC(e.catName)} — ${e.total} cmd` })),
          },
        ],
        prefix: "",
        footerName: botName,
        infoTitleStyle: "bracket",
      });

      const navButtons = buildNavButtons(m, db, prefix);
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
        boxMessage("◆ KATEGORI ◆",
          `Kategori \`${categoryArg}\` tidak ditemukan. Ketik \`${prefix}allmenucategory\` untuk daftar kategori.`)
      );
      return;
    }

    // Track klik kategori (buat badge "Viral" di popup kategori)
    try { db.incrementStat(`categoryClicks_${matchedCat}`); } catch {}

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply(
        boxMessage("◆ AKSES DITOLAK ◆", "Kategori ini hanya untuk owner.")
      );
      return;
    }

    const pluginCommands = commandsByCategory[matchedCat] || [];
    const caseCommands = casesByCategory[matchedCat] || [];
    const allCommands = [...pluginCommands, ...caseCommands];

    if (allCommands.length === 0) {
      await m.reply(
        boxMessage("◆ KOSONG ◆", `Kategori \`${matchedCat}\` tidak ada command.`)
      );
      return;
    }

    const catName = CATEGORY_NAMES[matchedCat] || matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);

    // ── Info section lengkap (sama kayak menu/allmenu) ──
    const { greeting: aiIntro, info: menuInfo } = await buildMenuInfo(m, { db, config: botConfig, uptime: uptime || process.uptime() * 1000, sock });

    // Layout standar — sama persis kayak .allmenu: intro AI + box info terpisah
    // + legend symbol + section kategori (│ ✦ .cmd symbol) + readmore
    const txt = raraMenuLayout({
      intro: aiIntro || "Halo!",
      introTitle: "Rara",
      info: menuInfo,
      legend: LEGEND,
      categories: [
        {
          name: catName,
          commands: allCommands.map((cmd) => ({ name: cmd, symbols: getCommandSymbols(cmd) })),
        },
      ],
      prefix,
      readMoreBeforeCategories: true,
        footerName: botName,
        // OWNER 8 Okt 2026: gaya box (sama kayak .allmenu)
        categoryBoxStyle: true,
      // OWNER 8 Okt: judul info section jadi 『 *Title* 』
      infoTitleStyle: "bracket",
    });

    const navButtons2 = buildNavButtons(m, db, prefix);
    await sendMenuCard(sock, m, {
      text: txt,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      buttons: navButtons2,
      title: `${botName} — ${catName}`,
    });
  } catch (e) {
    console.error("[allmenucategory] handler error:", e.message);
    try { await m.reply(raraError("Allmenucategory", "Gagal menampilkan kategori, coba lagi nanti")); } catch {}
  }
}

export { pluginConfig as config, handler };
