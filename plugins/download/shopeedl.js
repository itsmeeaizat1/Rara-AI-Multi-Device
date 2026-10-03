// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// shopeedl.js — Download video Shopee no-watermark
// Engine: shopeenowatermark.com (src/scraper/shopee-nowm.js — axios+cookie
// jar → Puppeteer buat tembus Cloudflare) → ishop.id → IkyyXD shopeevid.
// FIX 2026-09-06: (1) bug TDZ — ikyyDl dipanggil SEBELUM const url
// dideklarasiin → ReferenceError tiap invoke (fitur gak pernah jalan);
// (2) validasi URL sekarang terima link share app shp.ee/id.shp.ee;
// (3) Method 1 lama (fetch polos) kena Cloudflare 403 → scraper baru.
import axios from "axios";
import { raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { shopeeNoWm } from "../../src/scraper/shopee-nowm.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";

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
  return lines.join("\n");
}


const pluginConfig = {
  name: "shopeedl",
  alias: ["shopeedl"],
  category: "download",
  description: "Download video dari Shopee",
  usage: ".shopeedl <url>",
  example: ".shopeedl https://shopee.co.id/universal-link/video/...",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 2, isEnabled: true,
};

const BASE_URL = "https://shopeenowatermark.com";

async function extract(url) {
  // Method 1: shopeenowatermark.com via scraper baru
  // (axios+cookie jar → Puppeteer kalau kena Cloudflare)
  try {
    const data = await shopeeNoWm(url);
    if (data?.videos?.length) return data;
  } catch (e) { console.error('[shopeedl.js] shopeenowatermark:', e.message); }

  // Method 2: ishop.id (butuh shop_id.item_id di URL — shortlink gak bisa)
  try {
    const match = url.match(/(\d+)\.(\d+)/);
    if (match) {
      const shopId = match[1];
      const itemId = match[2];
      const apiUrl = `https://ishop.id/api/video/get?shop_id=${shopId}&item_id=${itemId}`;
      const { data } = await axios.get(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://shopee.co.id/" },
        timeout: 10000,
      });
      if (data?.data?.video_url) {
        return { title: null, cover: null, videos: [{ url: data.data.video_url, quality: "HD" }] };
      }
    }
  } catch (e) { console.error('[shopeedl.js] ishop:', e.message); }

  // Method 3: IkyyXD shopeevid
  try {
    const r = await ikyyDl("shopeevid", url);
    if (r?.medias?.length) {
      const v = r.medias.find((x) => x.type === "video") || r.medias[0];
      return { title: r.title || null, cover: null, videos: [{ url: v.url, quality: v.quality || null }] };
    }
  } catch (e) { console.error('[shopeedl.js] ikyy shopeevid:', e.message); }

  throw new Error("Gagal mengambil video Shopee");
}

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    // FIX: dulu cuma "shopee" → link share app (id.shp.ee/...) keditolak
    if (!url || !/shopee|shp\.ee/i.test(url)) {
      return m.reply(raraGuide("Shopee DL", "Kirim URL video Shopee yang valid!", ".shopeedl https://id.shp.ee/xxx"));
    }

    await m.react("🕒");
    const data = await extract(url);

    if (!data?.videos?.length) {
      await m.react("❌");
      return m.reply(raraError("Shopee DL", "Video tidak ditemukan di URL tersebut!"));
    }

    // Ambil video quality terbaik
    const video = data.videos[0];
    const videoUrl = video.url;

    const vidRes = await axios.get(videoUrl, {
      responseType: "arraybuffer", timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(vidRes.data);

    const caption = mediaCaption({
      platformIcon: "🛒",
      platformName: "Shopee",
      title: data.title || "Shopee Video",
      format: `Video No Watermark${video.quality ? ` (${video.quality})` : ""}`,
      method: "ShopeeNoWatermark",
    });

    await sock.sendMessage(m.chat, {
      video: buffer,
      caption,
      contextInfo: mediaPreviewCard({
        title: data.title || "Shopee Video",
        body: "Shopee • No Watermark",
        sourceUrl: url,
        thumbnailUrl: data.cover || "",
        mediaType: 2,
      }),
    }, { quoted: m });
    await m.react("🐣");
    await offerConvert(sock, m, { mediaUrl: videoUrl, type: "video", platform: "Shopee", title: data.title || "Shopee Video", sourceUrl: url });
  } catch (err) {
    console.error("[ShopeeDL]", err);
    await m.react("❌");
    m.reply(raraGagal("Shopee DL"));
  }
}

export { pluginConfig as config, handler };
