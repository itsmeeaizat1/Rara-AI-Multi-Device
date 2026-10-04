// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// mlstalk.js — Mobile Legends Stalker (velyn.mom API)
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
  name: "mlstalk",
  alias: ["mlstalk", "mlstalker", "mlbbstalk", "mobilelegendsstalk"],
  category: "stalker",
  description: "Stalk Mobile Legends account (velyn.mom API)",
  usage: ".mlstalk <player ID> <server ID>",
  example: ".mlstalk 123456789 2001",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = m.args.join(" ").trim().split(/\s+/);
    const playerId = args[0];
    const serverId = args[1] || "";

    if (!playerId || !/^\d+$/.test(playerId)) {
      return m.reply(raraWrap("mlstalk", `Masukkan Player ID Mobile Legends.\n\nContoh: ${m.prefix}mlstalk 123456789 2001`, "guide"));
    }

    await m.react("🕒");

    let apiUrl = `https://velyn.mom/api/stalker/mobile-legends?id=${encodeURIComponent(playerId)}`;
    if (serverId) apiUrl += `&server=${encodeURIComponent(serverId)}`;

    const { data } = await axios.get(apiUrl, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      // Fallback: nexray
      try {
        const { data: data2 } = await axios.get(`https://api.nexray.web.id/stalker/mobile-legends?id=${encodeURIComponent(playerId)}&server=${encodeURIComponent(serverId)}`, {
          timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (data2 && (data2.result || data2.data)) {
          data.result = data2.result || data2.data;
        }
      } catch {}
    }

    if (!data || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(raraWrap("mlstalk", `Player ID "${playerId}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = "";
    msg += `ID: *${playerId}*\n`;
    if (serverId) msg += `Server: *${serverId}*\n`;
    if (r.username || r.name || r.nick) msg += `Username: *${r.username || r.name || r.nick}*\n`;
    if (r.level) msg += `Level: *${r.level}*\n`;
    if (r.rank || r.tier) msg += `Rank: *${r.rank || r.tier}*\n`;
    if (r.region || r.country) msg += `Region: *${r.region || r.country}*\n`;
    if (r.battle_points || r.bp) msg += `BP: *${(r.battle_points || r.bp).toLocaleString()}*\n`;
    if (r.diamonds || r.diamond) msg += `Diamonds: *${(r.diamonds || r.diamond).toLocaleString()}*\n`;
    if (r.stars) msg += `Stars: *${r.stars}*\n`;
    if (r.win_rate || r.winRate) msg += `Win Rate: *${r.win_rate || r.winRate}%*\n`;
    if (r.url || r.profile) msg += `Profile: ${r.url || r.profile}\n`;
    
    const avatarUrl = r.avatar || r.profile_picture || r.icon;
    if (avatarUrl && avatarUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        const imgBuf = Buffer.from(imgRes.data);
        const card = await dlCard("gambar", { buffer: imgBuf }, [["Engine", "API velyn.mom"], ["Target", "ID " + playerId], ["Judul", String(r.username || r.name || r.nick || "-").slice(0, 40)], ["Level", String(r.level || "-")], ["Rank", String(r.rank || r.tier || "-").slice(0, 40)], ["Win Rate", String(r.win_rate || r.winRate || "-")], ["Diamonds", String(r.diamonds || r.diamond || "-")]]);
        return await sock.sendMessage(m.chat, { image: imgBuf, caption: card ? `${msg}\n\n${card}` : msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("mlstalk error:", err);
    await m.react("❌");
    return m.reply(raraWrap("mlstalk", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
