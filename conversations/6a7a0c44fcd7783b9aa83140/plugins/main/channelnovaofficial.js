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
  let postsCount = null;
  let channelDesc = "";
  let lastPostText = null;
  let lastPostTime = null;

  if (isChannelSet) {
    try {
      const metadata = await sock.newsletterMetadata("jid", channelId);
      if (metadata) {
        followerCount = metadata.subscribers || metadata.followerCount || null;
        channelDesc = metadata.description || metadata.about || metadata.status || "";

        // Ambil total postingan (beberapa kemungkinan field di Baileys)
        postsCount = metadata.messagesCount || metadata.postsCount || metadata.totalPosts || null;

        // Kalau belum ketemu, coba pakai newsletterMessagesCount
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
        // Coba berbagai kemungkinan method di Baileys
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

  // ─── Body text ───
  const lines = [
    `╎❏ *Bot:* ${botName} v${botVersion}`,
    `╎❏ *Saluran:* ${channelName}`,
  ];

  if (followerCount !== null) {
    lines.push(`╎❏ *Pengikut:* ${Number(followerCount).toLocaleString("id-ID")}`);
  }

  if (postsCount !== null) {
    lines.push(`╎❏ *Total Postingan:* ${Number(postsCount).toLocaleString("id-ID")}`);
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

  // ─── Postingan Terakhir ───
  if (lastPostText) {
    const postShort = lastPostText.length > 150 ? lastPostText.slice(0, 150) + "..." : lastPostText;
    lines.push("");
    lines.push(`╎❏ *Postingan Terakhir:*`);
    lines.push(`╎ ${postShort}`);

    if (lastPostTime) {
      try {
        const ts = typeof lastPostTime === "number" && lastPostTime > 1e12
          ? lastPostTime
          : typeof lastPostTime === "number" && lastPostTime > 1e9
            ? lastPostTime * 1000
            : lastPostTime;
        const dateStr = new Date(ts).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        lines.push(`╎❏ *Waktu:* ${dateStr}`);
      } catch (_) {}
    }
  }

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
