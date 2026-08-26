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
    const p = path.join(process.cwd(), "assets", "image", "menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenucategory] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[allmenucategory] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function handler(m, { sock, db }) {
  try {
    await m.react("🕒");
    const prefix = config.command?.prefix || ".";
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
        "ai", "sticker", "download", "fun", "canvas", "tools",
        "game", "rpg", "media", "search", "group", "main",
        "utility", "religi", "info", "cek", "economy", "user",
        "random", "premium", "ephoto", "jpm", "pushkontak",
        "panel", "owner", "store",
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

      let weatherBlock = "";
      try {
        const wf = await getWeatherFooter();
        if (wf) weatherBlock = `${wf}\n\n`;
      } catch {}

      let txt = `${weatherBlock}╭──「 *Keterangan* 」
│
│ ❏ Ⓞ = Hanya untuk owner
│ ❏ ⓟ = Hanya untuk premium
│ ❏ Ⓛ = Membutuhkan limit
│ ❏ Ⓐ = Hanya untuk admin
│ ❏ Ⓖ = Hanya di dalam grup
│ ❏ Ⓟ = Hanya di private chat
╰──────────❀
`;

      for (const cat of visibleCats) {
        const pluginCmds = commandsByCategory[cat] || [];
        const caseCmds = casesByCategory[cat] || [];
        const allCmds = [...pluginCmds, ...caseCmds];
        if (allCmds.length === 0) continue;
        const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

        txt += `├──「 *${catName}* 」\n`;
        for (let i = 0; i < allCmds.length; i++) {
          const cmd = allCmds[i];
          const symbols = getCommandSymbols(cmd);
          txt += `│ ❏ ${prefix}${cmd}${symbols}\n`;
        }
      }

      txt += `╰──────────❀\n`;

      const buttons = [
        { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
        { buttonId: `${prefix}allmenu`, buttonText: { displayText: "📋 All Menu" }, type: 1 },
        { buttonId: `${prefix}owner`, buttonText: { displayText: "👑 Owner" }, type: 1 },
      ];

      try {
        await sock.sendMessage(m.chat, {
          text: txt,
          footer: "Nova AI WhatsApp Bot",
          buttons: buttons,
          contextInfo: {
            mentionedJid: [m.sender],
            externalAdReply: {
              title: botName,
              body: "WhatsApp Multi Device",
              thumbnail: menuThumb,
              sourceUrl: config.saluran?.link || "",
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        }, { quoted: m });
      } catch (btnErr) {
        console.error("[allmenucategory] buttons gagal, fallback:", btnErr.message);
        await sock.sendMessage(m.chat, {
          text: txt,
          contextInfo: {
            mentionedJid: [m.sender],
            externalAdReply: {
              title: botName,
              body: "WhatsApp Multi Device",
              thumbnail: menuThumb,
              sourceUrl: config.saluran?.link || "",
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        }, { quoted: m });
      }

      await m.react("🐣");
      return;
    }

    // ── Mode 2: Kategori spesifik ──
    const allCategories = [...new Set([...categories, ...Object.keys(casesByCategory)])];
    const matchedCat = allCategories.find((c) => c.toLowerCase() === categoryArg);

    if (!matchedCat) {
      await m.reply(
        `╭──「 *Error* 」\n│ ❏ Kategori \`${categoryArg}\` tidak ditemukan\n│ ❏ Ketik \`${prefix}allmenucategory\` untuk list kategori\n╰──────────❀`
      );
      await m.react("❌");
      return;
    }

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply(
        `╭──「 *Akses Ditolak* 」\n│ ❏ Kategori ini hanya untuk owner\n╰──────────❀`
      );
      await m.react("❌");
      return;
    }

    const pluginCommands = commandsByCategory[matchedCat] || [];
    const caseCommands = casesByCategory[matchedCat] || [];
    const allCommands = [...pluginCommands, ...caseCommands];

    if (allCommands.length === 0) {
      await m.reply(
        `╭──「 *Kosong* 」\n│ ❏ Kategori \`${matchedCat}\` tidak ada command\n╰──────────❀`
      );
      await m.react("❌");
      return;
    }

    const catName = CATEGORY_NAMES[matchedCat] || matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);
    const totalFitur = allCommands.length;

    let weatherBlock2 = "";
    try {
      const wf2 = await getWeatherFooter();
      if (wf2) weatherBlock2 = `${wf2}\n\n`;
    } catch {}

    let txt = `${weatherBlock2}╭──「 *${catName}* 」
│
│ ❏ *Total: ${totalFitur} Fitur*
│
`;
    for (let i = 0; i < allCommands.length; i++) {
      const cmd = allCommands[i];
      const symbols = getCommandSymbols(cmd);
      txt += `│ ❏ ${prefix}${cmd}${symbols}\n`;
    }

    txt += `╰──────────❀\n`;

    const buttons2 = [
      { buttonId: `${prefix}allmenucategory`, buttonText: { displayText: "📂 Kategori Lain" }, type: 1 },
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}allmenu`, buttonText: { displayText: "📋 All Menu" }, type: 1 },
    ];

    try {
      await sock.sendMessage(m.chat, {
        text: txt,
        footer: "Nova AI WhatsApp Bot",
        buttons: buttons2,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: botName,
            body: `Kategori: ${catName}`,
            thumbnail: menuThumb,
            sourceUrl: config.saluran?.link || "",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      console.error("[allmenucategory] buttons gagal, fallback:", btnErr.message);
      await sock.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: botName,
            body: `Kategori: ${catName}`,
            thumbnail: menuThumb,
            sourceUrl: config.saluran?.link || "",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("🐣");
  } catch (e) {
    console.error("[allmenucategory] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan kategori: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
