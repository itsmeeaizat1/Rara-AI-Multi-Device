// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "waguri-ai",
  alias: ["waguriai", "waguri"],
  category: "ai",
  description: "Chat dengan Waguri-san — Gadis pemalu yang lupa kacamata",
  usage: ".waguri-ai <pertanyaan>",
  example: ".waguri-ai Waguri-san, halo!",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply( `👓 *ᴡᴀɢᴜʀɪ-ꜱᴀɴ*\n\n` +
        `Gadis pemalu dari "The Girl I Like Forgot Her Glasses"\nManis, perhatian, dan sering salah tingkah~\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}waguri-ai <pertanyaan>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}waguri-ai Waguri-san, halo!*`, "waguri-ai");
  }

  await m.react("🕒");

  try {
    const result = await UnlimitedAI(text, "waguri-ai");

    if (!result.status) {
      { const __navText = `❌ *ᴡᴀɢᴜʀɪ ᴀɪ ᴇʀʀᴏʀ*\n\n${result.error || "Gagal mendapatkan respons"}`; return await m.reply(__navText); };
    }

    await m.react("🐣");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("waguri-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
