// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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

// Helper format tanggal
function formatDate(ts) {
  try {
    const ms = typeof ts === "number" && ts > 1e12 ? ts : typeof ts === "number" && ts > 1e9 ? ts * 1000 : ts;
    return new Date(ms).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

// Helper format uptime
function formatUptime(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m} menit`;
}

async function handler(m, { sock, db }) {
  await m.react("🕒");
  const prefix = config.command?.prefix || ".";
  const saluran = config.saluran || {};
  const channelId = saluran?.id || "@newsletter";
  const channelName = saluran?.name || config.bot?.name || "Nova AI";
  const channelLink = "https://whatsapp.com/channel/example";
  const botName = config.bot?.name || "Nova AI";
  const botVersion = config.bot?.version || "1.0.0";
  const ownerNumber = config.owner?.[0] || config.owner || "";
  const ownerName = config.ownerName || "Owner";

  // Cek apakah saluran sudah di-set
  const isChannelSet = channelId && channelId !== "@newsletter" && /^120363/.test(channelId);

  // ─── Ambil info saluran dari API (jika ID valid) ───
  let followerCount = null;
  let postsCount = null;
  let channelDesc = "";
  let createdAt = null;
  let verifiedStatus = null;
  let channelState = null;
  let reactionSettings = null;
  let privacyType = null;
  let lastPostText = null;
  let lastPostTime = null;

  if (isChannelSet) {
    try {
      const metadata = await sock.newsletterMetadata("jid", channelId);
      if (metadata) {
        followerCount = metadata.subscribers || metadata.followerCount || null;
        channelDesc = metadata.description || metadata.about || metadata.status || "";
        postsCount = metadata.messagesCount || metadata.postsCount || metadata.totalPosts || null;
        createdAt = metadata.creation_time || metadata.createdAt || metadata.creationTime || null;
        verifiedStatus = metadata.verification || metadata.verified || null;
        channelState = metadata.state || metadata.status_type || null;
        reactionSettings = metadata.reactions || metadata.reactionSettings || null;
        privacyType = metadata.privacy || metadata.privacyType || metadata.access || null;

        // Kalau postsCount belum ketemu
        if (postsCount === null && typeof sock.newsletterMessagesCount === "function") {
          try {
            const countData = await sock.newsletterMessagesCount(channelId);
            if (countData && typeof countData === "object") {
              postsCount = countData.messages || countData.count || countData.total || null;
            }
          } catch (e2) {
            console.log("[Channel] MessagesCount fetch failed:", e2.message);
          }
        }

        // ─── Ambil postingan terakhir ───
        try {
          if (typeof sock.newsletterMessages === "function") {
            const posts = await sock.newsletterMessages(channelId, 1);
            if (posts && Array.isArray(posts) && posts.length > 0) {
              const last = posts[0];
              lastPostText = last?.message?.conversation
                || last?.message?.extendedTextMessage?.text
                || last?.message?.imageMessage?.caption
                || last?.message?.videoMessage?.caption
                || last?.message?.newsletterMessage?.message?.conversation
                || null;
              lastPostTime = last?.messageTimestamp || last?.t || last?.createdAt || null;
            }
          } else if (typeof sock.fetchNewsletterMessages === "function") {
            const posts = await sock.fetchNewsletterMessages(channelId, 1);
            if (posts && Array.isArray(posts) && posts.length > 0) {
              const last = posts[0];
              lastPostText = last?.message?.conversation
                || last?.message?.extendedTextMessage?.text
                || last?.message?.imageMessage?.caption
                || last?.message?.videoMessage?.caption
                || null;
              lastPostTime = last?.messageTimestamp || last?.t || last?.createdAt || null;
            }
          }
        } catch (e3) {
          console.log("[Channel] Last post fetch failed:", e3.message);
        }
      }
    } catch (e) {
      console.log("[Channel] Metadata fetch failed:", e.message);
    }
  }

  // ─── Body text: Info Saluran ───
  const lines = [
    `  ┊  ➶ *Bot:* ${botName} v${botVersion}`,
    `  ┊  ➶ *Saluran:* ${channelName}`,
  ];

  if (followerCount !== null) {
    lines.push(`  ┊  ➶ *Pengikut:* ${Number(followerCount).toLocaleString("id-ID")}`);
  }

  if (postsCount !== null) {
    lines.push(`  ┊  ➶ *Total Postingan:* ${Number(postsCount).toLocaleString("id-ID")}`);
  }

  if (createdAt) {
    const dateStr = formatDate(createdAt);
    if (dateStr) lines.push(`  ┊  ➶ *Dibuat:* ${dateStr}`);
  }

  if (verifiedStatus !== null) {
    const verifiedStr = verifiedStatus === true || verifiedStatus === "VERIFIED"
      ? "Terverifikasi ✓"
      : verifiedStatus === false || verifiedStatus === "UNVERIFIED"
        ? "Belum Terverifikasi"
        : String(verifiedStatus);
    lines.push(`  ┊  ➶ *Verifikasi:* ${verifiedStr}`);
  }

  if (channelState) {
    const stateStr = typeof channelState === "string" ? channelState : String(channelState);
    lines.push(`  ┊  ➶ *Status:* ${stateStr}`);
  }

  if (privacyType) {
    const privacyStr = typeof privacyType === "string" ? privacyType : String(privacyType);
    lines.push(`  ┊  ➶ *Tipe:* ${privacyStr}`);
  }

  if (reactionSettings !== null && reactionSettings !== undefined) {
    const reactStr = typeof reactionSettings === "string"
      ? reactionSettings
      : typeof reactionSettings === "object"
        ? (reactionSettings?.enabled ? "Aktif" : "Nonaktif")
        : String(reactionSettings);
    lines.push(`  ┊  ➶ *Reaction:* ${reactStr}`);
  }

  if (channelDesc) {
    const descShort = channelDesc.length > 100 ? channelDesc.slice(0, 100) + "..." : channelDesc;
    lines.push(`  ┊  ➶ *Deskripsi:* ${descShort}`);
  }

  lines.push("");
  lines.push(`┊ Klik link di bawah untuk follow saluran:`);
  lines.push(`┊ ${channelLink}`);

  // ─── Postingan Terakhir ───
  if (lastPostText) {
    const postShort = lastPostText.length > 150 ? lastPostText.slice(0, 150) + "..." : lastPostText;
    lines.push("");
    lines.push(`  ┊  ➶ *Postingan Terakhir:*`);
    lines.push(`┊ ${postShort}`);

    if (lastPostTime) {
      const dateStr = formatDate(lastPostTime);
      if (dateStr) lines.push(`  ┊  ➶ *Waktu:* ${dateStr}`);
    }
  }

  // ─── Info Bot ───
  lines.push("");
  lines.push(`  ┊  ➶ *Owner:* ${ownerName}`);
  if (ownerNumber) {
    const ownerStr = String(ownerNumber).replace(/[^0-9]/g, "");
    lines.push(`  ┊  ➶ *Nomor Owner:* ${ownerStr}`);
  }

  // Uptime bot
  try {
    const uptimeMs = process.uptime() * 1000;
    lines.push(`  ┊  ➶ *Uptime:* ${formatUptime(uptimeMs)}`);
  } catch (_) { console.error('[channelnovaofficial.js]:', _?.message || _); }

  lines.push("");
  lines.push(`┊ Ikuti saluran untuk update fitur terbaru,`);
  lines.push(`┊ info maintenance, dan pengumuman penting`);

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
    isForwarded: false,
  };
  if (thumbBuffer) {
    contextInfo.externalAdReply = {
      title: botName,
      body: "Saluran WhatsApp Resmi",
      sourceUrl: channelLink,
      previewType: "PHOTO",
      showAdAttribution: false,
      renderLargerThumbnail: true,
      thumbnail: thumbBuffer,
    };
  }

  await m.reply(claraWrap("Saluran Resmi", lines.join("\n")), { contextInfo });
  await m.react("✅");
}

export default { config: pluginConfig, handler };
