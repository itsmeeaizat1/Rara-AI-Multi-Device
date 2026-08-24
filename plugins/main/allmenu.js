// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command lengkap per kategori (rebuild: raw buffer thumbnail + buttons)
import config from "../../config.js";
import {
  getTimeGreeting,
  formatUptime,
  getImportantDay,
} from "../../src/lib/nova-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPluginCount,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import fs from "fs";
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["allmenu", "menuall", "fullmenu"],
  category: "main",
  description: "Menampilkan semua command lengkap per kategori",
  usage: ".allmenu",
  example: ".allmenu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 0,
  isEnabled: true,
};

// ── Small caps helper ──
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c);

// ── Category ordering ──
const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "game", "rpg", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

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

// ── Load thumbnail raw buffer (NO sharp) ──
let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "nova-thumbnail-allmenu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenu] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) {
    console.error("[allmenu] ❌ Thumbnail load failed:", e.message);
  }
  return _thumbCache;
}

// ── Build allmenu text ──
async function buildAllMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const totalUsers = db.getUserCount();
    const runtimeStr = formatUptime(uptime);
    const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(now);
    const dateStr = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);

    // Weather
    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `${wf}\n`;
    } catch {}

    // Get all commands by category
    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];

    let totalFitur = 0;
    let categoryBlocks = "";

    for (const cat of allCatKeys.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })) {
      const pluginCmds = (commandsByCategory[cat] || []).map(c => c.command || c);
      const caseCmds = (caseCats[cat] || []).map(c => typeof c === "string" ? c : (c.command || c));
      const allCmds = [...new Set([...pluginCmds, ...caseCmds])];

      if (allCmds.length === 0) continue;
      if (cat === "owner" && !m.isOwner) continue;

      totalFitur += allCmds.length;
      const catName = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
      const catEmoji = CATEGORY_EMOJIS[cat] || "📂";

      let cmdLines = "";
      for (let i = 0; i < allCmds.length; i++) {
        const cmd = allCmds[i];
        const end = i === allCmds.length - 1 ? "  ╰" : "  ┊";
        cmdLines += `${end}  ➶ ${prefix}${cmd}\n`;
      }

      categoryBlocks += `₊˚ʚ ᗢ₊˚✧ ﾟ. ${catEmoji} ${toSC(catName)} ｡ﾟ\n`;
      categoryBlocks += `┊${cmdLines}`;
      categoryBlocks += `₊˚ʚ ᗢ₊˚✧ ﾟ.\n\n`;
    }

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Aʟʟ Mᴇɴᴜ
┊
  ┊  ➶ *Nama:* ${m.pushName || "User"}
  ┊  ➶ *Nomor:* @${m.sender.split("@")[0]}
  ┊  ➶ *Role:* ${roleEmoji} ${userRole}
  ┊  ➶ *Premium:* ${m.isPremium ? "Aktif" : "Free"}
  ┊  ➶ *Energi:* ${m.isOwner || m.isPremium ? "∞" : (user?.energi ?? 25)}
  ┊  ➶ *Limit:* ${m.isOwner || m.isPremium ? "∞" : (user?.limit ?? "-")}
╠┈┈「 *Iɴғᴏ Bᴏᴛ* 」
  ┊  ➶ *Bot:* ${botConfig.bot?.name || "Nova AI"}
  ┊  ➶ *Version:* ${botConfig.bot?.version || "-"}
  ┊  ➶ *Prefix:* [ *${prefix}* ]
  ┊  ➶ *Uptime:* ${runtimeStr}
  ┊  ➶ *Total User:* ${totalUsers}
  ┊  ➶ *Waktu:* ${timeStr} WIB
  ┊  ➶ *Tanggal:* ${dateStr}
${weatherBlock ? weatherBlock : ""}❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}
${categoryBlocks}
❀°˖✧◝(⁰▿⁰)◜✧˖°❀
┊
  ┊  ➶ *Total: ${totalFitur} Fitur*
┊
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${getTimeGreeting()} *${m.pushName || "User"}* 👋`;
  } catch (e) {
    console.error("[allmenu] buildAllMenuText error:", e.message);
    return "❀°˖ All Menu ˖°❀\n\nError: " + e.message + "\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕐");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildAllMenuText(m, botConfig, db, uptime, sock);
    const thumbBuffer = getThumb();
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const saluranLink = botConfig.saluran?.link || "";
    const footerText = `${botName} | Nova AI WhatsApp Bot`;

    // Tombol navigasi (type 1)
    const buttons = [
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}menukategori`, buttonText: { displayText: "📂 Kategori" }, type: 1 },
      { buttonId: `${prefix}tanyaai`, buttonText: { displayText: "🤖 Tanya AI" }, type: 1 },
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
            body: "All Menu - Complete List",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      console.error("[allmenu] buttons gagal, fallback:", btnErr.message);
      await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "All Menu - Complete List",
            thumbnail: thumbBuffer,
            sourceUrl: saluranLink,
            mediaType: 2,
            showAdAttribution: false,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("✅");
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try {
      await m.reply("❌ Gagal menampilkan allmenu: " + e.message);
    } catch {}
    await m.react("❌");
  }
}

export { pluginConfig, handler };
