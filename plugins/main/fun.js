// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fun.js — List command kategori fun
import { getCommandsByCategory } from "../../src/lib/nova-plugins.js";

const pluginConfig = {
  name: "fun",
  alias: ["funmenu", "menufun"],
  category: "main",
  description: "List command kategori fun",
  usage: ".fun",
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const cmds = getCommandsByCategory();
    const funCmds = (cmds["fun"] || []).map(c => c.command || c).sort();

    let cmdLines = "";
    for (let i = 0; i < funCmds.length; i++) {
      const end = i === funCmds.length - 1 ? "  ╰" : "  ┊";
      cmdLines += `${end}  ➶ ${prefix}${funCmds[i]}\n`;
    }

    const text = `╭──「 *Fᴜɴ 」
┊
₊˚ʚ ᗢ₊˚✧ ﾟ. 🎮 Fᴜɴ ｡ﾟ
┊${cmdLines}₊˚ʚ ᗢ₊˚✧ ﾟ.
┊
│ ❏ *Total: ${funCmds.length} Fitur*
┊
╰──────────❀`;

    await m.reply(text);
    await m.react("🐣");
  } catch (e) {
    console.error("[fun] handler error:", e.message);
    try { await m.reply("❌ Error: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
