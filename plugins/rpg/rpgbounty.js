// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer, addExp, addGold } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgbounty",
  aliases: ["rpgbounty", "bountyrpg", "rpgburuan", "rpgtarget"],
  category: "rpg",
  description: "Sistem bounty hunting - cari target penjahat & dapat hadiah besar",
  usage: ".rpgbounty | .rpgbounty <nomor> | .rpgbounty list",
  example: ".rpgbounty | .rpgbounty list | .rpgbounty 1",
  isGroup: true,
  isPrivate: false,
  cooldown: 20,
  energi: 8,
}

const BOUNTIES = [
  { no: 1, nama: "Pencuri Desa", hp: 50, atk: 8, def: 3, reward: { gold: 100, exp: 30 }, difficulty: "D", desc: "Mencuri ternak warga" },
  { no: 2, nama: "Bandit Jalan", hp: 80, atk: 12, def: 5, reward: { gold: 200, exp: 50 }, difficulty: "C", desc: "Merampok pedagang" },
  { no: 3, nama: "Penyamun Bersenjata", hp: 120, atk: 18, def: 8, reward: { gold: 400, exp: 80 }, difficulty: "C", desc: "Teror di jalanan" },
  { no: 4, nama: "Raja Bandit", hp: 200, atk: 25, def: 12, reward: { gold: 800, exp: 150 }, difficulty: "B", desc: "Pemimpin kelompok bandit" },
  { no: 5, nama: "Penyihir Jahat", hp: 150, atk: 30, def: 10, reward: { gold: 1000, exp: 200 }, difficulty: "B", desc: "Menyegel desa dengan sihir" },
  { no: 6, nama: "Raja Iblis Kecil", hp: 300, atk: 40, def: 15, reward: { gold: 2000, exp: 400 }, difficulty: "A", desc: "Memerintah iblis di hutan" },
  { no: 7, nama: "Naga Hitam", hp: 500, atk: 50, def: 25, reward: { gold: 5000, exp: 800 }, difficulty: "S", desc: "Ancaman dari gunung berapi" },
  { no: 8, nama: "Raja Iblis", hp: 1000, atk: 80, def: 40, reward: { gold: 15000, exp: 2000 }, difficulty: "SSS", desc: "Penguasa dunia kegelaran" },
]

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("RPG Bounty", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    const input = args[0] || ""

    if (!input || input === "list") {
      let lines = []
      lines.push("RPG Bounty Hunting")
      lines.push("Buru penjahat & dapat hadiah besar!")
      lines.push("")
      BOUNTIES.forEach(b => {
        lines.push(b.no + ". " + b.nama + " [" + b.difficulty + "]")
        lines.push("   " + b.desc)
        lines.push("   HP: " + b.hp + " ATK: " + b.atk + " DEF: " + b.def)
        lines.push("   Reward: " + b.reward.gold + " gold + " + b.reward.exp + " exp")
        lines.push("")
      })
      lines.push("Cara: " + usedPrefix + "rpgbounty <nomor>")
      lines.push("Contoh: " + usedPrefix + "rpgbounty 3")
      lines.push("")
      lines.push("Peringatan: Bounty tinggi = risiko kalah besar!")
      return m.reply(claraWrap("RPG Bounty", lines.join("\n")))
    }

    const num = parseInt(input)
    if (isNaN(num) || num < 1 || num > BOUNTIES.length) {
      return m.reply(claraWrap("RPG Bounty", "Nomor bounty tidak valid. Ketik " + usedPrefix + "rpgbounty list"))
    }

    const bounty = BOUNTIES[num - 1]

    // Check HP
    if ((player.hp || 100) <= 0) {
      return m.reply(claraWrap("RPG Bounty", "HP kamu 0! Ketik " + usedPrefix + "heal untuk sembuh dulu."))
    }

    // Battle simulation
    let playerHp = player.hp || 100
    const playerAtk = player.atk || 10
    const playerDef = player.def || 5
    let enemyHp = bounty.hp
    let log = []
    let round = 1

    while (playerHp > 0 && enemyHp > 0 && round <= 30) {
      const pDmg = Math.max(1, playerAtk - Math.floor(bounty.def / 2))
      const eDmg = Math.max(1, bounty.atk - Math.floor(playerDef / 2))

      enemyHp -= pDmg
      log.push("R" + round + ": Kamu serang " + pDmg + " dmg (musuh: " + Math.max(0, enemyHp) + " HP)")
      if (enemyHp <= 0) break

      playerHp -= eDmg
      log.push("R" + round + ": " + bounty.nama + " serang " + eDmg + " dmg (kamu: " + Math.max(0, playerHp) + " HP)")
      round++
    }

    const playerWin = playerHp > 0 && enemyHp <= 0

    let lines = []
    lines.push("Bounty: " + bounty.nama + " [" + bounty.difficulty + "]")
    lines.push("")
    lines.push(log.slice(0, 12).join("\n"))
    lines.push("")

    if (playerWin) {
      // Check for bonus based on player level vs difficulty
      const levelDiff = (player.level || 1) - ["E", "D", "C", "B", "A", "S", "SS", "SSS"].indexOf(bounty.difficulty) * 10
      const bonusMultiplier = levelDiff < 0 ? 1.5 : 1.0 // Underdog bonus

      const goldReward = Math.floor(bounty.reward.gold * bonusMultiplier)
      const expReward = Math.floor(bounty.reward.exp * bonusMultiplier)

      lines.push("Menang! " + bounty.nama + " berhasil dikalahkan!")
      lines.push("")
      lines.push("Reward: +" + goldReward + " gold, +" + expReward + " exp")
      if (bonusMultiplier > 1) lines.push("Underdog bonus: +50% (level lebih rendah dari target)")

      const newPlayer = { ...player, hp: Math.max(1, playerHp) }
      savePlayer(m, newPlayer)
      addGold(m, goldReward)
      addExp(m, expReward)
    } else {
      // Player lost
      const goldLost = Math.min(player.gold || 0, Math.floor(bounty.reward.gold * 0.1))
      const newPlayer = {
        ...player,
        hp: 0,
        gold: (player.gold || 0) - goldLost,
      }
      savePlayer(m, newPlayer)

      lines.push("Kalah! Kamu terluka parah oleh " + bounty.nama)
      lines.push("HP: 0, Gold hilang: " + goldLost)
      lines.push("Ketik " + usedPrefix + "heal untuk sembuh.")
    }

    return m.reply(claraWrap("RPG Bounty Result", lines.join("\n")))
  } catch (e) {
    console.error("rpgbounty error:", e.message)
    return m.reply(claraWrap("RPG Bounty", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
