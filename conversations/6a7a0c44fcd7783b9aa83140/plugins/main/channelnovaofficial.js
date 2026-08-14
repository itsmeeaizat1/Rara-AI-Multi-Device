import config from "../../config.js";
import fs from "fs";
import sharp from "sharp";
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

// Banner asset - isi gambar kamu di sini
const BANNER_PATH = "assets/image/channel-banner.png";

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

  lines.push("");
  lines.push(`╎ Klik link di bawah untuk follow saluran:`);
  lines.push(`╎ ${channelLink}`);
  lines.push("");
  lines.push(`╎ Ikuti saluran untuk update fitur terbaru,`);
  lines.push(`╎ info maintenance, dan pengumuman penting`);

  // ─── Thumbnail via externalAdReply (banner dari asset) ───
  let thumbBuffer = null;
  try {
    if (fs.existsSync(BANNER_PATH)) {
      thumbBuffer = await sharp(fs.readFileSync(BANNER_PATH)).resize(640, 360).jpeg().toBuffer();
    }
  } catch (e) {
    console.log("[Channel] Banner error:", e.message);
  }

  const contextInfo = {
    mentionedJid: [m.sender],
    forwardingScore: 9,
    isForwarded: true,
    externalAdReply: {
      title: botName,
      body: "Saluran WhatsApp Resmi",
      sourceUrl: channelLink,
      previewType: "IMAGE",
      showAdAttribution: false,
      renderLargerThumbnail: true,
    },
  };
  if (thumbBuffer) contextInfo.externalAdReply.thumbnail = thumbBuffer;

  await m.reply(claraWrap("Saluran Resmi", lines.join("\n")), { contextInfo });
  await m.react("✅");
}

export default { config: pluginConfig, handler };
