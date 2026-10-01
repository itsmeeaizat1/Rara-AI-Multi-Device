// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// fun.js — List command kategori fun
import { getCommandsByCategory } from "../../src/lib/rara-plugins.js";
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

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

const SC_MAP = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c);

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const cmds = getCommandsByCategory();
    const funCmds = (cmds["fun"] || []).map(c => c.command || c).sort();

    let cmdLines = "";
    for (let i = 0; i < funCmds.length; i++) {
      cmdLines += `${prefix}${funCmds[i]}\n`;
    }

    const text = `Fun
${cmdLines}Total: ${funCmds.length} Fitur*
`;

    await m.reply(text);
    await m.react("");
  } catch (e) {
    console.error("[fun] handler error:", e.message);
    try { await m.reply(raraError("Fun", "Ada error nih, coba lagi ya")); } catch {}
  }
}

export { pluginConfig as config, handler };
