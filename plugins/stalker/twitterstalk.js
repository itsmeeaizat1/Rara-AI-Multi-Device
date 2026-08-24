// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "twitterstalk",
  alias: ["twstalk", "xstalk", "twitterstalker"],
  category: "stalker",
  description: "Stalk akun Twitter/X",
  usage: ".twitterstalk <username>",
  example: ".twitterstalk elonmusk",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function shortNum(num) {
  if (!num) return "0";
  num = parseInt(num);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(".0", "") + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

async function handler(m, { sock }) {
  const username = m.args[0]?.replace("@", "")?.trim();

  if (!username) {
    return m.reply( `🐦 *Twitter/X Stalker*\n\nMasukkan username Twitter/X\n\nContoh: \`${m.prefix}twitterstalk elonmusk\``, "twitterstalk");
  }

  await m.react("🕒");

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/twitterstalk?username=${encodeURIComponent(username)}`,
      { timeout: 30000 }
    );

    if (!res.data?.status || !res.data?.data) {
      return m.reply( `❌ Akun @${username} tidak ditemukan.`, "twitterstalk");
    }

    const d = res.data.data;
    let text = "🐦 *TWITTER/X STALK*\n\n";
    text += `*Nama:* ${d.name || d.fullName || "-"}\n`;
    text += `*Username:* @${d.username || username}\n`;
    if (d.bio || d.description) text += `*Bio:* ${d.bio || d.description}\n`;
    if (d.followers !== undefined) text += `*Followers:* ${shortNum(d.followers)}\n`;
    if (d.following !== undefined) text += `*Following:* ${shortNum(d.following)}\n`;
    if (d.tweets !== undefined || d.statuses_count !== undefined)
      text += `*Tweets:* ${shortNum(d.tweets || d.statuses_count)}\n`;
    if (d.verified) text += `*Verified:* ✅\n`;
    if (d.createdAt || d.created_at) text += `*Joined:* ${d.createdAt || d.created_at}\n`;
    if (d.profilePicture || d.avatar) {
      try {
        const ppRes = await axios.get(d.profilePicture || d.avatar, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        const ppBuf = Buffer.from(ppRes.data);
        await sock.sendMessage(m.chat, { image: ppBuf, caption: text }, { quoted: m });
        await m.react("🐣");
        return;
      } catch {
        text += `\n_PP gagal dimuat_`;
      }
    }
    text += `\n_Link: https://x.com/${d.username || username}_`;
    await m.reply( text, "twitterstalk");
    await m.react("🐣");
  } catch (err) {
    console.error("[TwitterStalk] Error:", err.message);
    await m.react("❌");
    return m.reply( te(m.prefix, m.command, m.pushName), "twitterstalk");
  }
}

export { pluginConfig as config, handler };
