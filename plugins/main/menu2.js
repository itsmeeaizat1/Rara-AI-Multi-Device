// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu2.js — Menu navigasi cepat (text + externalAdReply + buttons)
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "menu2",
  alias: ["quickmenu", "qm", "fastmenu"],
  category: "main",
  description: "Menu navigasi cepat dengan shortcut",
  usage: ".menu2",
  example: ".menu2",
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

const QUICK_LINKS = [
  { label: "Menu Utama", cmd: "menu", emoji: "🏠" },
  { label: "All Menu", cmd: "allmenu", emoji: "📋" },
  { label: "Kategori", cmd: "allmenucategory", emoji: "📂" },
  { label: "Info Bot", cmd: "info", emoji: "ℹ️" },
  { label: "Owner", cmd: "owner", emoji: "👑" },
  { label: "Sewa Bot", cmd: "sewa", emoji: "🛒" },
  { label: "Donasi", cmd: "donasi", emoji: "💝" },
  { label: "Rules", cmd: "rules", emoji: "📜" },
];

let _thumbCache = null;
function getThumb() {
  if (_thumbCache) return _thumbCache;
  try {
    const p = path.join(process.cwd(), "assets", "image", "menu.jpg");
    if (fs.existsSync(p)) {
      _thumbCache = fs.readFileSync(p);
    }
  } catch (e) {}
  return _thumbCache;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const saluranLink = botConfig.saluran?.link || "";
    const menuThumb = getThumb();

    let linkLines = "";
    for (let i = 0; i < QUICK_LINKS.length; i++) {
      const q = QUICK_LINKS[i];
      linkLines += `│  ➥ ${q.emoji} ${prefix}${q.cmd} — ${q.label}\n`;
    }

    const totalFitur = (() => {
      const pluginCats = getCategories();
      const commandsByCategory = getCommandsByCategory();
      const caseCats = getCasesByCategory();
      let total = 0;
      for (const cat of pluginCats) total += (commandsByCategory[cat] || []).length;
      for (const cat of Object.keys(caseCats)) total += (caseCats[cat] || []).length;
      return total;
    })();

    const text = `╭─「 *${toSC("Quick Menu")}* 」
${linkLines}│
│  ➥ *Total: ${totalFitur} Fitur*
╰─

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${m.pushName || "User"} 👋`;

    const buttons = [
      { buttonId: `${prefix}menu`, buttonText: { displayText: "🏠 Menu" }, type: 1 },
      { buttonId: `${prefix}allmenu`, buttonText: { displayText: "📋 All Menu" }, type: 1 },
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
            body: "Quick Navigation",
            thumbnail: menuThumb,
            sourceUrl: saluranLink,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    } catch (btnErr) {
      await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: toSC(botName),
            body: "Quick Navigation",
            thumbnail: menuThumb,
            sourceUrl: saluranLink,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: m });
    }

    await m.react("🐣");
  } catch (e) {
    console.error("[menu2] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu2: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
