// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/rara-asset-manager.js";
import { fileTypeFromBuffer } from "file-type";
import { config } from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { generateWAMessage } from "nova";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const botConfig = config;

function buildSyntheticSwGcRawMessage(sock, remoteJid, innerMessage, messageId) {
  const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
  return {
    key: {
      remoteJid,
      fromMe: true,
      id: messageId,
      participant: botJid,
    },
    message: {
      groupStatusMessageV2: {
        message: innerMessage,
      },
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
  };
}

const pluginConfig = {
  name: "swgcv2all",
  alias: ["swgcv2all"],
  category: "owner",
  description: "Post Group Status V2 ke SEMUA grup",
  usage: ".swgcv2all <teks> atau reply media",
  example: ".swgcv2all Halo semua grup!",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text || "";

  let rawContent = null;

  if (m.isMedia || (m.quoted && m.quoted.isMedia)) {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      return m.reply(raraWrap("Swgcv2all", "❌ Gagal mengunduh media. Silakan coba lagi."));
    }

    const fileType = await fileTypeFromBuffer(buffer);
    const mime = fileType ? fileType.mime : "application/octet-stream";

    if (mime.startsWith("image/")) {
      rawContent = { image: buffer, caption: text };
    } else if (mime.startsWith("video/")) {
      rawContent = { video: buffer, caption: text };
    } else if (mime.startsWith("audio/")) {
      rawContent = {
        audio: buffer,
        mimetype: "audio/mpeg",
        ptt: m.quoted?.ptt || m.ptt || false,
      };
    } else {
      return m.reply(raraWrap("Swgcv2all", "❌ Format media tidak didukung untuk SW GC."));
    }
  } else if (text) {
    rawContent = { text: text };
  } else {
    return m.reply(
      raraWrap(
      "Swgcv2all",
      `👋 *sWgcv2 All Global*\n\n` +
      `Kirim pesan *Status Grup V2* ke SEMUA grup sekaligus.\n\n` +
      "" +
      `${m.prefix}swgcv2all Halo semua!\n` +
      `atau reply gambar/video dengan caption ${m.prefix}swgcv2all\n` +
      `---`),
    );
  }
  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupIds = Object.keys(groups);

    if (groupIds.length === 0) {
      return m.reply(raraWrap("Swgcv2all", "❌ Bot tidak berada di grup manapun."));
    }


    let successCount = 0;
    let failCount = 0;

    for (const targetGroupId of groupIds) {
      try {
        let baseContent = {};
        if (rawContent.image) {
          baseContent = { image: rawContent.image, caption: rawContent.caption || "" };
        } else if (rawContent.video) {
          baseContent = { video: rawContent.video, caption: rawContent.caption || "" };
        } else if (rawContent.audio) {
          baseContent = { audio: rawContent.audio, mimetype: rawContent.mimetype || "audio/mpeg", ptt: rawContent.ptt || false };
        } else if (rawContent.text) {
          baseContent = { text: rawContent.text };
        }

        const genMsg = await generateWAMessage(targetGroupId, baseContent, {
          userJid: sock.user.id,
          upload: sock.waUploadToServer
        });

        const msgType = Object.keys(genMsg.message).find(k => k.endsWith('Message') && k !== 'senderKeyDistributionMessage');

        let mediaMessage = {};
        if (msgType) {
          mediaMessage[msgType] = genMsg.message[msgType];
          const newContextInfo = {
            isGroupStatus: true,
            statusSourceType: rawContent.text ? 4 : rawContent.audio ? 3 : rawContent.video ? 1 : 0,
            featureEligibilities: {
              canBeReshared: true,
              canBeSentToParticipants: true
            },
            statusAttributions: [
              {
                type: 10
              }
            ],
            statusAudienceMetadata: {
              audienceType: 1
            }
          };

          if (mediaMessage[msgType].contextInfo) {
            Object.assign(mediaMessage[msgType].contextInfo, newContextInfo);
          } else {
            mediaMessage[msgType].contextInfo = newContextInfo;
          }
        }

        const messageId = genMsg.key.id;
        const finalMessage = buildSyntheticSwGcRawMessage(
          sock,
          targetGroupId,
          mediaMessage,
          messageId
        );

        await sock.relayMessage(targetGroupId, finalMessage.message, {
          messageId: messageId,
        });
        
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    await m.reply(raraWrap("swgcv2all", `✅ *sWgcv2 All sElesai*\n\n` +
      "" +
      `🌐 Total Grup: *${groupIds.length}*\n` +
      `✅ Sukses: *${successCount}*\n` +
      `❌ Gagal: *${failCount}*\n` +
      `---\n\n` +
      `Broadcast Status Grup V2 (Ring Pink) berhasil dikirim ke semua grup!`));

  } catch (error) {
    console.error("[SwgcV2All] Error:", error.message);
    await m.reply(raraWrap("swgcv2all", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
