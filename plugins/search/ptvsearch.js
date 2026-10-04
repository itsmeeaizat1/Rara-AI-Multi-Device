// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch download) - helper ringkas, best-effort tak pernah ganggu kirim
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


const pluginConfig = {
  name: "ptvsearch",
  alias: ["ptvsearch"],
  category: "search",
  description: "Cari video TikTok",
  usage: ".ptvsearch <query>",
  example: ".ptvsearch jj epep",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.args.join(" ")?.trim();

  if (!query) {
    return m.reply(raraCaption({
  emoji: "🔍",
  name: "ptvsearch",
  description: "Cari video TikTok",
  usage: `${m.prefix}ptvsearch <query>`,
  example: `${m.prefix}ptvsearch jj epep`,
}), "ptvsearch")
  }
  try {
    const videos = await tiktokSearchVideo(query);

    if (!videos || videos.length === 0) {
      return m.reply(raraError("PTVSearch", `Gak nemu video untuk: ${query} nih`));
    }

    const randomVideo = videos[Math.floor(Math.random() * videos.length)];

    const videoUrl = randomVideo.download || randomVideo.link;
    await sock.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      ptv: true,
      caption: ((await dlCard("video", { url: videoUrl }, [["Query", String(query).slice(0, 40)]])) || undefined),
    }, { quoted: m });
  } catch (error) {
    m.reply(raraWrap("ptvsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, tiktokSearchVideo };
