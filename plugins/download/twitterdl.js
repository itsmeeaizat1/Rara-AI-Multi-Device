// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// twitterdl.js — Download video dari Twitter/X (Sanka API + scrape fallback)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "twitterdl",
  alias: ["twitterdl", "twitter", "xdl", "twitdl"],
  category: "download",
  description: "Download video dari Twitter/X",
  usage: ".twitterdl <url_twitter>",
  example: ".twitterdl https://twitter.com/user/status/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

const sankaConfig = getSankaConfig();

async function twitterDownload(url) {
  // Method 1: Sanka API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/twitter?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 20000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const video = r.url || r.video || r.medias?.[0]?.url || r.videos?.[0]?.url;
      if (video) return { url: video, title: r.title, author: r.author || r.username };
    }
  } catch (e) { console.error('[twitterdl.js] Sanka:', e.message); }

  // Method 2: Scrape via ssstwitter
  try {
    const { data } = await axios.post("https://ssstwitter.com/api/v1/download",
      { url }, { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );
    if (data?.data?.videos?.length) {
      return { url: data.data.videos[0].url, title: data.data.title, author: data.data.author };
    }
  } catch (e) { console.error('[twitterdl.js] ssstwitter:', e.message); }

  throw new Error("Gagal mengambil video Twitter");
}

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const url = m.args?.[0]?.trim();
    if (!url || (!url.includes("twitter") && !url.includes("x.com"))) {
      return m.reply(claraWrap("twitterdl", `Masukkan URL Twitter/X!\n\nContoh: .twitterdl https://twitter.com/user/status/xxx`, "guide"));
    }

    const result = await twitterDownload(url);
    const caption = mediaCaption({
      platformIcon: "𝕏",
      platformName: "Twitter/X",
      title: result.title || "Twitter Video",
      author: result.author || null,
      format: "📹 Video",
      method: "Sanka",
    });

    await sock.sendMessage(from, {
      video: { url: result.url },
      caption,
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("twitterdl error:", err);
    await m.react("❌");
    return m.reply(claraWrap("twitterdl", "Gagal download video Twitter. Pastikan URL valid dan contain video!", "error"));
  }
}

export { pluginConfig as config, handler };
