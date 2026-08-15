// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import { prepareWAMessageMedia } from "nova";
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
    } catch (e) {}
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

    // ── Keterangan simbol ──
    let txt = `╔┈┈「 *Keterangan* 」
╎
╎❏ Ⓞ = Hanya untuk owner
╎❏ ⓟ = Hanya untuk premium
╎❏ Ⓛ = Membutuhkan limit
╎❏ Ⓐ = Hanya untuk admin
╎❏ Ⓖ = Hanya di dalam grup
╎❏ Ⓟ = Hanya di private chat
╚┈┈┈┈┈┈┈┈┈❖
`;

    // ── List semua kategori + command ──
    for (const cat of visibleCats) {
      const pluginCmds = commandsByCategory[cat] || [];
      const caseCmds = casesByCategory[cat] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const emoji = CATEGORY_EMOJIS[cat] || "📋";

      txt += `╔┈「 ${emoji} *${cat}* 」\n`;
      for (const cmd of allCmds) {
        const symbols = getCommandSymbols(cmd);
        txt += `╎ぎ ${prefix}${cmd}${symbols}\n`;
      }
      txt += `╚┈┈┈┈┈┈┈┈┈❖\n\n`;
    }

    try {
      const media = await prepareWAMessageMedia(
        { image: fs.readFileSync(config.assets["nova"]) },
        { upload: sock.waUploadToServer },
      );
      await sock.relayMessage(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "", subtitle: "",
                hasMediaAttachment: true,
                imageMessage: media.imageMessage,
              },
              body: { text: txt },
              footer: { text: `🌸 ${config.bot?.name} | Pilih tombol dibawah` },
              contextInfo: {
                isForwarded: true,
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
      `╔┈┈「 *Error* 」\n╎\n╎❏ Kategori \`${categoryArg}\` tidak ditemukan\n╎❏ Ketik \`${prefix}menukategori\` untuk list kategori\n╚┈┈┈┈┈┈┈┈┈❖`
    );
  }

  if (matchedCat === "owner" && !m.isOwner) {
    return m.reply(
      `╔┈┈「 *Akses Ditolak* 」\n╎\n╎❏ Kategori ini hanya untuk owner\n╚┈┈┈┈┈┈┈┈┈❖`
    );
  }

  const pluginCommands = commandsByCategory[matchedCat] || [];
  const caseCommands = casesByCategory[matchedCat] || [];
  const allCommands = [...pluginCommands, ...caseCommands];

  if (allCommands.length === 0) {
    return m.reply(
      `╔┈┈「 *Kosong* 」\n╎\n╎❏ Kategori \`${matchedCat}\` tidak ada command\n╚┈┈┈┈┈┈┈┈┈❖`
    );
  }

  const emoji = CATEGORY_EMOJIS[matchedCat] || "📁";

  let txt = `╔┈「 ${emoji} *${matchedCat}* 」\n`;
  for (const cmd of allCommands) {
    const symbols = getCommandSymbols(cmd);
    txt += `╎ぎ ${prefix}${cmd}${symbols}\n`;
  }
  txt += `╚┈┈┈┈┈┈┈┈┈❖\n`;
  txt += `Total: \`${allCommands.length}\` commands`;
  if (caseCommands.length > 0) {
    txt += `\n(${pluginCommands.length} plugin + ${caseCommands.length} case)`;
  }

  try {
    const media = await prepareWAMessageMedia(
      { image: fs.readFileSync(config.assets["nova2"]) },
      { upload: sock.waUploadToServer },
    );
    await sock.relayMessage(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {},
          interactiveMessage: {
            header: {
              title: "", subtitle: "",
              hasMediaAttachment: true,
              imageMessage: media.imageMessage,
            },
            body: { text: txt },
            footer: { text: `🌸 ${config.bot?.name} | Pilih tombol dibawah` },
            contextInfo: {
              isForwarded: true,
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
