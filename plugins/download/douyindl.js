// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// douyin — Download video/audio/STORY dari Douyin (TikTok China)
// Primary: SnapTik (snaptik.fi — request owner 2026-09-06, "Support
// Download Story Juga", port dari script owner) → Fallback: IkyyXD → azbry
// Command: .douyin (alias: dy, douyindl — muscle memory lama tetap jalan)
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import { snaptikDouyin } from "../../src/scraper/snaptik-douyin.js";
import { offerConvert } from "../../src/lib/nova-convert.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import axios from "axios";
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "douyin",
  alias: ["douyin", "dy", "douyindl"],
  category: "download",
  description: "Download video/audio/STORY dari Douyin (TikTok China) via SnapTik",
  usage: ".douyin <url>",
  example: ".douyin https://v.douyin.com/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

// Builtin fallback — azbry API
async function azbryFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`https://api.azbry.com/api/downloader/douyin?url=${encodeURIComponent(url)}`, { timeout: 30000 });
      if (res.data?.status && res.data?.result) return res.data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("Gagal mengambil data dari server");
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaNoInput("Douyin", "Kirim URL video/STORY Douyin (TikTok China) yang mau didownload!", `${m.prefix}douyin https://v.douyin.com/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 0: SnapTik (snaptik.fi) — primary, support video + STORY Douyin
    const snap = await snaptikDouyin(text);
    if (snap?.status && snap?.video) {
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "Douyin",
        title: snap.title || "Douyin Video",
        author: snap.artist || null,
        duration: snap.durationSec ? `${Math.floor(snap.durationSec / 60)}:${String(snap.durationSec % 60).padStart(2, "0")}` : null,
        format: "Video (No Watermark)",
        method: "SnapTik",
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
    const result = await ikyyDownload(text, "douyin", { apikey: "kyzz" });

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

    // Step 2: Fallback to azbry API
    console.log("[douyindl.js] IkyyXD failed, falling back to azbry...");
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
        await m.reply(novaGagal("Douyin DL"));
        await m.reply(novaBerhasil("douyindl"));
      }
      return;
    } catch (e) {
      console.error("[douyindl.js] azbry fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaGagal("Douyin DL"));
  } catch (error) {
    console.error("[douyindl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("Douyin DL"));
  }
}

export { pluginConfig as config, handler };
