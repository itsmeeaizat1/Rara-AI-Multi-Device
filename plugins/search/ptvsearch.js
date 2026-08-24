// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ptvsearch",
  alias: ["ptvs"],
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
    return m.reply( `╭┈┈⬡「 🎵 *Tiktok sEarch* 」
┃
┃ ㊗ Usage: \`${m.prefix}ptvsearch <query>\`
┃
╰┈┈⬡

  ┊  ➶ \`Contoh: ${m.prefix}ptvsearch anime\``, "ptvsearch");
  }

  m.react("🐣");

  try {
    const videos = await tiktokSearchVideo(query);

    if (!videos || videos.length === 0) {
      return m.reply(claraWrap("ptvsearch", `❌ Tidak ditemukan video untuk: ${query}`));
    }

    const randomVideo = videos[Math.floor(Math.random() * videos.length)];

    await sock.sendMessage(m.chat, {
      video: { url: randomVideo.link },
      mimetype: "video/mp4",
      ptv: true,
    });

    m.react("✅");
  } catch (error) {
    m.reply(claraWrap("ptvsearch", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, tiktokSearchVideo };
