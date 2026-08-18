// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgpetbattle",
  aliases: ["rpgpetbattle", "petduel", "petfight", "rpgpetduel"],
  category: "rpg",
  description: "Pet battle - adu peliharaan RPG dengan lawan acak atau tag teman",
  usage: ".rpgpetbattle | .rpgpetbattle @teman",
  example: ".rpgpetbattle | .rpgpetbattle @user",
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 5,
}

const WILD_PETS = [
  { name: "Slime", hp: 50, atk: 5, def: 2, exp: 20, gold: 30 },
  { name: "Wolf", hp: 80, atk: 12, def: 5, exp: 40, gold: 60 },
  { name: "Bear", hp: 120, atk: 15, def: 10, exp: 60, gold: 100 },
  { name: "Dragon Whelp", hp: 100, atk: 20, def: 8, exp: 80, gold: 150 },
  { name: "Demon", hp: 150, atk: 25, def: 12, exp: 100, gold: 200 },
  { name: "Phantom", hp: 90, atk: 22, def: 6, exp: 70, gold: 130 },
  { name: "Golem", hp: 200, atk: 10, def: 20, exp: 90, gold: 180 },
]

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("Pet Battle", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    // Check if player has a pet
    if (!player.pet || player.pet === "Tidak ada") {
      return m.reply(claraWrap("Pet Battle", [
        "Kamu belum punya pet!",
        "Ketik " + usedPrefix + "petshop untuk beli pet.",
        "Atau ketik " + usedPrefix + "pet untuk lihat pet kamu.",
      ].join("\n")))
    }

    // Check pet stats
    const petStats = player.petStats || { hp: 60, atk: 8, def: 3, level: 1, exp: 0 }
    if (petStats.hp <= 0) {
      return m.reply(claraWrap("Pet Battle", "HP pet kamu 0! Ketik " + usedPrefix + "heal untuk menyembuhkan dulu."))
    }

    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (mentioned) {
      // PvP pet battle
      const enemyPlayer = getPlayer({ key: { remoteJid: m.key.remoteJid, participant: mentioned }, pushName: mentioned.split("@")[0] })
      if (!enemyPlayer || !enemyPlayer.pet || enemyPlayer.pet === "Tidak ada") {
        return m.reply(claraWrap("Pet Battle", "Lawan tidak punya pet atau belum mulai RPG."))
      }

      const enemyPet = enemyPlayer.petStats || { hp: 60, atk: 8, def: 3, level: 1 }

      // Battle simulation
      let playerHp = petStats.hp
      let enemyHp = enemyPet.hp
      let log = []
      let round = 1

      while (playerHp > 0 && enemyHp > 0 && round <= 20) {
        const pDmg = Math.max(1, petStats.atk - Math.floor(enemyPet.def / 2))
        const eDmg = Math.max(1, enemyPet.atk - Math.floor(petStats.def / 2))

        enemyHp -= pDmg
        log.push("R" + round + ": " + player.pet + " serang " + pDmg + " dmg")
        if (enemyHp <= 0) break

        playerHp -= eDmg
        log.push("R" + round + ": " + enemyPlayer.pet + " serang " + eDmg + " dmg")
        round++
      }

      const playerWin = playerHp > enemyHp

      let lines = []
      lines.push("Pet Battle - PvP")
      lines.push("")
      lines.push(player.pet + " (Lv." + petStats.level + ") vs " + enemyPlayer.pet + " (Lv." + enemyPet.level + ")")
      lines.push("")
      lines.push(log.slice(0, 10).join("\n"))
      lines.push("")
      lines.push(playerWin ? "Menang! " + player.pet + " victorious!" : "Kalah! " + enemyPlayer.pet + " lebih kuat.")

      if (playerWin) {
        const expGain = 30 + enemyPet.level * 5
        const goldGain = 20 + enemyPet.level * 3
        const newPetExp = (petStats.exp || 0) + expGain
        const newPlayer = {
          ...player,
          gold: (player.gold || 0) + goldGain,
          petStats: { ...petStats, exp: newPetExp },
        }
        // Pet level up
        let petLevel = petStats.level || 1
        let petExp = newPetExp
        const petMaxExp = petLevel * 100
        if (petExp >= petMaxExp) {
          petLevel += 1
          petExp -= petMaxExp
          newPetExp
          newPlayer.petStats.level = petLevel
          newPlayer.petStats.exp = petExp
          newPlayer.petStats.maxHp = (petStats.maxHp || 60) + 20
          newPlayer.petStats.hp = newPlayer.petStats.maxHp
          newPlayer.petStats.atk = (petStats.atk || 8) + 3
          newPlayer.petStats.def = (petStats.def || 3) + 1
          lines.push("")
          lines.push("Pet level up! " + player.pet + " Lv." + petLevel)
        }
        savePlayer(m, newPlayer)
        lines.push("Reward: +" + goldGain + " gold, +" + expGain + " pet exp")
      } else {
        savePlayer(m, { ...player, petStats: { ...petStats, hp: Math.max(0, playerHp) } })
        lines.push("Pet HP tersisa: " + Math.max(0, playerHp))
      }

      return m.reply(claraWrap("Pet Battle", lines.join("\n")))
    }

    // PvE - fight wild pet
    const wild = WILD_PETS[Math.floor(Math.random() * WILD_PETS.length)]

    let playerHp = petStats.hp
    let enemyHp = wild.hp
    let log = []
    let round = 1

    while (playerHp > 0 && enemyHp > 0 && round <= 15) {
      const pDmg = Math.max(1, petStats.atk - Math.floor(wild.def / 2))
      const eDmg = Math.max(1, wild.atk - Math.floor(petStats.def / 2))

      enemyHp -= pDmg
      log.push("R" + round + ": " + player.pet + " serang " + pDmg + " dmg")
      if (enemyHp <= 0) break

      playerHp -= eDmg
      log.push("R" + round + ": " + wild.name + " serang " + eDmg + " dmg")
      round++
    }

    const playerWin = playerHp > enemyHp

    let lines = []
    lines.push("Pet Battle - Wild Encounter")
    lines.push("")
    lines.push(player.pet + " (Lv." + petStats.level + ") vs " + wild.name)
    lines.push("")
    lines.push(log.slice(0, 10).join("\n"))
    lines.push("")
    lines.push(playerWin ? "Menang! " + player.pet + " mengalahkan " + wild.name + "!" : "Kalah! " + wild.name + " terlalu kuat.")

    if (playerWin) {
      const expGain = wild.exp
      const goldGain = wild.gold
      const newPetExp = (petStats.exp || 0) + expGain
      const newPlayer = {
        ...player,
        gold: (player.gold || 0) + goldGain,
        petStats: { ...petStats, exp: newPetExp, hp: Math.max(1, playerHp) },
      }
      // Pet level up
      let petLevel = petStats.level || 1
      const petMaxExp = petLevel * 100
      if (newPetExp >= petMaxExp) {
        petLevel += 1
        const remainingExp = newPetExp - petMaxExp
        newPlayer.petStats.level = petLevel
        newPlayer.petStats.exp = remainingExp
        newPlayer.petStats.maxHp = (petStats.maxHp || 60) + 20
        newPlayer.petStats.hp = newPlayer.petStats.maxHp
        newPlayer.petStats.atk = (petStats.atk || 8) + 3
        newPlayer.petStats.def = (petStats.def || 3) + 1
        lines.push("")
        lines.push("Pet level up! " + player.pet + " Lv." + petLevel)
      }
      savePlayer(m, newPlayer)
      lines.push("Reward: +" + goldGain + " gold, +" + expGain + " pet exp")
    } else {
      savePlayer(m, { ...player, petStats: { ...petStats, hp: Math.max(0, playerHp) } })
      lines.push("Pet HP tersisa: " + Math.max(0, playerHp))
      lines.push("Ketik " + usedPrefix + "heal untuk menyembuhkan pet.")
    }

    return m.reply(claraWrap("Pet Battle", lines.join("\n")))
  } catch (e) {
    console.error("rpgpetbattle error:", e.message)
    return m.reply(claraWrap("Pet Battle", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
