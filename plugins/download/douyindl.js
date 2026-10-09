// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// douyin — Download video/audio/STORY dari Douyin (TikTok China)
// Primary: SnapTik (snaptik.fi — request owner 2026-09-06, "Support
// Download Story Juga", port dari script owner) → Fallback: IkyyXD → azbry
// Command: .douyin (alias: dy, douyindl, playdouyin — muscle memory tetap jalan)
//
// 2026-09-10 (request owner "ubah cmd dr playdouyin jadi douyin"):
// .douyin sekarang DUA MODE dalam satu command:
//   • .douyin <url douyin>   → download video/audio/story (ALUR LAMA, gak diubah)
//   • .douyin <keyword>      → search video/foto slide douyin via Apify
//     (douyin murni — link/keyword TikTok DITOLAK, arah .playtiktok/.tiktok)
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import { snaptikDouyin } from "../../src/scraper/snaptik-douyin.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import {
  isDouyinLink,
  isTikTokLink,
  searchPlayDouyin,
  pickRandom,
  pickBestVideoUrl,
} from "../../src/lib/rara-playdouyin.js";
import { haidarDouyin, sylvaticaDouyin } from "../../src/lib/rara-douyin-dl.js";
import axios from "axios";
import { raraWrap, raraLine, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
// kartu info media (batch download) — helper ringkas, best-effort tak pernah ganggu kirim
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


// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}

const pluginConfig = {
  name: "douyin",
  alias: ["douyin", "dy", "douyindl", "playdouyin", "douyinplay", "playdouy", "douyinsearch", "dyplay", "pldouyin"],
  category: "download",
  description: "Douyin (TikTok China): download video/story dari link, ATAU search video/foto slide dari keyword",
  usage: ".douyin <url douyin> | .douyin <keyword>",
  example: ".douyin https://v.douyin.com/xxx / .douyin kucing lucu",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

// Builtin fallback — azbry API
async function azbryFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`https://api.azbry.com/api/downloader/douyin?url=${encodeURIComponent(url)}`, { timeout: 30000 });
      return res.data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── MODE KEYWORD: search douyin (dari .playdouyin, douyin murni) ──
async function handleKeywordSearch(m, sock, keyword) {
  await m.react("🕒");
  const r = await searchPlayDouyin(keyword);
  if (r.error || !r.items.length) {
    await m.react("❌");
    return m.reply(raraWrap("Douyin", [
      `❌ ${r.error}`,
      ``,
      `💡 Douyin = TikTok China, sering ngeblok pencarian beberapa menit.`,
      `Coba lagi bentar, atau pakai mode link: ${m.prefix}douyin <link douyin>`,
    ]));
  }
  const item = pickRandom(r.items);
  if (!item) {
    await m.react("❌");
    return m.reply(raraGagal("Douyin"));
  }

  const title = (item.title || "").slice(0, 120).replace(/\n+/g, " ").trim() || "Douyin";
  const author = (item.author?.name || item.author?.handle || "").slice(0, 40);
  const stats = item.stats || {};
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n || 0));

  if (item.type === "photo" && item.images?.length) {
    const cap =
      `📸 Foto Slide Douyin\n\n` +
      `📝 ${title}\n` +
      (author ? `👤 ${author}\n` : "") +
      `🖼️ ${item.images.length} foto\n` +
      (item.link ? `\n🔗 ${item.link}\n` : "") +
      `🔖 Sumber: ${r.source}`;
    await sock.sendMessage(m.chat, { image: { url: item.images[0] }, caption: cap });
    for (const img of item.images.slice(1, 10)) {
      await new Promise((res) => setTimeout(res, 800));
      await sock.sendMessage(m.chat, { image: { url: img } }).catch(() => {});
    }
    // kartu ringkasan foto Douyin (batch download)
    try {
      const firstInfo = await probeMedia(item.images[0]).catch(() => null);
      const sumCard = mediaResultCard({ header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name, type: "gambar", request: [["Judul", String(title).slice(0, 40)], ["Jumlah foto", String(item.images.length)]], size: firstInfo?.size, mime: firstInfo?.mime, width: firstInfo?.width, height: firstInfo?.height });
      if (sumCard) await m.reply(sumCard);
    } catch {}
    await m.react("🐣");
    return;
  }

  const videoUrl = pickBestVideoUrl(item);
  if (!videoUrl) {
    await m.react("❌");
    return m.reply(raraWrap("Douyin", [`❌ Link media gak ketemu.`]));
  }
  const cap =
    `🎬 Video Douyin\n\n` +
    `📝 ${title}\n` +
    (author ? `👤 ${author}\n` : "") +
    (stats.plays || stats.likes
      ? `👀 ${fmt(stats.plays)} | ❤️ ${fmt(stats.likes)} | 💬 ${fmt(stats.comments)} | ↗️ ${fmt(stats.shares)}\n`
      : "") +
    `\n🎥 No Watermark\n` +
    (item.link ? `🔗 ${item.link}\n` : "") +
    `🔖 Sumber: ${r.source}`;
  await sock.sendMessage(m.chat, {
    video: { url: videoUrl }, caption: ((await dlCard("video", { url: videoUrl }, [["Judul", String(title).slice(0, 40)], ["Watermark", "tanpa watermark"]])) || cap),
    contextInfo: mediaPreviewCard({
      title,
      body: `Douyin • by ${author || "Unknown"}`,
      sourceUrl: item.link || "https://www.douyin.com",
      thumbnailUrl: item.cover || "",
      mediaType: 2,
    }),
  }, { quoted: m });
  await m.react("🐣");
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const text = args.join(" ").trim() || (m.text || "").trim();

  if (!text) {
    return m.reply(raraGuide("douyin", {
 kaomoji: "(・∀・)",
 sapaan: "video douyin mau disimpen? kasih link atau judulnya! (๑>ᴗ<)و",
      cara: "tempel linknya atau ketik keyword pencariannya",
      contoh: `${m.prefix}douyin kucing lucu · ${m.prefix}douyin https://v.douyin.com/xxx`,
      note: "kalo pake keyword, nanti bot cariin videonya dulu",
      spec: ["⚡ energi 1", "⏱ 15dtk", "💸 gratis"],
    }));
  }

  // link TikTok → DITOLAK (douyin murni, gak nyampur tiktok)
  if (isTikTokLink(text)) {
    await m.react("❌");
    return m.reply(raraWrap("Douyin", [
      `❗ Ini link TikTok — douyin hanya untuk Douyin (TikTok China).`,
      ``,
      `TikTok → pakai ${m.prefix}playtiktok atau ${m.prefix}tiktok`,
    ]));
  }

  // bukan URL → MODE KEYWORD SEARCH (search douyin via Apify)
  if (!/https?:\/\//i.test(text)) {
    if (text.length < 2) {
      await m.react("❌");
      return m.reply(raraWrap("Douyin", [`Keyword minimal 2 huruf.`]));
    }
    try {
      return await handleKeywordSearch(m, sock, text);
    } catch (err) {
      console.error("[douyin] keyword search error:", err.message || err);
      await m.react("❌");
      return m.reply(raraGangguan("Douyin"));
    }
  }

  // URL douyin → MODE DOWNLOAD (ALUR LAMA, gak diubah)
  try {
    await m.react("🕒");

    // Step 0: SnapTik (snaptik.fi) — primary, support video + STORY Douyin
    const snap = await snaptikDouyin(text);
    if (snap?.status && snap?.video) {
      // format owner 19 Sep — disamakan ke semua downloader
      const caption = tiktokCaption({
        header: "Douyin Downloader",
        title: snap.title || "Douyin Video",
        uploader: snap.artist || null,
        duration: snap.durationSec || null,
        download: "SD",
      });
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        video: { url: snap.video },
        caption,
        contextInfo: mediaPreviewCard({
          title: snap.title || "Douyin Video",
          body: `Douyin • by ${snap.artist || "Unknown"}`,
          sourceUrl: text,
          thumbnailUrl: snap.cover || "",
          mediaType: 2,
        }),
      }, { quoted: m });
      await offerConvert(sock, m, { mediaUrl: snap.video, type: "video", platform: "Douyin", title: snap.title, sourceUrl: text });
      return;
    }
    if (snap?.status && !snap?.video && snap?.mp3) {
      // Kasus khusus: cuma audio (story audio dsb)
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        audio: { url: snap.mp3 },
        mimetype: "audio/mpeg",
      }, { quoted: m });
      return;
    }
    console.log("[douyin] SnapTik gagal:", snap?.message, "→ fallback IkyyXD...");

    // Step 1: Try IkyyXD (douyin endpoint → all-in-one fallback)
    const result = await ikyyDownload(text, "douyin", { apikey: getApiKey("kyzz") });

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      const audio = result.medias.find(m => m.type === "audio");

      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "Douyin",
        title: result.title || "Douyin Video",
        author: result.author || null,
        duration: result.duration || null,
        format: "Video", method: "IkyyXD",
      });

      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption,
      }, { quoted: m });
      return;
    }

    // Step 1.5: Haidar downloader douyin (request owner 2026-09-10)
    const hd = await haidarDouyin(text);
    if (hd?.video) {
      const captionH = mediaCaption({
        platformIcon: "🎵", platformName: "Douyin",
        title: hd.title || "Douyin Video",
        format: "Video (No Watermark)", method: "Haidar",
      });
      await m.react("🐣");
      await sock.sendMessage(m.chat, { video: { url: hd.video }, caption: captionH }, { quoted: m });
      return;
    }
    if (hd?.images?.length) {
      await sock.sendMessage(m.chat, { image: { url: hd.images[0] }, caption: `📸 Foto Slide Douyin\n\n📝 ${hd.title}\n🔖 Sumber: Haidar` });
      for (const img of hd.images.slice(1, 10)) {
        await new Promise((res) => setTimeout(res, 800));
        await sock.sendMessage(m.chat, { image: { url: img } }).catch(() => {});
      }
      await m.react("🐣");
      return;
    }
    console.log("[douyindl.js] Haidar gagal → Sylvatica...");

    // Step 1.6: Sylvatica downloader douyin (request owner 2026-09-10)
    const sy = await sylvaticaDouyin(text);
    if (sy?.video) {
      const captionS = mediaCaption({
        platformIcon: "🎵", platformName: "Douyin",
        title: sy.title || "Douyin Video",
        format: sy.quality ? `Video (${sy.quality})` : "Video",
        method: "Sylvatica",
      });
      await m.react("🐣");
      await sock.sendMessage(m.chat, { video: { url: sy.video }, caption: captionS }, { quoted: m });
      return;
    }
    if (sy?.images?.length) {
      await sock.sendMessage(m.chat, { image: { url: sy.images[0] }, caption: `📸 Foto Slide Douyin\n\n📝 ${sy.title}\n🔖 Sumber: Sylvatica` });
      for (const img of sy.images.slice(1, 10)) {
        await new Promise((res) => setTimeout(res, 800));
        await sock.sendMessage(m.chat, { image: { url: img } }).catch(() => {});
      }
      await m.react("🐣");
      return;
    }
    console.log("[douyindl.js] Sylvatica gagal → azbry...");

    // Step 2: Fallback to azbry API
    console.log("[douyindl.js] azbry fallback...");
    try {
      const data = await azbryFetch(text);
      const r = data.result;

      const caption2 = mediaCaption({
        platformIcon: "🎵", platformName: "Douyin",
        title: r.title || "Douyin Video",
        author: r.author || null,
        format: r.video ? "Video" : "Audio",
        method: "azbry",
      });

      if (r.video) {
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
          video: { url: r.video }, caption: caption2,
        }, { quoted: m });
      } else if (r.audio) {
        await m.reply(caption2);
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
          audio: { url: r.audio },
          mimetype: "audio/mpeg",
        }, { quoted: m });
      } else {
        await m.react("❌");
        await m.reply(raraGagal("Douyin DL"));
        await m.reply(raraBerhasil("douyindl"));
      }
      return;
    } catch (e) {
      console.error("[douyindl.js] azbry fallback failed:", e.message);
    }

    // Step 2.5: Last-mile fallback — snapvideotools (video + FOTO SLIDE douyin)
    try {
      const { resolvePlayDouyin } = await import("../../src/lib/rara-playdouyin.js");
      const r = await resolvePlayDouyin(text);
      if (r?.item) {
        const item = r.item;
        if (item.type === "photo" && item.images?.length) {
          const cap =
            `📸 Foto Slide Douyin\n\n` +
            `📝 ${String(item.title || "").slice(0, 120).replace(/\n+/g, " ").trim() || "Douyin"}\n` +
            `🖼️ ${item.images.length} foto\n` +
            `🔖 Sumber: ${r.source}`;
          await sock.sendMessage(m.chat, { image: { url: item.images[0] }, caption: cap });
          for (const img of item.images.slice(1, 10)) {
            await new Promise((res) => setTimeout(res, 800));
            await sock.sendMessage(m.chat, { image: { url: img } }).catch(() => {});
          }
          await m.react("🐣");
          return;
        }
        const videoUrl = pickBestVideoUrl(item);
        if (videoUrl) {
          await m.react("🐣");
          await sock.sendMessage(m.chat, { video: { url: videoUrl } }, { quoted: m });
          return;
        }
      }
    } catch (e) {
      console.error("[douyindl.js] snapvideotools fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(raraGagal("Douyin DL"));
  } catch (error) {
    console.error("[douyindl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraGangguan("Douyin DL"));
  }
}

export { pluginConfig as config, handler };
