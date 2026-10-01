// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBox } from "../../src/lib/rara-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "cheat",
  alias: ["cheat", "cheatrpg"],
  category: "owner",
  description: "Cheat RPG stats ke user (tambah exp, koin, gold, gems, diamonds, dll)",
  usage: ".cheat <type> <jumlah> @user",
  example: ".cheat exp 999999 @user",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

function formatNumber(num) {
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + "T";
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return (num || 0).toLocaleString("id-ID");
}

// Daftar currency/stats yang bisa di-cheat
const CHEAT_TYPES = {
  // Currency utama
  exp: { label: "EXP", icon: "⭐", type: "main" },
  koin: { label: "Koin", icon: "🪙", type: "main" },
  saldo: { label: "Saldo", icon: "💵", type: "main" },
  energi: { label: "Energi Bot", icon: "⚡", type: "main" },
  // RPG currency
  gold: { label: "Gold", icon: "💰", type: "rpg" },
  gems: { label: "Gems", icon: "💎", type: "rpg" },
  diamonds: { label: "Diamonds", icon: "♦️", type: "rpg" },
  tokens: { label: "Tokens", icon: "🎟️", type: "rpg" },
  // RPG vital
  hp: { label: "HP", icon: "❤️", type: "rpg" },
  mana: { label: "Mana", icon: "💧", type: "rpg" },
  energy: { label: "Energy", icon: "⚡", type: "rpg" },
  stamina: { label: "Stamina", icon: "🏃", type: "rpg" },
  // RPG combat
  atk: { label: "ATK", icon: "⚔️", type: "rpg" },
  def: { label: "DEF", icon: "🛡️", type: "rpg" },
  spd: { label: "SPD", icon: "💨", type: "rpg" },
  critrate: { label: "Crit Rate", icon: "🎯", type: "rpg", field: "critRate" },
  critdmg: { label: "Crit DMG", icon: "💥", type: "rpg", field: "critDmg" },
  evasion: { label: "Evasion", icon: "🌀", type: "rpg" },
  accuracy: { label: "Accuracy", icon: "🎯", type: "rpg" },
  lifesteal: { label: "Lifesteal", icon: "🧛", type: "rpg" },
  penetration: { label: "Penetration", icon: "🔱", type: "rpg" },
  // RPG luck
  luck: { label: "Luck", icon: "🍀", type: "rpg" },
  dropbonus: { label: "Drop Bonus", icon: "📦", type: "rpg", field: "dropBonus" },
  goldfind: { label: "Gold Find", icon: "💰", type: "rpg", field: "goldFind" },
  expbonus: { label: "EXP Bonus", icon: "🚄", type: "rpg", field: "expBonus" },
  // RPG records
  pvpwins: { label: "PvP Wins", icon: "⚔️", type: "rpg" },
  pvplosses: { label: "PvP Losses", icon: "💀", type: "rpg" },
  pvprating: { label: "PvP Rating", icon: "📊", type: "rpg", field: "pvpRating" },
  pvpstreak: { label: "PvP Streak", icon: "🔥", type: "rpg", field: "pvpStreak" },
  pvpbeststreak: { label: "PvP Best Streak", icon: "🏆", type: "rpg", field: "pvpBestStreak" },
  totalkills: { label: "Total Kills", icon: "💀", type: "rpg", field: "totalKills" },
  bosskills: { label: "Boss Kills", icon: "🐉", type: "rpg", field: "bossKills" },
  dungeonclears: { label: "Dungeon Clears", icon: "🏰", type: "rpg", field: "dungeonClears" },
  dailystreak: { label: "Daily Streak", icon: "📅", type: "rpg", field: "dailyStreak" },
  // RPG profession
  joblevel: { label: "Job Level", icon: "📈", type: "rpg", field: "jobLevel" },
  skillpoints: { label: "Skill Points", icon: "", type: "rpg", field: "skillPoints" },
  // RPG misc
  level: { label: "Level (direct)", icon: "📊", type: "rpg" },
  rebirth: { label: "Rebirth Count", icon: "🔄", type: "rpg", field: "rebirthCount" },
};

