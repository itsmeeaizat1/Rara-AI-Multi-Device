// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// instagramdl - Download video/foto Instagram
// Primary: IkyyXD /download/instagram (apikey + query) → all-in-one | Fallback: builtin ig.js
import { offerConvert } from "../../src/lib/rara-convert.js";
import { ikyyDownload, ikyyAio } from "../../src/scraper/ikyydl.js";
import instagramDownloader from "../../src/scraper/ig.js";
import { raraGuide, raraSalah, raraWrap, raraLine, toSC, raraError, raraEmpty, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";
import { mediaResultCard, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

// Caption builder LOKAL (bukan shared lib - owner: tiap fitur punya sendiri, 14 Sep 2026)
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
  name: "instagramdl",
  alias: ["instagramdl"],
  category: "download",
  description: "Download video/foto Instagram",
  usage: ".instagramdl <url>",
  example: ".instagramdl https://www.instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("instagram", {
 kaomoji: "(•̀ᴗ•́)و",
 sapaan: "mau simpen reel atau post IG? tempel linknya! (⌒‿⌒)",
      cara: "tempel link instagramnya sesudah command",
      contoh: `${m.prefix}${m.command || "instagramdl"} https://www.instagram.com/reel/xxx`,
      note: "bot otomatis unduh medianya, foto maupun video sekaligus",
      spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  if (!url.match(/instagram\.com|instagr\.am/i)) {
    return await sendUsageCard(sock, m, raraSalah("instagram", {
 kaomoji: "(´･_･`)",
      pesan: "linknya bukan link instagram nih, cek lagi ya~",
      contoh: `${m.prefix}${m.command || "instagramdl"} link instagram`,
    }), { name: "instagram" });
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD instagram endpoint (uses "query" param + apikey)
    let result = null;
    try {
      const res = await import("axios");
      const axiosMod = res.default;
      const response = await axiosMod.get("https://api.ikyyxd.my.id/download/instagram", {
        params: { apikey: getApiKey("kyzz"), query: url },
        timeout: 60000,
      });
      const data = response.data;
      if (data?.status && data?.result) {
        const r = data.result;
        const medias = [];
        if (Array.isArray(r.medias) && r.medias.length) {
          r.medias.forEach(item => medias.push({
            url: item.url,
            quality: item.quality || "default",
            ext: item.extension || item.ext || "mp4",
            type: item.type || (item.ext === "mp3" ? "audio" : "video"),
          }));
        } else if (Array.isArray(r) && r.length) {
          r.forEach(item => medias.push({
            url: item.url || item.video || item.download_url,
            quality: item.quality || "default",
            ext: item.ext || "mp4",
            type: item.type || "video",
          }));
        } else if (r.url || r.video) {
          medias.push({
            url: r.url || r.video,
            quality: r.quality || "default",
            ext: r.ext || "mp4",
            type: r.type || "video",
          });
        }
        if (medias.length) {
          result = {
            title: r.title || r.author || "Instagram Media",
            author: r.author || "",
            thumbnail: r.thumbnail || "",
            medias,
          };
        }
      }
    } catch (e) {
      console.error("[instagramdl.js] IkyyXD instagram failed:", e.message);
    }

    // Step 2: Try IkyyXD all-in-one
    if (!result) {
      result = await ikyyAio(url);
    }

    // Step 3: Fallback to builtin ig.js scraper
    if (!result || !result.medias?.length) {
      console.log("[instagramdl.js] IkyyXD failed, falling back to builtin ig.js...");
      try {
        const igResult = await instagramDownloader(url);
        if (igResult?.media?.length) {
          result = {
            title: igResult.title || "Instagram Media",
            medias: igResult.media.map(item => ({
              url: item.url,
              quality: item.quality || "default",
              ext: item.ext || (item.type === "image" ? "jpg" : "mp4"),
              type: item.type || "video",
            })),
          };
        }
      } catch (e) {
        console.error("[instagramdl.js] builtin fallback failed:", e.message);
      }
    }

    if (!result || !result.medias?.length) {
      await m.react("❌");
      return m.reply(raraGagal("Instagram DL"));
    }

    const ctxInfo = { forwardingScore: 0, isForwarded: false };
    await m.react("🐣");

    for (const item of result.medias) {
      let card = "";
      try {
        const info = await probeMedia(item.url);
        card = mediaResultCard({
          header: pluginConfig.name,
          type: item.type === "image" ? "foto" : item.type,
          title: result.title || "Instagram Media",
          platform: "Instagram",
          request: [["URL", url]],
          ...info,
        });
      } catch { /* best-effort */ }

      if (item.type === "video") {
        await sock.sendMedia(m.chat, item.url, card || result.title || null, m, { type: "video", contextInfo: ctxInfo });
        await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Instagram", title: result.title, sourceUrl: url });
      } else if (item.type === "audio") {
        await sock.sendMessage(m.chat, { audio: { url: item.url }, mimetype: "audio/mpeg", contextInfo: ctxInfo }, { quoted: m });
        if (card) await m.reply(card);
      } else {
        await sock.sendMedia(m.chat, item.url, card || result.title || null, m, { type: "image", contextInfo: ctxInfo });
        await m.reply(raraBerhasil("Instagram DL"));
      }
      break;
    }
  } catch (error) {
    console.error("[instagramdl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraGangguan("Instagram DL"));
  }
}

export { pluginConfig as config, handler };
