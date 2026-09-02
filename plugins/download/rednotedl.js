// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { RedNoteDL } from "../../src/scraper/rednote.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";

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
  try {
    const result = await RedNoteDL(text);

    if (!result.status) {
      return m.reply(novaError("RedNote", result.error || "Gagal download nih"));
    }

    if (result.type === "video" && result.results?.[0]) {
      const _cap = mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote Video", format: "Video", method: "IkyyXD" });
      await sock.sendMessage(m.chat, {
        video: { url: result.results[0] }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else if (result.results?.length > 0) {
      for (let i = 0; i < Math.min(result.results.length, 5); i++) {
        const _imgCap = i === 0 ? mediaCaption({ platformIcon: "🔴", platformName: "RedNote", title: result.title || "RedNote", format: "Image", method: "IkyyXD" }) : null;
        await sock.sendMessage(m.chat, {
          image: { url: result.results[i] },
          ...( _imgCap ? { caption: _imgCap } : {}),
        }, { quoted: m });
      }
      if (result.results.length > 5) {
        await m.reply(
          `_Masih ada ${result.results.length - 5} foto lagi, maksimal 5_`,
        );
      }
    }
  } catch (e) {
    console.error(e);
    m.reply(novaError("RedNote", "Gagal ambil data — coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
