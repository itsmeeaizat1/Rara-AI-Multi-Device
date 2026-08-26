// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua fitur (interactive header image + nativeFlow buttons)
import { getCaseCount, getCasesByCategory } from "../../case/nova.js";
import config from "../../config.js";
import {
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["all", "totalmenu", "fitur", "listmenu"],
  category: "main",
  description: "Menampilkan semua fitur bot dalam satu pesan",
  usage: ".allmenu",
  example: ".allmenu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

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

const CATEGORY_ORDER = [
  "main", "ai", "download", "sticker", "tools", "game", "rpg",
  "fun", "canvas", "media", "search", "group", "utility",
  "info", "cek", "religi", "economy", "user", "random",
  "premium", "ephoto", "jpm", "pushkontak", "panel",
  "store", "owner",
];

async function buildAllMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const timeStr = fmtTime("HH:mm");
    const dateStr = fmtFull("DD MMMM YYYY");

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const totalUsers = db.getUserCount();
    const runtimeStr = formatUptime(uptime);

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `\n│  ┊ ${wf}`;
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

      const cmdList = allCmds.map(cmd => `│  ◈ ${prefix}${cmd}`).join("\n");
      categoryBlocks += `│\n│  ${catEmoji} *${catName}*\n${cmdList}\n`;
    }

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    return `╭─「 ${toSC(botName)} 」
│ ${getTimeGreeting()} *${m.pushName || "User"}* 👋
│
│  ◈ *ᴜsᴇʀ*
│  ┊ ɴᴀᴍᴀ: ${m.pushName || "User"}
│  ┊ ɴᴏᴍᴏʀ: @${m.sender.split("@")[0]}
│  ┊ ʀᴏʟᴇ: ${roleEmoji} ${userRole}
│  ┊ ᴘʀᴇᴍɪᴜᴍ: ${m.isPremium ? "Aktif" : "Free"}
│  ┊ ᴇɴᴇʀɢɪ: ${m.isOwner || m.isPremium ? "∞" : (user?.energi ?? 25)}
│  ┊ ᴋᴏɪɴ: ${(user?.koin ?? 0).toLocaleString()}
│  ┊ ʟɪᴍɪᴛ: ${m.isOwner || m.isPremium ? "∞" : (user?.limit ?? "-")}
│
│  ◈ *ʙᴏᴛ*
│  ┊ ɴᴀᴍᴀ: ${botName}
│  ┊ ᴠᴇʀsɪᴏɴ: ${botConfig.bot?.version || "-"}
│  ┊ ᴘʀᴇꜰɪx: [ ${prefix} ]
│  ┊ ᴜᴘᴛɪᴍᴇ: ${runtimeStr}
│  ┊ ᴜsᴇʀs: ${totalUsers}
│  ┊ ᴡᴀᴋᴛᴜ: ${timeStr} WIB — ${dateStr}${weatherBlock}
╰──────────────
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}
╭─「 *All Menu* 」
${categoryBlocks}│
│  *Total: ${totalFitur} Fitur*
╰──────────────
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${getTimeGreeting()} *${m.pushName || "User"}* 👋`;
  } catch (e) {
    console.error("[allmenu] buildAllMenuText error:", e.message);
    return `╭─「 All Menu 」\n│ Error: ${e.message}\n╰─`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildAllMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const navButtons = [
      { id: `${prefix}menu`, text: "🏠 Menu" },
      { id: `${prefix}allmenucategory`, text: "📂 Kategori" },
      { id: `${prefix}owner`, text: "👑 Owner" },
    ];

    await sendMenuCard(sock, m, {
      text,
      footer: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀",
      useImage: false, // tanpa gambar = gak save ke galeri
      buttons: navButtons,
      title: toSC(botName),
    });

    await m.react("🐣");
    try { await sendMenuAudio(sock, m, db, true); } catch {}
  } catch (e) {
    console.error("[allmenu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan allmenu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
