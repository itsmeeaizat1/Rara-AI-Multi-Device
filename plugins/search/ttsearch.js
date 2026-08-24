// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import crypto from "crypto";
import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "nova";
import te from "../../src/lib/nova-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "ttsearch",
  alias: ["ttsearch", "tiktoksearch", "tts2"],
  category: "search",
  description: "Cari video TikTok",
  usage: ".ttsearch <query>",
  example: ".ttsearch jj epep",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.args.join(" ")?.trim();

  if (!query) {
    return m.reply( `╭┈┈⬡「 🎵 *Tiktok sEarch* 」
┃
㊗ Usage: \`${m.prefix}ttsearch <query>\`
┃
╰┈┈⬡

  ┊  ➶ \`Contoh: ${m.prefix}ttsearch anime\``, "ttsearch");
  }

  m.react("🕒");

  try {
    const videos = await tiktokSearchVideo(query);

    if (!videos || videos.length === 0) {
      return m.reply(claraWrap("ttsearch", `❌ Tidak ditemukan video untuk: ${query}`));
    }

    const maxShow = Math.min(videos.length, 5);
    const mediaList = videos.slice(0, maxShow).map((video) => ({
      video: { url: video.link },
      mimetype: "video/mp4",
      caption: `🎵 *TIKTOK SEARCH*

📌 ${video.title || "-"}
👤 ${video.author?.nickname || "-"}
👀 ${video.stats?.plays || 0} views
❤️ ${video.stats?.likes || 0} likes`,
      contextInfo: {
        forwardingScore: 0,
        isForwarded: false,
      },
    }));

    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: 0,
            expectedVideoCount: mediaList.length,
          },
        },
        {
          userJid: jidNormalizedUser(sock.user.id),
          quoted: m,
          upload: sock.waUploadToServer,
        },
      );

      await sock.relayMessage(opener.key.remoteJid, opener.message, {
        messageId: opener.key.id,
      });

      const generatedMessages = await Promise.all(
        mediaList.map(async (content) => {
          const msg = await generateWAMessage(opener.key.remoteJid, content, {
            upload: sock.waUploadToServer,
          });

          msg.message.messageContextInfo = {
            messageSecret: crypto.randomBytes(32),
            messageAssociation: {
              associationType: 1,
              parentMessageKey: opener.key,
            },
          };

          return msg;
        }),
      );

      for (const msg of generatedMessages) {
        await sock.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id,
        });
      }
    } catch (albumError) {
      for (const content of mediaList) {
        await sock.sendMessage(m.chat, content, { quoted: m });
      }
    }

    m.react("✅");
  } catch (error) {
    m.reply(claraWrap("ttsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, tiktokSearchVideo };
