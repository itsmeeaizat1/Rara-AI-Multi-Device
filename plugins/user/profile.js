// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getRole } from "./level.js";
import fs from "fs";
import { getDevice } from "nova";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "profileuser",
  alias: ["profileuser", "profil", "profileuser", "profuser", "userprofile", "myprofile", "prof"],
  category: "user",
  description: "Melihat profil user dengan RPG stats",
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

const EXP_PER_LEVEL = 10000;

function formatNumber(num) {
  return num?.toLocaleString("id-ID") || "0";
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

async function handler(m, { sock }) {
  const db = getDatabase();
  const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;

  const user = db.getUser(target) || db.setUser(target);

  const isLid = target.endsWith('@lid');
  const isGroup = target.endsWith('@g.us');

  const resolvedJid = isLid && sock.getJid ? sock.getJid(target) : target;
  const phone = resolvedJid.split('@')[0].split(':')[0];
  const deviceId = m.quoted?.key?.id?.split('/')[0] || m.key?.id?.split('/')[0] || (resolvedJid.match(/:(\d+)@/) || [])[1] || null;

  const safe = async (fn) => {
    try { return await fn(); } catch { return null; }
  };

  const [
    onWa,
    ppUrl,
    statusRes,
    bizProfile,
    catalogRes,
    collections,
    lidFromJid,
    contactQuery,
    deviceInfo,
  ] = await Promise.all([
    safe(() => sock.onWhatsApp(phone)),
    safe(() => sock.profilePictureUrl(resolvedJid, 'image')),
    safe(() => sock.fetchStatus(resolvedJid)),
    safe(() => sock.getBusinessProfile(resolvedJid)),
    safe(() => sock.getCatalog({ jid: resolvedJid, limit: 5 })),
    safe(() => sock.getCollections(resolvedJid, 5)),
    safe(() => sock.getLidFromJid(resolvedJid)),
    safe(() => sock.getContact(resolvedJid)),
    safe(() => getDevice(resolvedJid, sock)),
  ]);

  const exists = onWa?.[0]?.exists ?? false;
  const canonicalJid = onWa?.[0]?.jid || resolvedJid;
  const lid = m.key?.participant || lidFromJid || onWa?.[0]?.lid || null;
  const isBot = deviceInfo?.isBot || contactQuery?.isBot || false;
  const statusObj = Array.isArray(statusRes) ? statusRes[0] : statusRes;
  const status = statusObj?.status?.status || statusObj?.status || null;
  const statusTs = statusObj?.status?.setAt || statusObj?.setAt || null;

  const isBiz = !!bizProfile && Object.keys(bizProfile).length > 0;
  const products = catalogRes?.products?.length || 0;
  const collectionsCount = collections?.collections?.length || 0;

  const fmtDate = (ts) => {
    if (!ts) return null;
    const d = ts instanceof Date ? ts : new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1));
    return isNaN(d) ? null : d.toLocaleString('id-ID');
  };

  if (!user.rpg) user.rpg = {};
  const userExp = user.exp || 0;
  const userLevel = Math.floor(userExp / EXP_PER_LEVEL) + 1;
  user.rpg.level = userLevel;
  user.rpg.health = user.rpg.health || 100;
  user.rpg.maxHealth = 100 + (userLevel - 1) * 10;
  user.rpg.mana = user.rpg.mana || 100;
  user.rpg.maxMana = 100 + (userLevel - 1) * 5;
  user.rpg.stamina = user.rpg.stamina || 100;
  user.rpg.maxStamina = 100 + (userLevel - 1) * 5;

  const currentLevelExp = (userLevel - 1) * EXP_PER_LEVEL;
  const levelUpExp = userLevel * EXP_PER_LEVEL;
  const expInLevel = userExp - currentLevelExp;
  const expNeeded = levelUpExp - currentLevelExp;
  const role = getRole(userLevel);
  const isOwnerUser = config.isOwner(target);
  const isPremiumUser = config.isPremium(target);

  let ppMedia = null;
  try {
    const ppUrl = await sock.profilePictureUrl(target, "image");
    if (ppUrl) {
      ppMedia = { url: ppUrl };
    } else {
      throw new Error("No PP");
    }
  } catch {
    const fallbackUrl = config.assets["pp-kosong"];
    if (fallbackUrl) {
      ppMedia = { url: fallbackUrl };
    } else {
      ppMedia = { url: "https://i.imgur.com/TuItj4L.png" };
    }
  }

  let caption = `Halo kak @${phone}! 👋\n`;
  caption += `Ini adalah rincian lengkap dari profil, status, dan seluruh aset yang kakak miliki saat ini di dalam sistem bot:\n\n`;
  
  caption += `*〔 👤 INFORMASI PRIBADI 〕*\n`;
  caption += `- *ɴᴀᴍᴀ ᴀꜱʟɪ:* ${user.name || m.pushName || "User"}\n`;
  if (user.isRegistered) {
      caption += `- *ɴᴀᴍᴀ ᴅᴀꜰᴛᴀʀ:* ${user.regName} (${user.regAge} tahun, ${user.regGender})\n`;
  }
  caption += `- *Tag / Mention:* @${target.split("@")[0]}\n`;
  caption += `- *ꜱᴛᴀᴛᴜꜱ ᴀᴋᴜɴ:* ${isOwnerUser ? "👑 Owner" : isPremiumUser ? "💎 Premium" : "🆓 Free User"}\n`;
  if (user.isBanned) caption += `- *ʙᴀɴɴᴇᴅ:* 🚫 Ya (Tidak bisa akses fitur bot)\n`;
  caption += `- *ʟᴇᴠᴇʟ:* ${userLevel}\n`;
  caption += `- *ᴛᴏᴛᴀʟ ᴇxᴘ:* ${formatNumber(userExp)} XP\n`;
  caption += `- *ᴋᴏɪɴ:* 🪙 ${formatNumber(user.koin || 0)}\n`;
  if (user.rpg) {
    caption += `- *ɢᴏʟᴅ:* 💰 ${formatNumber(user.rpg.gold || 0)}\n`;
    caption += `- *ɢᴇᴍꜱ:* 💎 ${formatNumber(user.rpg.gems || 0)}\n`;
    caption += `- *ᴛᴏᴋᴇɴꜱ:* 🎟️ ${formatNumber(user.rpg.tokens || 0)}\n`;
    caption += `- *ᴇɴᴇʀɢʏ:* ⚡ ${formatNumber(user.rpg.energy || 0)}/${formatNumber(user.rpg.maxEnergy || 100)}\n`;
    caption += `- *ᴍᴀɴᴀ:* 💧 ${formatNumber(user.rpg.mana || 0)}/${formatNumber(user.rpg.maxMana || 50)}\n`;
    caption += `- *HP:* ❤️ ${formatNumber(user.rpg.hp || 0)}/${formatNumber(user.rpg.maxHp || 100)}\n`;
    caption += `- *ꜱᴛᴀᴍɪɴᴀ:* 🏃 ${formatNumber(user.rpg.stamina || 0)}/${formatNumber(user.rpg.maxStamina || 100)}\n`;
  }
  caption += `- *ꜱɪꜱᴀ ᴇɴᴇʀɢɪ ʙᴏᴛ:* ${isOwnerUser || isPremiumUser ? "∞ Unlimited" : (user.energi ?? 25)}\n`;
  if (user.registeredAt) {
      caption += `- *ᴛᴀɴɢɢᴀʟ ᴛᴇʀᴅᴀꜰᴛᴀʀ:* ${new Date(user.registeredAt).toLocaleDateString("id-ID")}\n`;
  }
  if (user.clanId) caption += `- *Klan / Guild:* ${user.clanId}\n`;
  if (user.rpg && user.rpg.spouse) {
      caption += `- *Pasangan (Spouse):* @${user.rpg.spouse.split("@")[0]}\n`;
  }

  caption += `\n*〔 ⚔️ RPG STATS 〕*\n`;
  caption += `- *Role / Pangkat:* ${role}\n`;
  caption += `- *ʟᴇᴠᴇʟ:* ${user.rpg.level}\n`;
  caption += `- *ᴛᴏᴛᴀʟ ᴇxᴘ:* ${formatNumber(userExp)} XP\n`;
  caption += `- *ᴘʀᴏɢʀᴇꜱꜱ:* ${getLevelBar(expInLevel, expNeeded)}\n  _${formatNumber(expInLevel)} / ${formatNumber(expNeeded)} XP_\n`;
  if (user.rpg) {
    caption += `\n*〔 ❤️ VITAL 〕*\n`;
    caption += `- *HP:* ${formatNumber(user.rpg.hp || 0)} / ${formatNumber(user.rpg.maxHp || 100)}\n`;
    caption += `- *ᴍᴀɴᴀ:* ${formatNumber(user.rpg.mana || 0)} / ${formatNumber(user.rpg.maxMana || 50)}\n`;
    caption += `- *ᴇɴᴇʀɢʏ:* ${formatNumber(user.rpg.energy || 0)} / ${formatNumber(user.rpg.maxEnergy || 100)}\n`;
    caption += `- *ꜱᴛᴀᴍɪɴᴀ:* ${formatNumber(user.rpg.stamina || 0)} / ${formatNumber(user.rpg.maxStamina || 100)}\n`;
    caption += `\n*〔 💪 COMBAT 〕*\n`;
    caption += `- *ᴀᴛᴋ:* ${formatNumber(user.rpg.atk || 10)}\n`;
    caption += `- *ᴅᴇꜰ:* ${formatNumber(user.rpg.def || 5)}\n`;
    caption += `- *ꜱᴘᴅ:* ${formatNumber(user.rpg.spd || 10)}\n`;
    caption += `- *ᴄʀɪᴛ ʀᴀᴛᴇ:* ${user.rpg.critRate || 5}%\n`;
    caption += `- *ᴄʀɪᴛ ᴅᴍɢ:* ${user.rpg.critDmg || 50}%\n`;
    caption += `- *ᴇᴠᴀꜱɪᴏɴ:* ${user.rpg.evasion || 3}%\n`;
    caption += `- *ᴀᴄᴄᴜʀᴀᴄʏ:* ${user.rpg.accuracy || 95}%\n`;
    caption += `- *ʟɪꜰᴇꜱᴛᴇᴀʟ:* ${user.rpg.lifesteal || 0}%\n`;
    caption += `- *ᴘᴇɴᴇᴛʀᴀᴛɪᴏɴ:* ${user.rpg.penetration || 0}%\n`;
    caption += `\n*〔 🎲 LUCK & BONUS 〕*\n`;
    caption += `- *ʟᴜᴄᴋ:* ${formatNumber(user.rpg.luck || 0)}\n`;
    caption += `- *ᴅʀᴏᴘ ʙᴏɴᴜꜱ:* ${user.rpg.dropBonus || 0}%\n`;
    caption += `- *ɢᴏʟᴅ ꜰɪɴᴅ:* ${user.rpg.goldFind || 0}%\n`;
    caption += `- *ᴇxᴘ ʙᴏɴᴜꜱ:* ${user.rpg.expBonus || 0}%\n`;
    caption += `\n*〔 🛡️ EQUIPMENT 〕*\n`;
    caption += `- *ᴡᴇᴀᴘᴏɴ:* ${user.rpg.equipWeapon ? user.rpg.equipWeapon.name + " +" + (user.rpg.equipWeapon.enchant || 0) : "Kosong"}\n`;
    caption += `- *ᴀʀᴍᴏʀ:* ${user.rpg.equipArmor ? user.rpg.equipArmor.name + " +" + (user.rpg.equipArmor.enchant || 0) : "Kosong"}\n`;
    caption += `- *ʜᴇʟᴍᴇᴛ:* ${user.rpg.equipHelmet ? user.rpg.equipHelmet.name + " +" + (user.rpg.equipHelmet.enchant || 0) : "Kosong"}\n`;
    caption += `- *ʙᴏᴏᴛꜱ:* ${user.rpg.equipBoots ? user.rpg.equipBoots.name + " +" + (user.rpg.equipBoots.enchant || 0) : "Kosong"}\n`;
    caption += `- *ᴀᴄᴄᴇꜱꜱᴏʀʏ:* ${user.rpg.equipAccessory ? user.rpg.equipAccessory.name + " +" + (user.rpg.equipAccessory.enchant || 0) : "Kosong"}\n`;
    caption += `- *ʀɪɴɢ:* ${user.rpg.equipRing ? user.rpg.equipRing.name + " +" + (user.rpg.equipRing.enchant || 0) : "Kosong"}\n`;
    caption += `- *ꜱʜɪᴇʟᴅ:* ${user.rpg.equipShield ? user.rpg.equipShield.name + " +" + (user.rpg.equipShield.enchant || 0) : "Kosong"}\n`;
    caption += `\n*〔 🎓 PROFESSION 〕*\n`;
    caption += `- *ᴊᴏʙ:* ${user.rpg.job || "novice"}\n`;
    caption += `- *ᴊᴏʙ ʟᴇᴠᴇʟ:* ${formatNumber(user.rpg.jobLevel || 1)}\n`;
    caption += `- *ꜱᴋɪʟʟ ᴘᴏɪɴᴛꜱ:* ${formatNumber(user.rpg.skillPoints || 0)}\n`;
    caption += `- *ꜱᴋɪʟʟꜱ:* ${formatNumber((user.rpg.skills || []).length)}\n`;
    caption += `\n*〔 🏆 RECORDS 〕*\n`;
    caption += `- *ᴘᴠᴘ:* ${formatNumber(user.rpg.pvpWins || 0)}W / ${formatNumber(user.rpg.pvpLosses || 0)}L\n`;
    caption += `- *ᴘᴠᴘ ʀᴀᴛɪɴɢ:* ${formatNumber(user.rpg.pvpRating || 1000)}\n`;
    caption += `- *ᴘᴠᴘ ꜱᴛʀᴇᴀᴋ:* ${formatNumber(user.rpg.pvpStreak || 0)} (Best: ${formatNumber(user.rpg.pvpBestStreak || 0)})\n`;
    caption += `- *ᴛᴏᴛᴀʟ ᴋɪʟʟꜱ:* ${formatNumber(user.rpg.totalKills || 0)}\n`;
    caption += `- *ʙᴏꜱꜱ ᴋɪʟʟꜱ:* ${formatNumber(user.rpg.bossKills || 0)}\n`;
    caption += `- *ᴅᴜɴɢᴇᴏɴ ᴄʟᴇᴀʀꜱ:* ${formatNumber(user.rpg.dungeonClears || 0)}\n`;
    caption += `\n*〔 🎯 MISC 〕*\n`;
    caption += `- *ᴅᴀɪʟʏ ꜱᴛʀᴇᴀᴋ:* ${formatNumber(user.rpg.dailyStreak || 0)} hari\n`;
    caption += `- *ᴀᴄʜɪᴇᴠᴇᴍᴇɴᴛꜱ:* ${formatNumber((user.rpg.achievements || []).length)} (Points: ${formatNumber(user.rpg.achievementPoints || 0)})\n`;
    caption += `- *ɪɴᴠᴇɴᴛᴏʀʏ:* ${formatNumber(Object.keys(user.rpg.inventory || {}).length)} jenis item\n`;
    if (user.rpg.rebirthCount) {
      caption += `- *ʀᴇʙɪʀᴛʜ:* ${formatNumber(user.rpg.rebirthCount)}x (Bonus: ${user.rpg.permBonus || 0}%)\n`;
    }
    if (user.rpg.title) {
      caption += `- *ᴛɪᴛʟᴇ:* ${user.rpg.title}\n`;
    }
  }

  caption += `\n*〔 💰 ASET & KEUANGAN 〕*\n`;
  caption += `- *ᴋᴏɪɴ:* 🪙 ${formatNumber(user.koin || 0)} _(Digunakan untuk fitur bot)_\n`;
  caption += `- *ꜱᴀʟᴅᴏ:* 💵 ${formatNumber(user.saldo || 0)}\n`;
  if (user.rpg) {
    caption += `- *ɢᴏʟᴅ ʀᴘɢ:* 💰 ${formatNumber(user.rpg.gold || 0)}\n`;
    caption += `- *ɢᴇᴍꜱ:* 💎 ${formatNumber(user.rpg.gems || 0)}\n`;
    caption += `- *ᴛᴏᴋᴇɴꜱ:* 🎟️ ${formatNumber(user.rpg.tokens || 0)}\n`;
  }
  caption += `- *ᴇɴᴇʀɢɪ ʙᴏᴛ:* ⚡ ${isOwnerUser || isPremiumUser ? "∞ Unlimited" : (user.energi ?? 25)}\n`;

  caption += `\n*〔 📱 WHATSAPP INFO 〕*\n`;
  caption += `- *ɴᴏᴍᴏʀ:* +${phone}\n`;
  caption += `- *ᴇᴋꜱɪꜱᴛᴇɴꜱɪ ᴡᴀ:* ${exists ? 'Ya' : 'Tidak'}\n`;
  caption += `- *ᴊɪᴅ:* ${canonicalJid}\n`;
  caption += `- *ʟɪᴅ:* ${lid || '-'}\n`;
  caption += `- *ᴛɪᴘᴇ:* ${isGroup ? 'Group' : (isLid ? 'LID' : 'S.WhatsApp.Net')}\n`;
  caption += `- *ʙᴏᴛ ᴡʜᴀᴛꜱᴀᴘᴘ:* ${isBot ? 'Ya' : 'Bukan'}\n`;
  caption += `- *ᴅᴇᴠɪᴄᴇ ɪᴅ:* ${deviceId || '-'}\n`;

  caption += `\n*〔 ℹ️ BIO & PROFILE 〕*\n`;
  caption += `- *ᴀᴠᴀᴛᴀʀ:* ${ppUrl ? 'Ada' : 'Tidak Ada'}\n`;
  caption += `- *ʙɪᴏ:* ${status || '-'}\n`;
  caption += `- *ʙɪᴏ ꜱᴇᴛ:* ${fmtDate(statusTs) || '-'}\n`;

  caption += `\n*〔 🏢 BUSINESS INFO 〕*\n`;
  caption += `- *ᴛɪᴘᴇ ᴀᴋᴜɴ:* ${isBiz ? 'WhatsApp Business' : 'WhatsApp Biasa'}\n`;
  if (isBiz) {
    caption += `- *ᴅᴇꜱᴋʀɪᴘꜱɪ:* ${bizProfile.description || '-'}\n`;
    caption += `- *ᴡᴇʙꜱɪᴛᴇ:* ${(bizProfile.website || []).join(', ') || '-'}\n`;
    caption += `- *ᴇᴍᴀɪʟ:* ${bizProfile.email || '-'}\n`;
    caption += `- *ᴀʟᴀᴍᴀᴛ:* ${bizProfile.address || '-'}\n`;
    caption += `- *ᴋᴀᴛᴇɢᴏʀɪ:* ${(bizProfile.categories || []).map(c => c.name || c).join(', ') || '-'}\n`;
    caption += `- *ᴠᴇʀɪꜰɪᴇᴅ:* ${bizProfile.isProfileLinked ? 'Ya' : 'Tidak'}\n`;
    
    if (products > 0 || collectionsCount > 0) {
      caption += `\n*〔 🛍️ CATALOG 〕*\n`;
      caption += `- *ᴛᴏᴛᴀʟ ᴘʀᴏᴅᴜᴋ:* ${products}\n`;
      caption += `- *ᴋᴏʟᴇᴋꜱɪ:* ${collectionsCount}\n`;
    }
  }

  caption += `\n*〔 🤖 BOT VIEWPOINT 〕*\n`;
  caption += `- *ʙᴏᴛ ᴊɪᴅ:* ${sock.user?.id || '-'}\n`;
  caption += `- *ʙᴏᴛ ᴘʟᴀᴛꜰᴏʀᴍ:* ${sock.authState?.creds?.platform || process.platform || '-'}\n`;
  caption += `- *ʀᴜɴᴛɪᴍᴇ:* Node ${process.version}\n`;

  if (user.inventory && Object.keys(user.inventory).length > 0) {
      const invItems = Object.entries(user.inventory).filter(([_, qty]) => qty > 0);
      if (invItems.length > 0) {
          caption += `\n*〔 🎒 ISI INVENTORY 〕*\n`;
          caption += `Barang-barang yang berhasil kakak kumpulkan:\n`;
          invItems.forEach(([item, qty]) => {
              caption += `- *${item.charAt(0).toUpperCase() + item.slice(1)}:* sejumlah ${qty} item\n`;
          });
      }
  }

  if (user.unlockedFeatures && user.unlockedFeatures.length > 0) {
      caption += `\n*〔 🔓 FITUR PREMIUM TERBUKA 〕*\n`;
      caption += `Fitur eksklusif yang sudah kakak beli secara permanen:\n`;
      user.unlockedFeatures.forEach(fitur => {
          caption += `- *${fitur}*\n`;
      });
  }

  const mentions = [target];
  if (user.rpg.spouse) mentions.push(user.rpg.spouse);

  const msgOptions = { caption, mentions };
  if (ppMedia) {
    msgOptions.image = ppMedia;
  }

  await sock.sendMessage(m.chat, msgOptions, { quoted: m });
}

export { pluginConfig as config, handler };
