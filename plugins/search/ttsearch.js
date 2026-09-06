// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import crypto from "crypto";
import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "nova";
import te from "../../src/lib/nova-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { getdlTikTokSearch } from "../../src/scraper/getdl-tiktok.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "ttsearch",
  alias: ["ttsearch"],
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

function formatNum(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
}

async function handler(m, { sock }) {
  const query = m.args.join(" ")?.trim();

  if (!query) {
    return m.reply(claraWrap("TTSearch", [
      `📌 Cari video TikTok dari keyword:`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}ttsearch anime`,
      `${m.prefix}ttsearch cewe cantik`,
    ]));
  }
  try {
    await m.react("🕒");
    // Data UP-TO-DATE via GetDL (request owner 2026-09-06: data lama basi,
    // kadang muncul video 2023). Fallback ke scraper lama kalau GetDL mati.
    let videos = [];
    let fromGetdl = false;
    try {
      const gd = await getdlTikTokSearch(query, { count: 5 });
      if (gd?.length) {
        fromGetdl = true;
        videos = gd.map((v) => ({
          title: v.title,
          duration: v.duration,
          download: v.playUrl,
          link: v.playUrl,
          cover: v.cover,
          createdAt: v.createdAt,
          author: null,
          stats: null,
        }));
      }
    } catch (gdErr) {
      console.log("[ttsearch] GetDL gagal, fallback scraper lama:", gdErr.message);
    }
    if (!videos.length) {
      videos = await tiktokSearchVideo(query);
    }

    if (!videos || videos.length === 0) {
      await m.react("❗");
      return m.reply(novaError("TTSearch", `Gak nemu video untuk: ${query} nih`));
    }
    if (fromGetdl) await m.react("🐣");

    const maxShow = Math.min(videos.length, 5);
    const mediaList = videos.slice(0, maxShow).map((video) => ({
      video: { url: video.download || video.link },
      mimetype: "video/mp4",
      caption: `*TikTok Search*

Judul: ${video.title || "-"}
${video.author?.nickname ? `Author: ${video.author.nickname}\n` : ""}${video.stats?.plays ? `Views: ${formatNum(video.stats.plays)}\nLikes: ${formatNum(video.stats.likes)}\n` : ""}Link: ${video.link || "-"}`,
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
  } catch (error) {
    m.reply(claraWrap("ttsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, tiktokSearchVideo };
