// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/nova-plugins.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fs from "fs";
import sharp from "sharp";
import { getMenuImage, getMenuThumbnail, syncMenuImageFromDb } from "../../src/lib/nova-asset-manager.js";
import { getWeatherAddress, getWeatherFooter } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "menukategori",
  alias: ["mk", "kategori", "kat"],
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

const CATEGORY_EMOJIS = {
  owner: "👑", main: "🏠", utility: "🔧", fun: "🎮", group: "👥",
  download: "📥", search: "🔍", tools: "🛠️", sticker: "🖼️", ai: "🤖",
  game: "🎯", rpg: "🗡️", media: "🎬", info: "ℹ️", religi: "☪️",
  panel: "🖥️", user: "📊", jpm: "📢", pushkontak: "📱", ephoto: "🎨",
  store: "🛒", linode: "☁️", random: "🎲", canvas: "🎨", vps: "🌊",
  premium: "💎", convert: "🔄", economy: "💰", cek: "📋",
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

async function handler(m, { sock, db }) {
  await m.react("🕐");
  syncMenuImageFromDb(db);
  const prefix = config.command?.prefix || ".";
  const args = m.args || [];
  const categoryArg = args[0]?.toLowerCase();
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();
  const greeting = getTimeGreeting();

  // ── Mode 1: Tanpa argumen → tampilkan semua kategori ──
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
    } catch (e) { console.error('[menukategori.js]:', e.message); }
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

    const _weatherFooter = await getWeatherFooter().catch(() => null);
    const _weatherBlock = _weatherFooter ? `${_weatherFooter}\n\n` : "";
    // ── Keterangan simbol ──
    let txt = `${_weatherBlock}❀°˖✧◝(⁰▿⁰)◜✧˖°❀ MENU KATEGORI

  ° ✿ Keterangan ✿ °
  ┊  ➶ Ⓞ = Hanya untuk owner
  ┊  ➶ ⓟ = Hanya untuk premium
  ┊  ➶ Ⓛ = Membutuhkan limit
  ┊  ➶ Ⓐ = Hanya untuk admin
  ┊  ➶ Ⓖ = Hanya di dalam grup
  ┊  ╰➶ Ⓟ = Hanya di private chat

`;

    // ── List semua kategori + command ──
    for (const cat of visibleCats) {
      const pluginCmds = commandsByCategory[cat] || [];
      const caseCmds = casesByCategory[cat] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const catName = CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

      txt += `  ° ✿ ${catName} ✿ °\n`;
      for (let i = 0; i < allCmds.length; i++) {
        const cmd = allCmds[i];
        const symbols = getCommandSymbols(cmd);
        const isLast = i === allCmds.length - 1;
        txt += `  ┊  ${isLast ? '╰' : ''}➶ ${prefix}${cmd}${symbols}\n`;
      }
      txt += `\n`;
    }

    txt += `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n`;

    try {
      const thumbCat1 = await getMenuThumbnail("nova");
      await sock.relayMessage(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "", subtitle: "",
                hasMediaAttachment: true,
                locationMessage: {
                  degreesLatitude: 0, degreesLongitude: 0,
                  name: config.bot?.name || "Nova-AI",
                  address: `v${config.bot?.version || "1.0.0"}`,
                  jpegThumbnail: thumbCat1,
                },
              },
              body: { text: txt },
              footer: { text: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀" },
              contextInfo: {
                isForwarded: false,
                forwardingScore: 9,
                participant: "0@s.whatsapp.net",
                quotedMessage: { conversation: `${config.bot?.name}` },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({
                  limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 },
                }),
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                ],
              },
            },
          },
        },
      }, {});
    } catch {
      await m.reply(claraWrap("menukategori", txt));
    }
    await m.react("✅");
    return;
  }

  // ── Mode 2: Dengan argumen → tampilkan kategori spesifik ──
  const allCategories = [...new Set([...categories, ...Object.keys(casesByCategory)])];
  const matchedCat = allCategories.find((c) => c.toLowerCase() === categoryArg);

  if (!matchedCat) {
    return m.reply(
      `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ERROR\n\n  ┊  ╰➶ Kategori \`${categoryArg}\` tidak ditemukan\n  ┊  ╰➶ Ketik \`${prefix}menukategori\` untuk list kategori`
    );
  }

  if (matchedCat === "owner" && !m.isOwner) {
    return m.reply(
      `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ AKSES DITOLAK\n\n  ┊  ╰➶ Kategori ini hanya untuk owner`
    );
  }

  const pluginCommands = commandsByCategory[matchedCat] || [];
  const caseCommands = casesByCategory[matchedCat] || [];
  const allCommands = [...pluginCommands, ...caseCommands];

  if (allCommands.length === 0) {
    return m.reply(
      `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ KOSONG\n\n  ┊  ╰➶ Kategori \`${matchedCat}\` tidak ada command`
    );
  }

  const catName = CATEGORY_NAMES[matchedCat] || matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);

  const _weatherFooter2 = await getWeatherFooter().catch(() => null);
  const _weatherBlock2 = _weatherFooter2 ? `${_weatherFooter2}\n\n` : "";
  let txt = `${_weatherBlock2}❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${catName.toUpperCase()}\n\n`;
  txt += `  ° ✿ ${catName} ✿ °\n`;
  for (let i = 0; i < allCommands.length; i++) {
    const cmd = allCommands[i];
    const symbols = getCommandSymbols(cmd);
    const isLast = i === allCommands.length - 1;
    txt += `  ┊  ${isLast ? '╰' : ''}➶ ${prefix}${cmd}${symbols}\n`;
  }
  txt += `\n`;
  txt += `Total: \`${allCommands.length}\` commands`;
  if (caseCommands.length > 0) {
    txt += `\n(${pluginCommands.length} plugin + ${caseCommands.length} case)`;
  }
  txt += `\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;

  try {
    const thumbCat2 = await getMenuThumbnail("nova");
    await sock.relayMessage(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {},
          interactiveMessage: {
            header: {
              title: "", subtitle: "",
              hasMediaAttachment: true,
              locationMessage: {
                degreesLatitude: 0, degreesLongitude: 0,
                name: config.bot?.name || "Nova-AI",
                address: `v${config.bot?.version || "1.0.0"}`,
                jpegThumbnail: thumbCat2,
              },
            },
            body: { text: txt },
            footer: { text: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀" },
            contextInfo: {
              isForwarded: false,
              forwardingScore: 9,
              participant: "0@s.whatsapp.net",
              quotedMessage: { conversation: `${config.bot?.name}` },
              mentionedJid: [m.sender],
            },
            nativeFlowMessage: {
              messageParamsJson: JSON.stringify({
                limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 },
              }),
              buttons: [
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori Lain", id: `${prefix}menukategori` }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
              ],
            },
          },
        },
      },
    }, {});
  } catch {
    await m.reply(claraWrap("menukategori", txt));
  }
  await m.react("✅");
}

export default { config: pluginConfig, handler };
