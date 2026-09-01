// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aihelp.js — AI help berdasarkan command yang ada
import { getAllPlugins, getPluginInfo } from "../../src/lib/nova-plugins.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aihelp",
  alias: ["aihelp"],
  category: "ai",
  description: "Bantuan AI untuk menemukan command yang tersedia",
  usage: ".aihelp <keyword>",
  example: ".aihelp download",
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

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.slice(prefix.length).trim().split(/\s+/).slice(1) || [];
    const keyword = args.join(" ").toLowerCase().trim();

    if (!keyword) {
      await m.reply(`Ketik *${prefix}aihelp <keyword>* untuk cari command.\n\nContoh:\n${prefix}aihelp download\n${prefix}aihelp sticker\n${prefix}aihelp group`);
      return;
    }

    // Cari command yang match keyword
    const allPlugins = getAllPlugins();
    const matches = [];
    for (const p of allPlugins) {
      const info = getPluginInfo(p);
      if (!info) continue;
      const name = (info.name || "").toLowerCase();
      const desc = (info.description || "").toLowerCase();
      const cat = (info.category || "").toLowerCase();
      const alias = (info.alias || []).join(" ").toLowerCase();
      if (name.includes(keyword) || desc.includes(keyword) || cat.includes(keyword) || alias.includes(keyword)) {
        matches.push(info);
      }
    }

    if (matches.length === 0) {
      await m.reply(`❌ Gak ada command untuk "${keyword}" nih\nCoba keyword lain!\nContoh: download, sticker, game, rpg`);
      return;
    }

    let cmdLines = "";
    for (let i = 0; i < matches.length; i++) {
      const desc = matches[i].description ? ` — ${matches[i].description}` : "";
      cmdLines += `${prefix}${matches[i].name}${desc}\n`;
    }

    const text = `Keyword: ${keyword}\nDitemukan: ${matches.length} command\n\n${cmdLines.trim()}`;

    await m.reply(text);
  } catch (e) {
    console.error("[aihelp] handler error:", e.message);
    try { await m.reply("❌ Ada error nih. Coba lagi ya"); } catch {}
  }
}

export { pluginConfig as config, handler };
