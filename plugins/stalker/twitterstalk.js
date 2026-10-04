// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
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
  name: "twitterstalk",
  alias: ["twitterstalk", "twstalk", "xstalk"],
  category: "stalker",
  description: "Stalk profil Twitter/X by username",
  usage: ".twitterstalk <username>",
  example: ".twitterstalk elonmusk",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

function shortNum(num) {
  num = Number(num) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

async function handler(m, { sock }) {
  const username = m.args[0]?.replace("@", "")?.trim();
  if (!username) {
    return m.reply(raraWrap("Twitter Stalk", `Masukkan username Twitter/X.\n\nContoh: ${m.prefix}twitterstalk elonmusk`));
  }
  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/twitterstalk?username=${encodeURIComponent(username)}`,
      { timeout: 30000 }
    );
    if (!res.data?.status || !res.data?.data) {
      return m.reply(raraWrap("Twitter Stalk", `Akun @${username} tidak ditemukan.`));
    }

    const d = res.data.data;
    let lines = `Nama: ${d.name || d.fullName || "-"}\n`;
    lines += `Username: @${d.username || username}\n`;
    if (d.bio || d.description) lines += `Bio: ${d.bio || d.description}\n`;
    if (d.followers !== undefined) lines += `Followers: ${shortNum(d.followers)}\n`;
    if (d.following !== undefined) lines += `Following: ${shortNum(d.following)}\n`;
    if (d.tweets !== undefined || d.statuses_count !== undefined)
      lines += `Tweets: ${shortNum(d.tweets || d.statuses_count)}\n`;
    if (d.verified) lines += `Verified: ✅\n`;
    if (d.createdAt || d.created_at) lines += `Joined: ${d.createdAt || d.created_at}\n`;

    if (d.profilePicture || d.avatar) {
      try {
        const ppRes = await axios.get(d.profilePicture || d.avatar, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        const ppBuf = Buffer.from(ppRes.data);
        const caption = raraWrap("Twitter Stalk", lines);
        const card = await dlCard("gambar", { buffer: ppBuf }, [["Engine", "API siputzx.my.id"], ["Target", "@" + (d.username || username)], ["Judul", String(d.name || d.fullName || "-").slice(0, 40)], ["Followers", String(d.followers ?? "-")], ["Following", String(d.following ?? "-")], ["Tweets", String(d.tweets ?? d.statuses_count ?? "-")], ["Verified", d.verified === undefined ? "-" : d.verified ? "Ya" : "Tidak"]]);
        await sock.sendMessage(m.chat, { image: ppBuf, caption: card ? `${caption}\n\n${card}` : caption }, { quoted: m });
        return;
      } catch {
        lines += `\n_PP gagal dimuat_`;
      }
    }
    lines += `\n_Link: https://x.com/${d.username || username}_`;
    await m.reply(raraWrap("Twitter Stalk", lines));
  } catch (err) {
    console.error("[TwitterStalk] Error:", err.message);
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
