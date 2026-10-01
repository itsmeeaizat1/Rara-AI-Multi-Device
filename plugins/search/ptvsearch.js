// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/rara-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

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

    await sock.sendMessage(m.chat, {
      video: { url: randomVideo.download || randomVideo.link },
      mimetype: "video/mp4",
      ptv: true,
    });
  } catch (error) {
    m.reply(raraWrap("ptvsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, tiktokSearchVideo };