function extractTarget(m) {
  if (m.quoted) return m.quoted.sender;
  if (m.mentionedJid?.length) return m.mentionedJid[0];
  return null;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];

  // No args — show help
  if (args.length === 0) {
    return m.reply(raraBox("Cheat RPG", [
      "Owner only — tambah RPG stats langsung",
      "---",
      "Cara pakai:",
      ".cheatrpg <type> <jumlah> @user",
      ".cheatrpg <type> <jumlah> (ke diri sendiri)",
      "---",
      "Tersedia:",
      "exp — EXP | koin — Koin | saldo — Saldo",
      "energi — Energi Bot | gold — Gold RPG",
      "gems — Gems | diamonds — Diamonds",
      "tokens — Tokens | hp — HP | mana — Mana",
      "stamina — Stamina | atk — Attack | def — Defense",
      "spd — Speed | critrate — Crit Rate",
      "critdmg — Crit Damage | luck — Luck",
      "dailystreak — Daily Streak | level — Set Level",
      "---",
      "Jumlah bisa negatif untuk kurang",
      "Contoh: .cheatrpg exp 999999999 @user",
    ]));
  }

  const cheatType = args[0]?.toLowerCase();
  const numArg = args.find(a => !isNaN(a) && !a.startsWith("@"));
  const amount = parseInt(numArg) || 0;
  const targetJid = extractTarget(m) || m.sender;

  if (!cheatType || !CHEAT_TYPES[cheatType]) {
    return m.reply(raraBox("Cheat RPG", [
      "❌ Type: " + (cheatType || "kosong") + " tidak ditemukan",
      "---",
      "Ketik .cheatrpg untuk lihat daftar lengkap",
    ]));
  }

  if (amount === 0) {
    return m.reply(raraBox("Cheat RPG", [
      "❌ Jumlah harus lebih dari 0 (bisa negatif)",
      "---",
      "Contoh: .cheatrpg " + cheatType + " 999999 @user",
    ]));
  }

  const cfg = CHEAT_TYPES[cheatType];
  const field = cfg.field || cheatType;

  // Ensure user exists
  let user = db.getUser(targetJid);
  if (!user) {
    db.setUser(targetJid);
    user = db.getUser(targetJid);
  }
  if (!user.rpg) user.rpg = {};

  const oldValue = cfg.type === "main"
    ? (user[field] || 0)
    : (user.rpg[field] || 0);

  let newValue;

  if (cfg.type === "main") {
    // Main currency — use db methods where available
    if (field === "exp") {
      newValue = db.updateExp(targetJid, amount);
    } else if (field === "koin") {
      newValue = db.updateKoin(targetJid, amount);
    } else if (field === "saldo") {
      newValue = db.updateSaldo(targetJid, amount);
    } else if (field === "energi") {
      newValue = db.updateEnergi(targetJid, amount);
    } else {
      // Direct set for other main fields
      user[field] = Math.max(0, (user[field] || 0) + amount);
      db.setUser(targetJid, user);
      newValue = user[field];
    }
  } else {
    // RPG stat — direct add
    if (field === "level") {
      // Special: set level directly (not add)
      user.rpg.level = Math.max(1, amount);
      db.setUser(targetJid, user);
      newValue = user.rpg.level;
    } else {
      user.rpg[field] = Math.max(0, (user.rpg[field] || 0) + amount);
      db.setUser(targetJid, user);
      newValue = user.rpg[field];
    }
  }

  db.save();

  // Build report
  const targetPhone = targetJid.split("@")[0];
  const isAdd = amount > 0;
  const sign = isAdd ? "+" : "";

  const txt = raraBox("Cheat RPG", [
    "✅ Berhasil " + (isAdd ? "menambah" : "mengurangi") + " stats",
    "---",
    "Target: @" + targetPhone,
    "Type: " + cfg.label + " " + cfg.icon,
    "Jumlah: " + sign + formatNumber(amount),
    "---",
    "Sebelum: " + formatNumber(oldValue),
    "Sekarang: " + formatNumber(newValue),
    "Selisih: " + sign + formatNumber(amount),
    "---",
    "Cheated by: " + (config.owner?.name || "Owner"),
  ]);
  await sock.sendMessage(m.chat, { text: txt, mentions: [targetJid] }, { quoted: m });
}

export { pluginConfig as config, handler };
