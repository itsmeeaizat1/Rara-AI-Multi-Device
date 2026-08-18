// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgmonthly",
  aliases: ["rpgmonthly", "monthlyrpg", "claimmonthly", "rpgrewardmonthly"],
  category: "rpg",
  description: "Claim reward bulanan RPG (gold, exp, item, berdasarkan level & streak)",
  usage: ".rpgmonthly | .rpgmonthly info",
  example: ".rpgmonthly | .rpgmonthly info",
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 10,
}

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function getMonthKey() {
  const now = new Date()
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")
}

function getMonthName() {
  return MONTH_NAMES[new Date().getMonth()]
}

function getDaysInMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("RPG Monthly", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    const input = (args[0] || "").toLowerCase().trim()
    const monthKey = getMonthKey()
    const monthName = getMonthName()
    const daysInMonth = getDaysInMonth()

    // Track monthly activity
    const monthlyData = player.monthlyData || {}
    const lastClaimed = monthlyData[monthKey]?.lastClaimed || null
    const monthlyStreak = monthlyData[monthKey]?.streak || 0
    const monthlyActivity = monthlyData[monthKey]?.activity || 0
    const claimedThisMonth = monthlyData[monthKey]?.claimed || false

    if (input === "info") {
      let lines = []
      lines.push("RPG Monthly Reward - " + monthName)
      lines.push("")
      lines.push("Status: " + (claimedThisMonth ? "Sudah claim" : "Belum claim"))
      lines.push("Aktivitas bulan ini: " + monthlyActivity + " aksi")
      lines.push("Streak bulanan: " + monthlyStreak + " bulan berturut")
      lines.push("")
      lines.push("Reward berdasarkan level:")
      lines.push("  Level 1-10: 500 gold + 100 exp")
      lines.push("  Level 11-25: 1000 gold + 250 exp + 1 item random")
      lines.push("  Level 26-50: 2000 gold + 500 exp + 2 item random")
      lines.push("  Level 51+: 5000 gold + 1000 exp + 3 item random")
      lines.push("")
      lines.push("Bonus streak: +10% per bulan berturut (max 50%)")
      lines.push("Bonus aktivitas: +50 gold per 10 aksi")
      lines.push("")
      lines.push("Reset setiap awal bulan. Claim sebelum bulan berganti!")
      return m.reply(claraWrap("RPG Monthly Info", lines.join("\n")))
    }

    if (claimedThisMonth) {
      return m.reply(claraWrap("RPG Monthly", [
        "Kamu sudah claim reward bulan " + monthName + ".",
        "Tunggu bulan depan untuk claim lagi.",
        "",
        "Ketik " + usedPrefix + "rpgmonthly info untuk cek progress.",
      ].join("\n")))
    }

    // Calculate reward based on level
    const level = player.level || 1
    let baseGold, baseExp, itemCount

    if (level <= 10) {
      baseGold = 500; baseExp = 100; itemCount = 0
    } else if (level <= 25) {
      baseGold = 1000; baseExp = 250; itemCount = 1
    } else if (level <= 50) {
      baseGold = 2000; baseExp = 500; itemCount = 2
    } else {
      baseGold = 5000; baseExp = 1000; itemCount = 3
    }

    // Streak bonus (10% per month, max 50%)
    const streakBonus = Math.min(monthlyStreak * 10, 50)
    const streakMultiplier = 1 + (streakBonus / 100)

    // Activity bonus (50 gold per 10 activity)
    const activityBonus = Math.floor(monthlyActivity / 10) * 50

    const finalGold = Math.floor(baseGold * streakMultiplier) + activityBonus
    const finalExp = Math.floor(baseExp * streakMultiplier)

    // Apply rewards
    const newPlayer = {
      ...player,
      gold: (player.gold || 0) + finalGold,
      exp: (player.exp || 0) + finalExp,
    }

    // Level up check
    let maxExp = player.maxExp || 100
    while (newPlayer.exp >= maxExp) {
      newPlayer.exp -= maxExp
      newPlayer.level = (newPlayer.level || 1) + 1
      newPlayer.atk = (newPlayer.atk || 10) + 2
      newPlayer.def = (newPlayer.def || 5) + 1
      newPlayer.maxHp = (newPlayer.maxHp || 100) + 20
      newPlayer.hp = newPlayer.maxHp
      maxExp = Math.floor(maxExp * 1.25)
      newPlayer.maxExp = maxExp
    }

    // Mark as claimed and update streak
    const newMonthlyData = { ...monthlyData }
    newMonthlyData[monthKey] = {
      claimed: true,
      lastClaimed: Date.now(),
      streak: monthlyStreak + 1,
      activity: monthlyActivity,
    }

    newPlayer.monthlyData = newMonthlyData

    savePlayer(m, newPlayer)

    let lines = []
    lines.push("Monthly Reward - " + monthName)
    lines.push("")
    lines.push("Reward diterima:")
    lines.push("  Gold: +" + finalGold + (streakBonus > 0 ? " (streak bonus +" + streakBonus + "%)" : ""))
    lines.push("  Exp: +" + finalExp)
    if (activityBonus > 0) lines.push("  Activity bonus: +" + activityBonus + " gold")
    if (itemCount > 0) lines.push("  Item random: " + itemCount + "x (akan datang di update selanjutnya)")
    lines.push("")
    lines.push("Level: " + newPlayer.level + " | Gold: " + newPlayer.gold)
    lines.push("Streak: " + (monthlyStreak + 1) + " bulan berturut")
    lines.push("")
    lines.push("Claim lagi bulan depan!")

    return m.reply(claraWrap("RPG Monthly Claimed", lines.join("\n")))
  } catch (e) {
    console.error("rpgmonthly error:", e.message)
    return m.reply(claraWrap("RPG Monthly", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
