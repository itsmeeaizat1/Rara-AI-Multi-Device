// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// robloxstalk2.js — Roblox Stalker v2 (velyn.mom API)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch stalker) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "robloxstalk2",
  alias: ["robloxstalk2", "rbxstalk2", "robloxstalker2"],
  category: "stalker",
  description: "Stalk Roblox account v2 (velyn.mom API)",
  usage: ".robloxstalk2 <username>",
  example: ".robloxstalk2 Roblox",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const username = m.args.join(" ").trim();
    if (!username) {
      return m.reply(raraWrap("robloxstalk2", `Stalk Roblox siapa?\n\nContoh: ${m.prefix}robloxstalk2 Roblox`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://velyn.mom/api/stalker/roblox?username=${encodeURIComponent(username)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(raraWrap("robloxstalk2", `User "${username}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = "";
    msg += `Username: *${r.username || r.name || username}*\n`;
    if (r.displayName || r.display_name) msg += `Display: *${r.displayName || r.display_name}*\n`;
    if (r.id || r.userId) msg += `ID: *${r.id || r.userId}*\n`;
    if (r.description || r.bio) msg += `Desc: ${(r.description || r.bio).slice(0, 100)}\n`;
    if (r.followers || r.followerCount) msg += `Followers: *${(r.followers || r.followerCount).toLocaleString()}*\n`;
    if (r.following || r.followingCount) msg += `Following: *${(r.following || r.followingCount).toLocaleString()}*\n`;
    if (r.friends || r.friendCount) msg += `Friends: *${(r.friends || r.friendCount).toLocaleString()}*\n`;
    if (r.created || r.joined) msg += `Joined: *${r.created || r.joined}*\n`;
    if (r.url || r.profileUrl) msg += `URL: ${r.url || r.profileUrl}\n`;
    
    const avatarUrl = r.avatar || r.thumbnail || r.profile_picture;
    if (avatarUrl && avatarUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        const imgBuf = Buffer.from(imgRes.data);
        const card = await dlCard("gambar", { buffer: imgBuf }, [["Engine", "API velyn.mom"], ["Target", "@" + username], ["Judul", String(r.username || r.name || r.displayName || "-").slice(0, 40)], ["Followers", String(r.followers ?? r.followerCount ?? "-")], ["Friends", String(r.friends ?? r.friendCount ?? "-")], ["Joined", String(r.created || r.joined || "-").slice(0, 40)]]);
        return await sock.sendMessage(m.chat, { image: imgBuf, caption: card ? `${msg}\n\n${card}` : msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("robloxstalk2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("robloxstalk2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
