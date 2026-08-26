// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command per kategori (text + externalAdReply + buttons)
import config from "../../config.js";
import {
  getTimeGreeting,
  formatUptime,
} from "../../src/lib/nova-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import fs from "fs";
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";

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

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "game", "rpg", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Games", rpg: "RPG",
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
    const p = path.join(process.cwd(), "assets", "image", "menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
      console.log("[allmenu] ✅ Thumbnail loaded: " + _thumbCache.length + " bytes");
    }
  } catch (e) { console.error("[allmenu] ❌ Thumbnail load failed:", e.message); }
  return _thumbCache;
}

async function buildAllMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;

    const totalUsers = db.getUserCount();
    const runtimeStr = formatUptime(uptime);
    const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(now);
    const dateStr = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `${wf}\n`;
    } catch {}

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
        const isLast = i === allCmds.length - 1;
        const bullet = isLast ? "╰" : "➶";
        cmdLines += `  ┊  ${bullet}➶ ${prefix}${allCmds[i]}\n`;
      }

      categoryBlocks += `  ° ✿  ${catEmoji} ${catName} ✿ °\n`;
      categoryBlocks += cmdLines;
      categoryBlocks += `\n`;
    }

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    return `╭─「 *${toSC("Info User")}* 」
│  ➥ *ɴᴀᴍᴀ:* ${m.pushName || "User"}
│  ➥ *ɴᴏᴍᴏʀ:* @${m.sender.split("@")[0]}
│  ➥ *ʀᴏʟᴇ:* ${roleEmoji} ${userRole}
│  ➥ *ᴘʀᴇᴍɪᴜᴍ:* ${m.isPremium ? "Aktif" : "Free"}
│  ➥ *ᴇɴᴇʀɢɪ:* ${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}
│  ➥ *ᴋᴏɪɴ:* ${(user?.koin ?? 0).toLocaleString()}
│  ➥ *ʟɪᴍɪᴛ:* ${m.isOwner || m.isPremium ? "Unlimited" : (user?.limit ?? "-")}
│  ➥ *ʟᴇᴠᴇʟ:* ${userLevel}
│  ➥ *xᴘ:* ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
│  ➥ *sᴛᴀᴛᴜs:* ${user?.isBanned ? "Banned" : "Aktif"}
╰─
╭─「 *${toSC("Info Bot")}* 」
│  ➥ *ʙᴏᴛ:* ${botConfig.bot?.name || "Nova AI"}
│  ➥ *ᴠᴇʀsɪᴏɴ:* ${botConfig.bot?.version || "-"}
│  ➥ *ᴘʀᴇꜰɪx:* [ *${prefix}* ]
│  ➥ *ᴜᴘᴛɪᴍᴇ:* ${runtimeStr}
│  ➥ *ᴛᴏᴛᴀʟ ᴜsᴇʀ:* ${totalUsers}
│  ➥ *ᴡᴀᴋᴛᴜ:* ${timeStr} WIB
│  ➥ *ᴛᴀɴɢɢᴀʟ:* ${dateStr}
╰─${weatherBlock ? "\n" + weatherBlock : ""}
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}
${categoryBlocks}
  *Total: ${totalFitur} Fitur*

  ❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${getTimeGreeting()} *${m.pushName || "User"}* 👋`;
  } catch (e) {
    console.error("[allmenu] buildAllMenuText error:", e.message);
    return `╭─「 *All Menu* 」\n│  ➥ Error: ${e.message}\n╰─`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildAllMenuText(m, botConfig, db, uptime, sock);
    const menuThumb = getThumb();
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const saluranLink = botConfig.saluran?.link || "";

    const buttons = [
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}allmenucategory`, buttonText: { displayText: "📂 Kategori" }, type: 1 },
      { buttonId: `${prefix}owner`, buttonText: { displayText: "👑 Owner" }, type: 1 },
    ];

    try {
      await sock.sendMessage(m.chat, {
        text: text,
        footer: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀",
        buttons: buttons,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "All Menu - Complete List",
            thumbnail: menuThumb,
            sourceUrl: saluranLink,
            mediaType: 1,
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
            thumbnail: menuThumb,
            sourceUrl: saluranLink,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("🐣");
    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan allmenu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
