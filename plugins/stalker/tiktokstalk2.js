// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokstalk2.js — TikTok Stalker v2 (nexray API)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tiktokstalk2",
  alias: ["tiktokstalk2", "ttstalk2", "ttstalker2"],
  category: "stalker",
  description: "Stalk TikTok account v2 (nexray API)",
  usage: ".tiktokstalk2 <username>",
  example: ".tiktokstalk2 charlidamelio",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const username = m.args.join(" ").trim().replace(/@/g, "");
    if (!username) {
      return m.reply(claraWrap("tiktokstalk2", `Stalk TikTok siapa?\n\nContoh: ${m.prefix}tiktokstalk2 charlidamelio`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.nexray.web.id/stalker/tiktok?username=${encodeURIComponent(username)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(claraWrap("tiktokstalk2", `User "${username}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = "";
    msg += `Username: *@${r.username || username}*\n`;
    if (r.nickname || r.name) msg += `Nama: *${r.nickname || r.name}*\n`;
    if (r.signature || r.bio) msg += `Bio: ${(r.signature || r.bio).slice(0, 100)}\n`;
    if (r.followers || r.followerCount) msg += `Followers: *${(r.followers || r.followerCount).toLocaleString()}*\n`;
    if (r.following || r.followingCount) msg += `Following: *${(r.following || r.followingCount).toLocaleString()}*\n`;
    if (r.likes || r.totalLikes || r.heart) msg += `Total Likes: *${(r.likes || r.totalLikes || r.heart).toLocaleString()}*\n`;
    if (r.video_count || r.videoCount) msg += `Total Video: *${r.video_count || r.videoCount}*\n`;
    if (r.verified !== undefined) msg += `Verified: ${r.verified ? "✅" : "❌"}\n`;
    if (r.url || r.link) msg += `URL: ${r.url || r.link}\n`;
    
    const avatarUrl = r.avatar || r.profile_picture || r.avatarUrl;
    if (avatarUrl && avatarUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        return await sock.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("tiktokstalk2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tiktokstalk2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
