// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Soulmatch (Cek compatibility berdasarkan RPG stats)

import { getRpgData } from "../../src/lib/nova-rpg-service.js";
import { getCintaData } from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "soulmatematch",
  alias: ["soulmatematch"],
  category: "rpg",
  description: "Cek soul score / compatibility berdasarkan RPG stats",
  usage: ".soulmatematch @tag",
  example: ".soulmatematch @628xxx",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 8,
  energi: 0,
  isEnabled: true,
};

const TIERS = [
  { min: 90, emoji: "👑", label: "Soulmate", note: "Kalo ini bukan jodoh, apalagi yang lain" },
  { min: 75, emoji: "💘", label: "High Match", note: "Beda tapi saling melengkapi" },
  { min: 60, emoji: "❤️", label: "Cocok", note: "Ada chemistry, cuma butuh usaha" },
  { min: 45, emoji: "🫠", label: "Biasa", note: "Bisa, tapi agak nggak nyambung" },
  { min: 0, emoji: "💔", label: "Friendzone", note: "Mending jadian temen dulu" },
];

const FACTS = [
  "Kalian beda warna favorit, tapi suka film yang sama",
  "Sama-sama introvert di luar, tapi suka ngobrol sampai pagi",
  "Kemungkinan besar kalian pernah liat story sama tanpa ketemu",
  "Salah satunya biasanya yang duluan chat duluan",
  "Kalo ketemu di dunia nyata, kemungkinan awkward dulu",
  "Kemungkinan chatnya panjang kalau topiknya keluar",
  "Kalian punya taste musik yang mirip walau nggak nyangka",
];

function hashScore(a, b) {
  const str = [a, b].sort().join("|");
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(((h % 61) + 40));
}

function getTier(score) {
  for (const t of TIERS) {
    if (score >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handler(m, { sock }) {
  try {
    let targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
    if (!targetJid) {
      return m.reply(
        `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `│ ❏ \`${m.prefix}soulmatematch @tag\`\n\n` +
        `╰──────────❀`
      );
    }

    if (targetJid === m.sender) {
      return m.reply(
        `╭──「 *sᴏᴜʟᴍᴀᴛᴄʜ* 」\n\n」` +
        `│ ❏ 😅 Cek compatibility sama diri sendiri? 100% narcisist!\n\n` +
        `╰──────────❀`
      );
    }

    const myRpg = getRpgData(m);
    const targetRpg = getRpgData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    const myName = myRpg.name || m.pushName || m.sender.split("@")[0];
    const targetName = targetRpg.name || targetJid.split("@")[0];

    // Base score dari hash
    let score = hashScore(m.sender, targetJid);

    // Modifikasi berdasarkan RPG stats
    const levelDiff = Math.abs((myRpg.level || 1) - (targetRpg.level || 1));
    if (levelDiff <= 3) score += 5;  // Level dekat = lebih cocok
    else if (levelDiff > 15) score -= 5;

    // Job compatibility
    const myJob = myRpg.job || "novice";
    const targetJob = targetRpg.job || "novice";
    const jobPairs = [
      ["warrior", "mage"], ["archer", "warrior"], ["mage", "archer"],
    ];
    for (const [j1, j2] of jobPairs) {
      if ((myJob === j1 && targetJob === j2) || (myJob === j2 && targetJob === j1)) {
        score += 8;
        break;
      }
    }

    // Sudah couple? Bonus
    const myCinta = getCintaData(m);
    if (myCinta.spouse === targetJid) {
      score = Math.min(100, score + 15);
    }

    score = Math.max(0, Math.min(100, score));
    const tier = getTier(score);
    const fact = pick(FACTS);

    let msg = `╭──「 *sᴏᴜʟᴍᴀᴛᴄʜ* 」\n\n」`;
    msg += `│ ❏ 👤 ${myName} ❤️ ${targetName}\n\n`;
    msg += `│ ❏ ${tier.emoji} Score: *${score}/100*\n`;
    msg += `│ ❏ 📊 Tier: *${tier.label}*\n`;
    msg += `│ ❏ 💬 "${tier.note}"\n\n`;
    msg += `  🔮 *Soul Insight:*\n`;
    msg += `│ ❏ "${fact}"\n`;

    // RPG stats comparison
    msg += `\n  ⚔️ *RPG Comparison:*\n`;
    msg += `│ ❏ ⭐ Level: *${myRpg.level || 1}* vs *${targetRpg.level || 1}*\n`;
    msg += `│ ❏ 💼 Job: *${myJob}* vs *${targetJob}*\n`;

    if (myCinta.spouse === targetJid) {
      msg += `\n  💕 *Bonus +15* karena sudah berpacaran!\n`;
      msg += `│ ❏ Affection: *${myCinta.affection || 0}*\n`;
    }

    msg += `\n╰──────────❀`;

    await m.reply(msg);
    await m.react(tier.emoji);
  } catch (e) {
    console.error("[soulmatematch] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
