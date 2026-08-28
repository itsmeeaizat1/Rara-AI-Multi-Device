// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "nova";
import axios from "axios";
import crypto from "crypto";
import te from "../../src/lib/nova-error.js";
import { f } from "../../src/lib/nova-http.js";
import { AIRich } from "../../src/lib/nova-builder.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

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
    return m.reply( `🔍 *ᴘɪɴᴛᴇʀᴇꜱᴛ ꜱᴇᴀʀᴄʜ*\n\n` +
      `Contoh:\n` +
      `\`${m.prefix}pins Zhao Lusi\``, "pins");
  }
  m.react("🕒");

  try {
    const data = await f(
      `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
    );

    const results = data?.data?.slice(0, 10);
    if (!results || results.length === 0) {
      return m.reply(novaError("Pins", `Gak nemu hasil untuk: ${query} nih`));
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
      return m.reply(novaError("Pins", "Gagal load gambar nih"));
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

      m.react("🐣");
    } catch (albumErr) {
      console.log("[Pins] Album gagal, kirim satu-satu:", albumErr.message);

      const saluranId = config.saluran?.id || "120363400911374213@newsletter";
      const saluranName =
        config.saluran?.name || config.bot?.name || "Nova-AI";

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
    m.react("🐣");
  } catch (err) {
    console.error("[Pins] Error:", err.message);
    m.reply(claraWrap("pins", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
