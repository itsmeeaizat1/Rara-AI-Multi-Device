// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aboutrara.js — Info singkat bot + list command kategori main
import { getCommandsByCategory } from "../../src/lib/rara-plugins.js";
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aboutrara",
  alias: ["aboutrara", "aboutnova"],
  category: "main",
  description: "Info singkat tentang Rara AI Bot",
  usage: ".aboutrara",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SC_MAP = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c);

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const botName = botConfig.bot?.name || "Rara AI - Multi Device";
    const version = botConfig.bot?.version || "-";
    const developer = botConfig.bot?.developer || "Aizat";

    const cmds = getCommandsByCategory();
    const mainCmds = (cmds["main"] || []).map(c => c.command || c).sort();

    let cmdLines = "";
    for (let i = 0; i < mainCmds.length; i++) {
      cmdLines += `${prefix}${mainCmds[i]}\n`;
    }

    const text = `*Nama:* ${toSC(botName)}
*version:* ${version}
*developer:* ${toSC(developer)}
*platform:* WhatsApp Multi Device
*library:* Baileys (rara-baileys)
*runtime:* Node.js ${process.version}
「 *Main Commands
${cmdLines}
${prefix}menu untuk melihat semua fitur`;

    await m.reply(text);
    await m.react("");
  } catch (e) {
    console.error("[aboutrara] handler error:", e.message);
    try { await m.reply(raraError("Aboutrara", "Ada error nih, coba lagi ya")); } catch {}
  }
}

export { pluginConfig as config, handler };
