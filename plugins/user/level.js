// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const EXP_PER_LEVEL = config.rpg?.EXP_PER_LEVEL || 10000;

const pluginConfig = {
  name: "level",
  alias: ["level"],
  category: "user",
  description: "Cek level user",
  usage: ".level [@user]",
  example: ".level",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function calculateLevel(exp) {
  return Math.floor(exp / EXP_PER_LEVEL) + 1;
}

function expForLevel(level) {
  return (level - 1) * EXP_PER_LEVEL;
}

function expToNextLevel(exp) {
  const currentLevel = calculateLevel(exp);
  const nextLevelExp = expForLevel(currentLevel + 1);
  return nextLevelExp - exp;
}

function getRole(level) {
  if (level >= 100) return "🐉 Mythic";
  if (level >= 80) return "⚔️ Legend";
  if (level >= 60) return "💜 Epic";
  if (level >= 40) return "💪 Grandmaster";
  if (level >= 20) return "🎖️ Master";
  if (level >= 10) return "⭐ Elite";
  return "🛡️ Warrior";
}

function getLevelBar(current, target) {
  const totalBars = 10;
  const filledBars = Math.min(
    Math.floor((current / target) * totalBars),
    totalBars,
  );
  const emptyBars = totalBars - filledBars;
  return "▰".repeat(filledBars) + "▱".repeat(emptyBars);
}

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return (num || 0).toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();

  let targetJid = m.sender;
  let targetName = m.pushName || "Kamu";

  if (m.quoted) {
    targetJid = m.quoted.sender;
    targetName = m.quoted.pushName || targetJid.split("@")[0];
  } else if (m.mentionedJid?.length) {
    targetJid = m.mentionedJid[0];
    targetName = targetJid.split("@")[0];
  }

  const user = db.getUser(targetJid) || db.setUser(targetJid);
  if (!user.rpg) user.rpg = {};

  const exp = user.exp || 0;
  const level = calculateLevel(exp);
  const role = getRole(level);
  const currentLevelExp = expForLevel(level);
  const nextLevelExp = expForLevel(level + 1);
  const expInLevel = exp - currentLevelExp;
  const expNeeded = nextLevelExp - currentLevelExp;
  const progress = getLevelBar(expInLevel, expNeeded);

  let txt = "╭──「 Level Info 」\n";
  txt += "│\n";
  txt += "│ 👤 User: *" + targetName + "*\n";
  txt += "│ 🆔 Tag: @" + targetJid.split("@")[0] + "\n";
  txt += "│\n";
  txt += "├──「 *Stats* 」\n";
  txt += "│ 📊 Level: *" + level + "*\n";
  txt += "│ 🎖️ Role: " + role + "\n";
  txt += "│ 🚄 Exp: *" + formatNumber(exp) + "*\n";
  txt += "│ 📊 Progress: " + progress + "\n";
  txt += "│ ↳ " + formatNumber(expInLevel) + " / " + formatNumber(expNeeded) + " XP\n";
  txt += "│\n";
  txt += "│ 💡 Next level: *" + formatNumber(expToNextLevel(exp)) + "* exp lagi!\n";
  txt += "╰──────────";

  await m.reply(txt, { mentions: [targetJid] });
}

export {
  pluginConfig as config,
  handler,
  calculateLevel,
  expForLevel,
  expToNextLevel,
  getRole,
};
