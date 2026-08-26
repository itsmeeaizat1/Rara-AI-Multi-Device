// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { RedNoteDL } from "../../src/scraper/rednote.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rednotedl",
  alias: ["rednotedl"],
  category: "download",
  description: "Download video/foto dari RedNote (XiaoHongShu)",
  usage: ".rednotedl <url>",
  example: ".rednotedl https://www.xiaohongshu.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply( `📕 *ʀᴇᴅɴᴏᴛᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `Download video atau foto dari XiaoHongShu (RedNote).\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}rednotedl <link>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}rednotedl https://www.xiaohongshu.com/xxx*`, "rednotedl");
  }

  m.react("🕒");

  try {
    const result = await RedNoteDL(text);

    if (!result.status) {
      { const __navText = `❌ *ʀᴇᴅɴᴏᴛᴇ ɢᴀɢᴀʟ*\n\n${result.error}`; return await m.reply(__navText); };
    }

    if (result.type === "video" && result.results?.[0]) {
      await sock.sendMedia(m.chat, result.results[0], result.title, m, {
        type: "video",
      });
    } else if (result.results?.length > 0) {
      for (let i = 0; i < Math.min(result.results.length, 5); i++) {
        await sock.sendMedia(m.chat, result.results[i], "", m, {
          type: "image",
        });
      }
      if (result.results.length > 5) {
        await m.reply(
          `_Masih ada ${result.results.length - 5} foto lagi, maksimal 5_`,
        );
      }
    }

    m.react("🐣");
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("rednotedl", "❌ Gagal mengambil data RedNote, coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
