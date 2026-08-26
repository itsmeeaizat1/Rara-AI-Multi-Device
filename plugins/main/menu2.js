// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu2.js — Quick menu (interactive header image + nativeFlow buttons)
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import path from "path";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";

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
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

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

async function handler(m, { sock, config: botConfig }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    let linkLines = "";
    for (const i = 0; i < QUICK_LINKS.length; i++) {
      const q = QUICK_LINKS[i];
      linkLines += `│  ◈ ${q.emoji} ${prefix}${q.cmd} — ${q.label}\n`;
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

    const text = `╭─「 *Quick Menu* 」
${linkLines}│
│  *Total: ${totalFitur} Fitur*
╰──────────────
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${m.pushName || "User"} 👋`;

    const navButtons = [
      { id: `${prefix}menu`, text: "🏠 Menu" },
      { id: `${prefix}allmenu`, text: "📋 All Menu" },
      { id: `${prefix}owner`, text: "👑 Owner" },
    ];

    await sendMenuCard(sock, m, {
      text,
      footer: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: toSC(botName),
    });

    await m.react("🐣");
  } catch (e) {
    console.error("[menu2] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu2: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
