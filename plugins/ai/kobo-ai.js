// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kobo-ai",
  alias: ["kobo-ai", "kobo"],
  category: "ai",
  description: "Chat dengan Kobo Kanaeru — VTuber Hololive ID",
  usage: ".kobo-ai <pertanyaan>",
  example: ".kobo-ai Kobo lagi apa?",
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
    return m.reply( `🌬️ *ᴋᴏʙᴏ ᴋᴀɴᴀᴇʀᴜ*\n\n` +
        `VTuber Hololive Indonesia Gen 3\nWind Shaman yang cheerfull dan suka prank!\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}kobo-ai <pertanyaan>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}kobo-ai Kobo lagi apa?*`, "kobo-ai");
  }

  await m.react("🕒");

  try {
    const result = await UnlimitedAI(text, "kobo-ai");

    if (!result.status) {
      { const __navText = `❌ *ᴋᴏʙᴏ ᴀɪ ᴇʀʀᴏʀ*\n\n${result.error || "Gagal dapet respons nih"}`; return await m.reply(__navText); };
    }

    await m.react("🐣");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("kobo-ai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
