// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// memev2.js — Random meme from meme-api.com (no API key, Reddit source)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "memev2",
  alias: ["memev2"],
  category: "random",
  description: "Random meme dari Reddit via meme-api.com",
  usage: ".memev2 [subreddit]",
  example: ".memev2\n.memev2 dankmemes\n.memev2 wholesomememes",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function getMeme(subreddit) {
  const url = subreddit
    ? `https://meme-api.com/gimme/${encodeURIComponent(subreddit)}`
    : "https://meme-api.com/gimme";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meme API ${res.status}`);
  return await res.json();
}

async function handler(m, { sock, config, db }) {
  try {
    const subreddit = m.args?.[0] || "";

    await m.react("🕒");

    let meme = null;
    let retries = 0;

    // Retry if NSFW (max 3)
    while (retries < 3) {
      meme = await getMeme(subreddit);
      if (!meme.nsfw && !meme.spoiler) break;
      retries++;
    }

    if (!meme || !meme.url) {
      await m.react("🐣");
      return m.reply(claraWrap("Meme v2", "Gagal mengambil meme. Coba lagi nanti."));
    }

    await m.react("🐣");

    const caption = claraWrap("Meme v2", [
      `${meme.title || "Untitled"}`,
      `r/${meme.subreddit || "memes"} — u/${meme.author || "unknown"}`,
      meme.postLink ? `${meme.postLink}` : "",
    ]);

    // Send image with caption
    return await sock.sendMessage(m.chat, {
      image: { url: meme.url },
      caption,
    }, { quoted: m });
  } catch (e) {
    console.error("[memev2] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "memev2");
  }
}

export { pluginConfig as config, handler };
