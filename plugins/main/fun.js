// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fun.js — List command kategori fun
import { getCommandsByCategory } from "../../src/lib/nova-plugins.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fun",
  alias: ["fun"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const cmds = getCommandsByCategory();
    const funCmds = (cmds["fun"] || []).map(c => c.command || c).sort();

    let cmdLines = "";
    for (let i = 0; i < funCmds.length; i++) {
      cmdLines += `│ ${prefix}${funCmds[i]}\n`;
    }

    const text = `Fᴜɴ
${cmdLines}│ Total: ${funCmds.length} Fitur*
`;

    await m.reply(text);
    await m.react("");
  } catch (e) {
    console.error("[fun] handler error:", e.message);
    try { await m.reply("❌ Ada error nih, coba lagi ya"); } catch {}
  }
}

export { pluginConfig as config, handler };
