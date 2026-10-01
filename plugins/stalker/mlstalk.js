// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mlstalk.js — Mobile Legends Stalker (velyn.mom API)
import axios from "axios";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

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
      return m.reply(novaWrap("mlstalk", `Masukkan Player ID Mobile Legends.\n\nContoh: ${m.prefix}mlstalk 123456789 2001`, "guide"));
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
      return m.reply(novaWrap("mlstalk", `Player ID "${playerId}" tidak ditemukan.`, "error"));
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
        return await sock.sendMessage(m.chat, { image: Buffer.from(imgRes.data), caption: msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("mlstalk error:", err);
    await m.react("❌");
    return m.reply(novaWrap("mlstalk", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
