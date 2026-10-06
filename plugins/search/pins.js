// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "rara";
import axios from "axios";
import config from "../../config.js";
import crypto from "crypto";
import te from "../../src/lib/rara-error.js";
import { f } from "../../src/lib/rara-http.js";
import { AIRich } from "../../src/lib/rara-builder.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const pluginConfig = {
  name: "pins",
  alias: ["pins"],
  category: "search",
  description: "Cari gambar di Pinterest (album)",
  usage: ".pins <query>",
  example: ".pins Zhao Lusi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query) {
    return m.reply( raraWrap("pins", `🔍 *pinterest search*\n\n` +
      `Contoh:\n` +
      `\`${m.prefix}pins Zhao Lusi\``, "guide"), "pins");
  }
  try {
    const data = await f(
      `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
    );

    const results = data?.data?.slice(0, 10);
    if (!results || results.length === 0) {
      return m.reply(raraError("Pins", `Gak nemu hasil untuk: ${query} nih`));
    }

    const mediaList = [];

    for (const item of results) {
      const imageUrl = item.image_url;
      if (!imageUrl) continue;

      try {
        const imgRes = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        const imgBuffer = Buffer.from(imgRes.data);

        if (imgBuffer.length > 1000) {
          mediaList.push({ image: imgBuffer });
        }
      } catch (e) {
        continue;
      }
    }

    if (mediaList.length === 0) {
      return m.reply(raraError("Pins", "Gagal load gambar nih"));
    }

    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: mediaList.length,
            expectedVideoCount: 0,
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

      for (const content of mediaList) {
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

        await sock.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id,
        });
      }
    } catch (albumErr) {
      console.log("[Pins] Album gagal, kirim satu-satu:", albumErr.message);

      const saluranId = config.saluran?.id || "@newsletter";
      const saluranName =
        config.saluran?.name || config.bot?.name || "Rara-AI";

      for (const content of mediaList) {
        await sock.sendMessage(
          m.chat,
          {
            image: content.image,
            contextInfo: {
              forwardingScore: 0,
              isForwarded: false,
            },
          },
          { quoted: m },
        );
      }
    }

    try {
      const firstBuf = mediaList[0]?.image;
      const firstInfo = firstBuf ? await probeBuffer(firstBuf).catch(() => null) : null;
      const sumCard = mediaResultCard({
        header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
        type: "gambar",
        request: [["Query", String(query).slice(0, 40)], ["Jumlah foto", String(mediaList.length)]],
        size: firstInfo?.size, mime: firstInfo?.mime, width: firstInfo?.width, height: firstInfo?.height
      });
      if (sumCard) await m.reply(sumCard);
    } catch {}
  } catch (err) {
    console.error("[Pins] Error:", err.message);
    m.reply(raraWrap("pins", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
