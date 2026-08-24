// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menukategori.js — Menu per kategori (root sendMessage + preview card + type 1 buttons)
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import fs from "fs";
import path from "path";

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

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c);

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Game", rpg: "RPG",
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

let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "nova-thumbnail-menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[menukategori] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[menukategori] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

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
      return `❀°˖ ${toSC(catName)} ˖°❀

Tidak ada command di kategori ini.

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
    }

    let cmdLines = "";
    for (let i = 0; i < allCmds.length; i++) {
      const end = i === allCmds.length - 1 ? "  ╰" : "  ┊";
      const desc = allCmds[i].description ? ` — ${allCmds[i].description}` : "";
      cmdLines += `${end}  ➶ ${prefix}${allCmds[i].command}${desc}\n`;
    }

    return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${toSC(catName)}
┊
₊˚ʚ ᗢ₊˚✧ ﾟ. ${catEmoji} ${toSC(catName)} ｡ﾟ
┊${cmdLines}₊˚ʚ ᗢ₊˚✧ ﾟ.
┊
  ┊  ➶ *Total: ${allCmds.length} Fitur*
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${getTimeGreeting()} *${m.pushName || "User"}* 👋`;
  } catch (e) {
    console.error("[menukategori] buildCategoryText error:", e.message);
    return "❀°˖ Menu Kategori ˖°❀\n\nError: " + e.message + "\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
  }
}

async function sendWithButtons(sock, m, text, botConfig, catName) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const thumbBuffer = getThumb();
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const saluranLink = botConfig.saluran?.link || "";
    const footerText = `${botName} | Nova AI WhatsApp Bot`;

    const buttons = [
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}allmenu`, buttonText: { displayText: "📋 All Menu" }, type: 1 },
    ];

    try {
      await sock.sendMessage(m.chat, {
        text: text,
        footer: footerText,
        buttons: buttons,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: catName ? toSC(catName) + " Category" : "Pilih Kategori",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      console.error("[menukategori] buttons gagal, fallback:", btnErr.message);
      await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: catName ? toSC(catName) + " Category" : "Pilih Kategori",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }
  } catch (e) {
    console.error("[menukategori] sendWithButtons error:", e.message);
    await m.reply(text);
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕐");
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.slice(prefix.length).trim().split(/\s+/).slice(1) || [];
    const inputCat = args[0] || "";

    if (!inputCat) {
      const pluginCats = getCategories();
      const commandsByCategory = getCommandsByCategory();
      const caseCats = getCasesByCategory();
      const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

      let catList = "";
      for (const cat of allCatKeys.sort()) {
        if (cat === "owner" && !m.isOwner) continue;
        const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
        if (total === 0) continue;
        const name = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        const emoji = CATEGORY_EMOJIS[cat] || "📂";
        catList += `  ┊  ➶ ${emoji} ${prefix}menukategori ${cat} — ${toSC(name)} (${total})\n`;
      }

      const text = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Kᴀᴛᴇɢᴏʀɪ
┊
${catList}┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
Ketik *${prefix}menukategori <nama kategori>*`;

      await sendWithButtons(sock, m, text, botConfig, null);
      await m.react("✅");
      return;
    }

    const matchedCat = findCategory(inputCat);
    if (!matchedCat) {
      await m.reply(`❀°˖ Kategori ˖°❀\n\nKategori "${inputCat}" tidak ditemukan.\n\nKetik *${prefix}menukategori* untuk melihat daftar kategori.\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`);
      await m.react("❌");
      return;
    }

    if (matchedCat === "owner" && !m.isOwner) {
      await m.reply("❀°˖ Owner ˖°❀\n\nKategori ini khusus owner saja.\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀");
      await m.react("❌");
      return;
    }

    const text = await buildCategoryText(m, botConfig, db, matchedCat);
    const catName = CATEGORY_NAMES[matchedCat] || matchedCat;
    await sendWithButtons(sock, m, text, botConfig, catName);
    await m.react("✅");
  } catch (e) {
    console.error("[menukategori] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan kategori: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig, handler };
