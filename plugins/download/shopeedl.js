// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// shopeedl.js — Download video Shopee (scrape shopeenowatermark.com)
import axios from "axios";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

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
  // Method 1: shopeenowatermark.com API
  try {
    const form = new FormData();
    form.append("url", url);

    const res = await fetch(`${BASE_URL}/api/extract`, {
      method: "POST",
      body: form,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.data?.videos?.length) {
        return data.data;
      }
    }
  } catch (e) { console.error('[shopeedl.js] shopeenowatermark:', e.message); }

  // Method 2: Scrape shopee API langsung
  try {
    // Extract item_id dan shop_id dari URL
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
        return { videos: [{ url: data.data.video_url, quality: "HD" }] };
      }
    }
  } catch (e) { console.error('[shopeedl.js] ishop:', e.message); }

  throw new Error("Gagal mengambil video Shopee");
}

async function handler(m, { sock }) {
  try {
    // Try IkyyXD shopeevid first
    const ikyyResult = await ikyyDl("shopeevid", url);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      await sock.sendMedia(m.chat, video.url, ikyyResult.title || null, m, {
        type: "video", contextInfo: { forwardingScore: 0, isForwarded: false }
      });
      return;
    }

    const url = m.text?.trim();
    if (!url || !url.includes("shopee")) {
      return m.reply(novaGuide("Shopee DL", "Kirim URL video Shopee yang valid!", ".shopeedl https://shopee.co.id/..."));
    }

    await m.react("🕒");
    const data = await extract(url);

    if (!data?.videos?.length) {
      await m.react("❌");
      return m.reply(novaError("Shopee DL", "Video tidak ditemukan di URL tersebut!"));
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
      title: "Shopee Video",
      format: "📹 Video",
      method: "Scrape",
    });

    await sock.sendMessage(m.chat, {
      video: buffer,
      caption,
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("[ShopeeDL]", err);
    await m.react("❌");
    m.reply(novaError("Shopee DL", "Gagal download video Shopee. Pastikan URL valid!"));
  }
}

export { pluginConfig as config, handler };
