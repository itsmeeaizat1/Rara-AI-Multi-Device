import config from "../../config.js";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "../../src/lib/nova-wa-helpers.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "channelnovaofficial",
  alias: ["channel", "saluran", "ch", "saluranresmi"],
  category: "main",
  desc: "Info & link saluran WhatsApp resmi bot",
  usage: ".channelnovaofficial",
  example: ".channel",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, db }) {
  await m.react("🕐");
  const prefix = config.command?.prefix || ".";
  const saluran = config.saluran || {};
  const channelId = saluran?.id || "@newsletter";
  const channelName = saluran?.name || config.bot?.name || "Nova AI";
  const channelLink = "https://whatsapp.com/channel/example";
  const botName = config.bot?.name || "Nova AI";
  const botVersion = config.bot?.version || "1.0.0";

  // Cek apakah saluran sudah di-set
  const isChannelSet = channelId && channelId !== "@newsletter" && /^120363/.test(channelId);

  // ─── Ambil info saluran dari API (jika ID valid) ───
  let followerCount = null;
  let channelDesc = "";
  if (isChannelSet) {
    try {
      const metadata = await sock.newsletterMetadata("jid", channelId);
      if (metadata) {
        followerCount = metadata.subscribers || metadata.followerCount || null;
        channelDesc = metadata.description || metadata.about || "";
      }
    } catch (e) {
      // Silent fail, tetap tampilkan info dasar
      console.log("[Channel] Metadata fetch failed:", e.message);
    }
  }

  // ─── Body text ───
  const lines = [
    `╎❏ *Bot:* ${botName} v${botVersion}`,
    `╎❏ *Saluran:* ${channelName}`,
  ];

  if (followerCount !== null) {
    lines.push(`╎❏ *Pengikut:* ${Number(followerCount).toLocaleString("id-ID")}`);
  }

  if (channelDesc) {
    const descShort = channelDesc.length > 100 ? channelDesc.slice(0, 100) + "..." : channelDesc;
    lines.push(`╎❏ *Deskripsi:* ${descShort}`);
  }

  if (channelLink) {
    lines.push("");
    lines.push(`╎ Klik link di bawah untuk follow saluran:`);
    lines.push(`╎ ${channelLink}`);
  } else if (!isChannelSet) {
    lines.push("");
    lines.push(`╎ Saluran belum di-set oleh owner.`);
    lines.push(`╎ Owner: .setsaluran <link> untuk setup`);
  }

  lines.push("");
  lines.push(`╎ Ikuti saluran untuk update fitur terbaru,`);
  lines.push(`╎ info maintenance, dan pengumuman penting`);

  // ─── Kirim dengan tombol interaktif ───
  try {
    if (channelLink && /^https?:\/\//i.test(channelLink)) {
      // Kirim dengan tombol URL + quick_reply
      const thumbPath = config.assets?.["nova"];
      const fs = await import("fs");
      let headerOpts = {};
      if (thumbPath && fs.existsSync(thumbPath)) {
        const sharp = (await import("sharp")).default;
        const thumb = await sharp(fs.readFileSync(thumbPath)).resize(640, 360).toBuffer();
        headerOpts = {
          hasMediaAttachment: true,
          imageMessage: (await prepareWAMessageMedia(
            { image: thumb },
            { upload: sock.waUploadToServer },
          )).imageMessage,
        };
      }

      const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: { message: {
          messageContextInfo: {},
          interactiveMessage: {
            header: { title: "", subtitle: "", ...headerOpts },
            body: { text: claraWrap("Saluran Resmi", lines.join("\n")) },
            footer: { text: `${botName} | Official Channel` },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardingScore: 9,
            },
            nativeFlowMessage: {
              messageParamsJson: JSON.stringify({}),
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Follow Saluran",
                    url: channelLink,
                    merchant_url: channelLink,
                  }),
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Menu",
                    id: `${prefix}menu`,
                  }),
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Owner",
                    id: `${prefix}owner`,
                  }),
                },
              ],
            },
          },
        } },
      }, { quoted: m, userJid: sock.user.jid });

      await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    } else {
      // Fallback: text only tanpa tombol URL
      await m.reply(claraWrap("Saluran Resmi", lines.join("\n")));
    }
  } catch (e) {
    console.error("[Channel] Error:", e.message);
    await m.reply(claraWrap("Saluran Resmi", lines.join("\n")));
  }

  await m.react("✅");
}

export default { config: pluginConfig, handler };
