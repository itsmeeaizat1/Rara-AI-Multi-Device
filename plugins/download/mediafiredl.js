// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import mediafire from "../../src/scraper/mediafire.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mediafiredl",
  alias: ["mediafiredl", "mfdl"],
  category: "download",
  description: "Download file dari MediaFire",
  usage: ".mfdl <url>",
  example: ".mfdl https://www.mediafire.com/file/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function getFileName(result) {
  const directName = result?.meta?.title?.trim();
  const urlName = decodeURIComponent(
    result?.download?.link_download?.split("/").pop()?.split("?")[0] || "",
  );
  const extension = urlName.includes(".") ? `.${urlName.split(".").pop()}` : "";
  if (directName && extension && !directName.includes("."))
    return `${directName}${extension}`;
  return directName || urlName || `mediafire_${Date.now()}${extension}`;
}

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `\`${m.prefix}mfdl <url>\`\n\n` +
        `Contoh:\n` +
        `\`${m.prefix}mfdl https://www.mediafire.com/file/xxx\``, "mediafiredl");
  }

  if (!url.match(/mediafire\.com/i)) {
    return m.reply(claraWrap("Mediafiredl", `❌ *ᴜʀʟ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ. ɢᴜɴᴀᴋᴀɴ ʟɪɴᴋ ᴍᴇᴅɪᴀꜰɪʀᴇ.*`));
  }
  await m.react("🕒");

  try {
    const result = await mediafire(url);
    await sock.sendMessage(
      m.chat,
      {
        document: { url: result.download.link_download },
        fileName: getFileName(result),
        mimetype: result.download.mimetype,
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false,
        },
      },
      { quoted: m },
    );
  } catch (err) {
    return m.reply(claraWrap("mediafiredl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
