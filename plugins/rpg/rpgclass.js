// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgclass",
  aliases: ["rpgclass", "classselect", "pilihclass", "rpgjobclass"],
  category: "rpg",
  description: "Pilih class/kelas karakter RPG (Warrior, Mage, Archer, Assassin, Healer)",
  usage: ".rpgclass | .rpgclass <nama class>",
  example: ".rpgclass | .rpgclass warrior",
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 5,
}

const CLASSES = {
  warrior: {
    nama: "Warrior",
    emoji: "Sword",
    desc: "Tank dengan HP tinggi & DEF kuat",
    bonus: { hp: 50, atk: 5, def: 10 },
    skill: "Berserk (ATK +50% saat HP < 30%)",
    weakness: "Mage",
  },
  mage: {
    nama: "Mage",
    emoji: "Staff",
    desc: "ATK tinggi tapi HP rendah",
    bonus: { hp: -20, atk: 15, def: -3 },
    skill: "Fireball (ATK +30% ke boss)",
    weakness: "Archer",
  },
  archer: {
    nama: "Archer",
    emoji: "Bow",
    desc: "Seimbang, crit chance tinggi",
    bonus: { hp: 10, atk: 8, def: 3 },
    skill: "Precise Shot (crit 25% chance, 2x damage)",
    weakness: "Warrior",
  },
  assassin: {
    nama: "Assassin",
    emoji: "Dagger",
    desc: "ATK sangat tinggi, HP sangat rendah",
    bonus: { hp: -30, atk: 20, def: -5 },
    skill: "Backstab (ATK +40% saat serangan pertama)",
    weakness: "Warrior",
  },
  healer: {
    nama: "Healer",
    emoji: "Cross",
    desc: "HP tinggi, bisa heal di battle",
    bonus: { hp: 30, atk: 3, def: 8 },
    skill: "Divine Heal (restore 50% HP 1x per dungeon)",
    weakness: "Assassin",
  },
}

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("RPG Class", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    const input = (args[0] || "").toLowerCase().trim()

    if (!input || input === "list") {
      let lines = []
      lines.push("RPG Class System")
      lines.push("Pilih class untuk mendapat bonus stat & skill khusus")
      lines.push("")
      let i = 1
      for (const [key, cls] of Object.entries(CLASSES)) {
        lines.push(i + ". " + cls.nama + " - " + cls.desc)
        lines.push("   Bonus: HP " + (cls.bonus.hp > 0 ? "+" : "") + cls.bonus.hp + ", ATK " + (cls.bonus.atk > 0 ? "+" : "") + cls.bonus.atk + ", DEF " + (cls.bonus.def > 0 ? "+" : "") + cls.bonus.def)
        lines.push("   Skill: " + cls.skill)
        lines.push("   Counter: " + cls.weakness)
        lines.push("")
        i++
      }
      lines.push("Cara: " + usedPrefix + "rpgclass <nama>")
      lines.push("Contoh: " + usedPrefix + "rpgclass warrior")
      if (player.rpgClass) {
        lines.push("")
        lines.push("Class kamu sekarang: " + player.rpgClass)
      }
      return m.reply(claraWrap("RPG Class", lines.join("\n")))
    }

    if (!CLASSES[input]) {
      return m.reply(claraWrap("RPG Class", "Class tidak ditemukan: " + input + "\nKetik " + usedPrefix + "rpgclass list untuk lihat semua."))
    }

    const cls = CLASSES[input]

    if (player.rpgClass === cls.nama) {
      return m.reply(claraWrap("RPG Class", "Kamu sudah memilih class " + cls.nama + "."))
    }

    // Apply class bonus
    const newPlayer = {
      ...player,
      rpgClass: cls.nama,
      maxHp: 100 + cls.bonus.hp,
      hp: 100 + cls.bonus.hp,
      atk: 10 + cls.bonus.atk,
      def: 5 + cls.bonus.def,
    }

    savePlayer(m, newPlayer)

    return m.reply(claraWrap("RPG Class - " + cls.nama, [
      "Kamu memilih class: " + cls.nama,
      "",
      "Bonus stat diterapkan:",
      "HP: " + newPlayer.maxHp + " (sebelumnya 100)",
      "ATK: " + newPlayer.atk + " (sebelumnya 10)",
      "DEF: " + newPlayer.def + " (sebelumnya 5)",
      "",
      "Skill: " + cls.skill,
      "Counter: " + cls.weakness,
      "",
      "Ketik " + usedPrefix + "profile untuk lihat stat barumu.",
    ].join("\n")))
  } catch (e) {
    console.error("rpgclass error:", e.message)
    return m.reply(claraWrap("RPG Class", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
