// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aboutnova.js — Info singkat bot + list command kategori main
import { getCommandsByCategory } from "../../src/lib/nova-plugins.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aboutnova",
  alias: ["aboutnova"],
  category: "main",
  description: "Info singkat tentang Nova AI Bot",
  usage: ".aboutnova",
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
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const version = botConfig.bot?.version || "-";
    const developer = botConfig.bot?.developer || "Aizat";

    const cmds = getCommandsByCategory();
    const mainCmds = (cmds["main"] || []).map(c => c.command || c).sort();

    let cmdLines = "";
    for (let i = 0; i < mainCmds.length; i++) {
      cmdLines += `│ ${prefix}${mainCmds[i]}\n`;
    }

    const text = `╭─「 ✦ Aʙᴏᴜᴛ Nᴏᴠᴀ ✦ 」\n│ *ɴᴀᴍᴀ:* ${toSC(botName)}
│ *ᴠᴇʀꜱɪᴏɴ:* ${version}
│ *ᴅᴇᴠᴇʟᴏᴘᴇʀ:* ${toSC(developer)}
│ *ᴘʟᴀᴛꜰᴏʀᴍ:* WhatsApp Multi Device
│ *ʟɪʙʀᴀʀʏ:* Baileys (nova-baileys)
│ *ʀᴜɴᴛɪᴍᴇ:* Node.js ${process.version}
│ 「 *Mᴀɪɴ Cᴏᴍᴍᴀɴᴅs
${cmdLines}╰────  •  ────
${prefix}menu untuk melihat semua fitur`;

    await m.reply(text);
    await m.react("");
  } catch (e) {
    console.error("[aboutnova] handler error:", e.message);
    try { await m.reply("╭─「 ✦ About ✦ 」\n│ Ada error nih\n│ Coba lagi ya\n╰────  •  ────"); } catch {}
  }
}

export { pluginConfig as config, handler };
