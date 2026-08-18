// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgbestiary",
  aliases: ["rpgbestiary", "bestiary", "rpgcodex", "rpgencyclopedia"],
  category: "rpg",
  description: "Bestiary - ensiklopedia monster yang sudah dikalahkan + info kelemahan",
  usage: ".rpgbestiary | .rpgbestiary <nomor>",
  example: ".rpgbestiary | .rpgbestiary 1",
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
}

const MONSTERS = [
  { no: 1, nama: "Slime", grade: "D", hp: 50, atk: 5, def: 2, weakness: "Fire", drops: "Slime Gel (10 gold)", desc: "Monster dasar yang sering ditemui di hutan" },
  { no: 2, nama: "Wolf", grade: "D", hp: 80, atk: 12, def: 5, weakness: "Ice", drops: "Wolf Fang (20 gold), Wolf Pelt (30 gold)", desc: "Serigala liar yang berkeliaran di padang" },
  { no: 3, nama: "Goblin", grade: "C", hp: 60, atk: 10, def: 4, weakness: "Light", drops: "Goblin Ear (15 gold), Rusty Knife (25 gold)", desc: "Makhluk kecil cerdas yang suka menyerang berkelompok" },
  { no: 4, nama: "Orc", grade: "C", hp: 100, atk: 15, def: 8, weakness: "Fire", drops: "Orc Tusk (40 gold), Orc Armor (60 gold)", desc: "Pejuang buas dengan tubuh besar" },
  { no: 5, nama: "Bear", grade: "C", hp: 120, atk: 15, def: 10, weakness: "Lightning", drops: "Bear Claw (50 gold), Bear Pelt (80 gold)", desc: "Beruang besar di hutan dalam" },
  { no: 6, nama: "Skeleton", grade: "C", hp: 70, atk: 14, def: 6, weakness: "Holy", drops: "Bone (10 gold), Rusty Sword (40 gold)", desc: "Mayat hidup di dungeon gelap" },
  { no: 7, nama: "Bandit", grade: "C", hp: 80, atk: 12, def: 5, weakness: "None", drops: "Gold (50-200), Random Item", desc: "Perampok jalanan, bukan monster tapi musuh" },
  { no: 8, nama: "Golem", grade: "B", hp: 200, atk: 10, def: 20, weakness: "Lightning", drops: "Golem Core (200 gold), Stone (50 gold)", desc: "Monster batu raksasa, DEF sangat tinggi" },
  { no: 9, nama: "Wraith", grade: "B", hp: 90, atk: 22, def: 6, weakness: "Holy", drops: "Soul Shard (150 gold), Ectoplasm (100 gold)", desc: "Hantu pendendam dengan serangan spiritual" },
  { no: 10, nama: "Dragon Whelp", grade: "B", hp: 100, atk: 20, def: 8, weakness: "Ice", drops: "Dragon Scale (300 gold), Fire Gem (200 gold)", desc: "Bayi naga yang belum dewasa tapi berbahaya" },
  { no: 11, nama: "Demon", grade: "A", hp: 150, atk: 25, def: 12, weakness: "Holy", drops: "Demon Horn (500 gold), Dark Crystal (400 gold)", desc: "Iblis dari dunia kegelapan, serangan kuat" },
  { no: 12, nama: "Vampire", grade: "A", hp: 130, atk: 28, def: 10, weakness: "Holy, Fire", drops: "Vampire Fang (600 gold), Blood Vial (400 gold)", desc: "Pengisap darah yang bisa heal saat menyerang" },
  { no: 13, nama: "Lich", grade: "A", hp: 180, atk: 35, def: 15, weakness: "Holy, Fire", drops: "Lich Staff (800 gold), Soul Gem (600 gold)", desc: "Penyihir yang bangkit dari kematian" },
  { no: 14, nama: "Black Dragon", grade: "S", hp: 500, atk: 50, def: 25, weakness: "Ice, Holy", drops: "Dragon Heart (3000 gold), Black Scale (2000 gold)", desc: "Naga hitam legendaris dari gunung berapi" },
  { no: 15, nama: "Demon Lord", grade: "SSS", hp: 1000, atk: 80, def: 40, weakness: "Holy", drops: "Demon Crown (10000 gold), Abyss Crystal (5000 gold)", desc: "Raja iblis, penguasa kegelapan" },
]

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("Bestiary", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    // Track defeated monsters
    const bestiary = player.bestiary || {}

    const input = parseInt(args[0])

    if (!input || isNaN(input) || input < 1 || input > MONSTERS.length) {
      let lines = []
      lines.push("Bestiary - " + MONSTERS.length + " Monster")
      lines.push("Dikalahkan: " + Object.values(bestiary).filter(v => v > 0).length + "/" + MONSTERS.length)
      lines.push("")
      MONSTERS.forEach(mon => {
        const kills = bestiary[mon.nama] || 0
        const status = kills > 0 ? "Dikalahkan " + kills + "x" : "Belum ditemui"
        lines.push(mon.no + ". [" + mon.grade + "] " + mon.nama + " - " + status)
      })
      lines.push("")
      lines.push("Cara: " + usedPrefix + "rpgbestiary <nomor> untuk info detail")
      lines.push("Contoh: " + usedPrefix + "rpgbestiary 5")
      return m.reply(claraWrap("Bestiary", lines.join("\n")))
    }

    const mon = MONSTERS[input - 1]
    const kills = bestiary[mon.nama] || 0

    let lines = []
    lines.push("Bestiary - " + mon.nama)
    lines.push("")
    lines.push("Grade: " + mon.grade)
    lines.push("HP: " + mon.hp)
    lines.push("ATK: " + mon.atk)
    lines.push("DEF: " + mon.def)
    lines.push("Kelemahan: " + mon.weakness)
    lines.push("Drops: " + mon.drops)
    lines.push("")
    lines.push("Deskripsi:")
    lines.push(mon.desc)
    lines.push("")
    lines.push("Status: " + (kills > 0 ? "Dikalahkan " + kills + "x" : "Belum pernah dikalahkan"))

    return m.reply(claraWrap("Bestiary - " + mon.nama, lines.join("\n")))
  } catch (e) {
    console.error("rpgbestiary error:", e.message)
    return m.reply(claraWrap("Bestiary", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
