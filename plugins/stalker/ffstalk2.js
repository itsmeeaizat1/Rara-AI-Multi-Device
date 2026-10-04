// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ffstalk2.js — Free Fire Stalker v2 (nexray API, bandung-themed)
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
  name: "ffstalk2",
  alias: ["ffstalk2", "freefirestalk2", "ffstalker2"],
  category: "stalker",
  description: "Stalk Free Fire account v2 (nexray API)",
  usage: ".ffstalk2 <player ID>",
  example: ".ffstalk2 123456789",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const uid = m.args.join(" ").trim();
    if (!uid || !/^\d+$/.test(uid)) {
      return m.reply(raraWrap("ffstalk2", `Masukkan ID Free Fire yang valid.\n\nContoh: ${m.prefix}ffstalk2 123456789`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.nexray.web.id/stalker/free-fire?uid=${encodeURIComponent(uid)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(raraWrap("ffstalk2", `Player ID "${uid}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = "";
    msg += `ID: *${uid}*\n`;
    if (r.username || r.name || r.nickname) msg += `Nama: *${r.username || r.name || r.nickname}*\n`;
    if (r.level) msg += `Level: *${r.level}*\n`;
    if (r.rank || r.ranking) msg += `Rank: *${r.rank || r.ranking}*\n`;
    if (r.region || r.country) msg += `Region: *${r.region || r.country}*\n`;
    if (r.bio) msg += `Bio: ${r.bio.slice(0, 80)}\n`;
    if (r.like || r.likes) msg += `Likes: *${r.like || r.likes}*\n`;
    if (r.exp || r.exploit) msg += `EXP: *${r.exp || r.exploit}*\n`;
    
    const avatarUrl = r.avatar || r.profile_picture || r.banner_image;
    if (avatarUrl && avatarUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        const imgBuf = Buffer.from(imgRes.data);
        const card = await dlCard("gambar", { buffer: imgBuf }, [["Engine", "API nexray.web.id"], ["Target", "UID " + uid], ["Judul", String(r.username || r.name || r.nickname || "-").slice(0, 40)], ["Level", String(r.level || "-")], ["Rank", String(r.rank || r.ranking || "-").slice(0, 40)], ["Region", String(r.region || r.country || "-")], ["EXP", String(r.exp || r.exploit || "-")]]);
        return await sock.sendMessage(m.chat, { image: imgBuf, caption: card ? `${msg}\n\n${card}` : msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("ffstalk2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ffstalk2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
