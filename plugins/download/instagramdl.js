// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// instagramdl — Download video/foto Instagram
// Primary: IkyyXD /download/instagram (apikey + query) → all-in-one | Fallback: builtin ig.js
import { offerConvert } from "../../src/lib/nova-convert.js";
import { ikyyDownload, ikyyAio } from "../../src/scraper/ikyydl.js";
import instagramDownloader from "../../src/scraper/ig.js";
import { novaDlUsage, claraWrap, claraLine, mediaCaption, toSC, novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
    return m.reply(novaDlUsage("Instagram", {
      prefix: m.prefix,
      command: m.command || "instagramdl",
      cara: [`${m.prefix}${m.command || "instagramdl"} [link]`],
      contoh: [`${m.prefix}${m.command || "instagramdl"} https://www.instagram.com/reel/xxx`],
    }));
  }
  if (!url.match(/instagram\.com|instagr\.am/i)) {
    return m.reply(novaGuide("Instagram DL", "URL-nya gak valid nih! Pakai link Instagram ya.", `${m.prefix}instagramdl https://www.instagram.com/reel/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD instagram endpoint (uses "query" param + apikey)
    let result = null;
    try {
      const res = await import("axios");
      const axiosMod = res.default;
      const response = await axiosMod.get("https://api.ikyyxd.my.id/download/instagram", {
        params: { apikey: "kyzz", query: url },
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
      return m.reply(novaGagal("Instagram DL"));
    }

    const ctxInfo = { forwardingScore: 0, isForwarded: false };
    await m.react("🐣");

    for (const item of result.medias) {
      if (item.type === "video") {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, { type: "video", contextInfo: ctxInfo });
        await offerConvert(sock, m, { mediaUrl: item.url, type: "video", platform: "Instagram", title: result.title, sourceUrl: text });
      } else if (item.type === "audio") {
        await sock.sendMessage(m.chat, { audio: { url: item.url }, mimetype: "audio/mpeg", contextInfo: ctxInfo }, { quoted: m });
      } else {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, { type: "image", contextInfo: ctxInfo });
        await m.reply(novaBerhasil("Instagram DL"));
      }
      break;
    }
  } catch (error) {
    console.error("[instagramdl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("Instagram DL"));
  }
}

export { pluginConfig as config, handler };
