// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getRole } from "./level.js";
import { getDevice } from "rara";

const pluginConfig = {
  name: "profileuser",
  alias: ["profileuser", "profile"],
  category: "user",
  description: "Melihat profil user dengan RPG stats lengkap",
  usage: ".profile [@user]",
  example: ".profile",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const EXP_PER_LEVEL = config.rpg?.EXP_PER_LEVEL || 10000;

function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + "T";
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString("id-ID");
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

// VARIASI POLOS BATCH 4 (13 Sep 2026): bar + persen buat stat apapun (HP/Mana/dll)
function statBar(cur, max) {
  const c = Number(cur) || 0;
  const mx = Number(max) || 1;
  const pct = Math.max(0, Math.min(100, Math.round((c / mx) * 100)));
  return getLevelBar(c, mx) + " " + pct + "%";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;

  // Ensure user exists with RPG defaults
  let user = db.getUser(target);
  if (!user) {
    db.setUser(target);
    user = db.getUser(target);
  }
  if (!user.rpg) user.rpg = {};

  // Sync level from exp
  const userExp = user.exp || 0;
  const userLevel = Math.floor(userExp / EXP_PER_LEVEL) + 1;
  user.rpg.level = userLevel;

  // Ensure combat stats exist
  if (!user.rpg.maxHp) user.rpg.maxHp = 100 + (userLevel - 1) * 10;
  if (!user.rpg.maxMana) user.rpg.maxMana = 50 + (userLevel - 1) * 5;
  if (!user.rpg.maxEnergy) user.rpg.maxEnergy = 100;
  if (!user.rpg.maxStamina) user.rpg.maxStamina = 100 + (userLevel - 1) * 5;

  const currentLevelExp = (userLevel - 1) * EXP_PER_LEVEL;
  const levelUpExp = userLevel * EXP_PER_LEVEL;
  const expInLevel = userExp - currentLevelExp;
  const expNeeded = levelUpExp - currentLevelExp;
  const role = getRole(userLevel);
  const isOwnerUser = config.isOwner(target);
  const isPremiumUser = config.isPremium(target);

  const isLid = target.endsWith('@lid');
  const isGroup = target.endsWith('@g.us');
  const resolvedJid = isLid && sock.getJid ? sock.getJid(target) : target;
  const phone = resolvedJid.split('@')[0].split(':')[0];

  // Get profile picture
  let ppMedia = null;
  try {
    const ppUrl = await sock.profilePictureUrl(target, "image");
    if (ppUrl) ppMedia = { url: ppUrl };
  } catch {
    const fallbackUrl = config.assets?.["pp-kosong"];
    ppMedia = fallbackUrl ? { url: fallbackUrl } : { url: "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name || phone) + "&background=random&size=256" };
  }

  let caption = "";

  // Personal Info
  caption += "「 Identitas 」\n";
  caption += "Nama: *" + (user.name || m.pushName || "User") + "*\n";
  if (user.isRegistered && user.regName) {
    caption += "Daftar: " + user.regName + " (" + (user.regAge || "?") + " thn, " + (user.regGender || "?") + ")\n";
  }
  caption += "Tag: @" + phone + "\n";
  caption += "Status: " + (isOwnerUser ? "Owner" : isPremiumUser ? "Premium" : "Free") + "\n";
  if (user.isBanned) caption += "Banned: Ya\n";
  caption += "\n";

  // Level & EXP
  caption += "「 Level & EXP 」\n";
  caption += "Level: *" + userLevel + "*\n";
  caption += "Role: " + role + "\n";
  caption += "Total EXP: *" + formatNumber(userExp) + "*\n";
  // FIX OWNER 2026-09-07: progress bar dikasih jarak baris kosong biar rapi
  const expPct = Math.min(100, Math.round((expInLevel / expNeeded) * 100));
  caption += "Progress:\n" + getLevelBar(expInLevel, expNeeded) + " " + expPct + "%\n\n";
  caption += "↳ " + formatNumber(expInLevel) + " / " + formatNumber(expNeeded) + " XP\n";
  // pelengkap (13 Sep 2026): nyambung fitur progres level aktivitas
  // — tiap command biasa +15 EXP, game/RPG +40 EXP
  const expLeft = Math.max(0, expNeeded - expInLevel);
  caption += "↳ Butuh *" + formatNumber(expLeft) + " XP* lagi ke Level " + (userLevel + 1) + "\n";
  caption += "↳ ≈ *" + Math.ceil(expLeft / 15) + "* command biasa / *" + Math.ceil(expLeft / 40) + "* game lagi 🎯\n";
  if (user.rpg.title) caption += "Title: " + user.rpg.title + "\n";
  caption += "\n";

  // Currencies
  caption += "「 Aset & Currency 」\n";
  caption += "Koin: " + formatNumber(user.koin || 0) + "\n";
  caption += "Saldo: " + formatNumber(user.saldo || 0) + "\n";
  caption += "Gold: " + formatNumber(user.rpg.gold || 0) + "\n";
  caption += "Gems: " + formatNumber(user.rpg.gems || 0) + "\n";
  caption += "Diamonds: " + formatNumber(user.rpg.diamonds || 0) + "\n";
  caption += "Tokens: " + formatNumber(user.rpg.tokens || 0) + "\n";
  caption += "Energi Bot: " + (isOwnerUser || isPremiumUser ? "∞ Unlimited" : (user.energi ?? 25)) + "\n";
  caption += "\n";

  // Vital Stats — masing-masing dikasih bar ▰▱ + persen (batch 4)
  const vHp = user.rpg.hp || user.rpg.health || 0, vMaxHp = user.rpg.maxHp || 100;
  const vMana = user.rpg.mana || 0, vMaxMana = user.rpg.maxMana || 50;
  const vEn = user.rpg.energy || 0, vMaxEn = user.rpg.maxEnergy || 100;
  const vSta = user.rpg.stamina || 0, vMaxSta = user.rpg.maxStamina || 100;
  caption += "「 Vital Stats 」\n";
  caption += "❤️ HP: " + formatNumber(vHp) + " / " + formatNumber(vMaxHp) + "\n";
  caption += "   " + statBar(vHp, vMaxHp) + "\n";
  caption += "🔮 Mana: " + formatNumber(vMana) + " / " + formatNumber(vMaxMana) + "\n";
  caption += "   " + statBar(vMana, vMaxMana) + "\n";
  caption += "⚡ Energy: " + formatNumber(vEn) + " / " + formatNumber(vMaxEn) + "\n";
  caption += "   " + statBar(vEn, vMaxEn) + "\n";
  caption += "🌀 Stamina: " + formatNumber(vSta) + " / " + formatNumber(vMaxSta) + "\n";
  caption += "   " + statBar(vSta, vMaxSta) + "\n";
  caption += "\n";

  // Combat Stats
  caption += "「 Combat 」\n";
  caption += "ATK: " + formatNumber(user.rpg.atk || 10) + "\n";
  caption += "DEF: " + formatNumber(user.rpg.def || 5) + "\n";
  caption += "SPD: " + formatNumber(user.rpg.spd || 10) + "\n";
  caption += "Crit Rate: " + (user.rpg.critRate || 5) + "%\n";
  caption += "Crit DMG: " + (user.rpg.critDmg || 50) + "%\n";
  caption += "Evasion: " + (user.rpg.evasion || 3) + "%\n";
  caption += "Accuracy: " + (user.rpg.accuracy || 95) + "%\n";
  caption += "Lifesteal: " + (user.rpg.lifesteal || 0) + "%\n";
  caption += "Penetration: " + (user.rpg.penetration || 0) + "%\n";
  caption += "\n";

  // Luck & Bonus
  caption += "「 Luck & Bonus 」\n";
  caption += "Luck: " + formatNumber(user.rpg.luck || 0) + "\n";
  caption += "Drop Bonus: " + (user.rpg.dropBonus || 0) + "%\n";
  caption += "Gold Find: " + (user.rpg.goldFind || 0) + "%\n";
  caption += "EXP Bonus: " + (user.rpg.expBonus || 0) + "%\n";
  caption += "\n";

  // Equipment
  caption += "「 Equipment 」\n";
  caption += "Weapon: " + (user.rpg.equipWeapon ? user.rpg.equipWeapon.name + " +" + (user.rpg.equipWeapon.enchant || 0) : "Kosong") + "\n";
  caption += "Armor: " + (user.rpg.equipArmor ? user.rpg.equipArmor.name + " +" + (user.rpg.equipArmor.enchant || 0) : "Kosong") + "\n";
  caption += "Helmet: " + (user.rpg.equipHelmet ? user.rpg.equipHelmet.name + " +" + (user.rpg.equipHelmet.enchant || 0) : "Kosong") + "\n";
  caption += "Boots: " + (user.rpg.equipBoots ? user.rpg.equipBoots.name + " +" + (user.rpg.equipBoots.enchant || 0) : "Kosong") + "\n";
  caption += "Accessory: " + (user.rpg.equipAccessory ? user.rpg.equipAccessory.name + " +" + (user.rpg.equipAccessory.enchant || 0) : "Kosong") + "\n";
  caption += "Ring: " + (user.rpg.equipRing ? user.rpg.equipRing.name + " +" + (user.rpg.equipRing.enchant || 0) : "Kosong") + "\n";
  caption += "Shield: " + (user.rpg.equipShield ? user.rpg.equipShield.name + " +" + (user.rpg.equipShield.enchant || 0) : "Kosong") + "\n";
  caption += "\n";

  // Profession
  caption += "「 Profession 」\n";
  caption += "Job: " + (user.rpg.job || "novice") + "\n";
  caption += "Job Level: " + formatNumber(user.rpg.jobLevel || 1) + "\n";
  caption += "Skill Points: " + formatNumber(user.rpg.skillPoints || 0) + "\n";
  caption += "Skills: " + (user.rpg.skills || []).length + "\n";
  caption += "\n";

  // Records
  caption += "「 Records 」\n";
  caption += "PvP: " + formatNumber(user.rpg.pvpWins || 0) + "W / " + formatNumber(user.rpg.pvpLosses || 0) + "L\n";
  caption += "PvP Rating: " + formatNumber(user.rpg.pvpRating || 1000) + "\n";
  caption += "PvP Streak: " + formatNumber(user.rpg.pvpStreak || 0) + " (Best: " + formatNumber(user.rpg.pvpBestStreak || 0) + ")\n";
  caption += "Total Kills: " + formatNumber(user.rpg.totalKills || 0) + "\n";
  caption += "Boss Kills: " + formatNumber(user.rpg.bossKills || 0) + "\n";
  caption += "Dungeon Clears: " + formatNumber(user.rpg.dungeonClears || 0) + "\n";
  caption += "\n";

  // Misc
  caption += "「 Misc 」\n";
  caption += "Daily Streak: " + formatNumber(user.rpg.dailyStreak || 0) + " hari\n";
  caption += "Achievements: " + (user.rpg.achievements || []).length + " (Points: " + formatNumber(user.rpg.achievementPoints || 0) + ")\n";
  caption += "Inventory: " + (user.inventory ? Object.keys(user.inventory).filter(k => user.inventory[k] > 0).length : 0) + " jenis item\n";
  if (user.rpg.rebirthCount) {
    caption += "Rebirth: " + formatNumber(user.rpg.rebirthCount) + "x (Bonus: " + (user.rpg.permBonus || 0) + "%)\n";
  }
  if (user.rpg.spouse) {
    caption += "Spouse: @" + user.rpg.spouse.split("@")[0] + "\n";
  }
  if (user.clanId) {
    caption += "Clan: " + user.clanId + "\n";
  }
  if (user.registeredAt) {
    caption += "Registered: " + new Date(user.registeredAt).toLocaleDateString("id-ID") + "\n";
  }
  caption += "\n";

  // Unlocked Features
  if (user.unlockedFeatures && user.unlockedFeatures.length > 0) {
    caption += "「 Fitur Premium 」\n";
    user.unlockedFeatures.forEach(fitur => {
      caption += fitur + "\n";
    });
    caption += "\n";
  }

  // Inventory items
  if (user.inventory && Object.keys(user.inventory).length > 0) {
    const invItems = Object.entries(user.inventory).filter(([_, qty]) => qty > 0);
    if (invItems.length > 0) {
      caption += "「 Inventory 」\n";
      invItems.forEach(([item, qty]) => {
        caption += item.charAt(0).toUpperCase() + item.slice(1) + ": " + qty + "\n";
      });
      caption += "\n";
    }
  }

  caption = caption.trim();

  const mentions = [target];
  if (user.rpg.spouse) mentions.push(user.rpg.spouse);

  const msgOptions = { caption, mentions };
  if (ppMedia) {
    msgOptions.image = ppMedia;
  }

  await sock.sendMessage(m.chat, msgOptions, { quoted: m });
}

export { pluginConfig as config, handler };
