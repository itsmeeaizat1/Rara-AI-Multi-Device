// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import { ensurePlayer, getPlayer, savePlayer } from '../../src/lib/nova-rpg-service.js'

const pluginConfig = {
  name: "rpgtitle",
  aliases: ["rpgtitle", "rpgequip", "rpgsettitle", "rpgjudul"],
  category: "rpg",
  description: "Sistem title/judul RPG - kumpulkan & pakai title untuk bonus stat",
  usage: ".rpgtitle | .rpgtitle <nomor> | .rpgtitle equip <nomor>",
  example: ".rpgtitle | .rpgtitle equip 1",
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
}

const TITLES = [
  { no: 1, nama: "Newbie", desc: "Pemula baru bergabung", bonus: { atk: 0, def: 0, hp: 0 }, syarat: "Level 1", warna: "Abu-abu" },
  { no: 2, nama: "Pemburu Pemula", desc: "Berburu pertama kali", bonus: { atk: 2, def: 0, hp: 10 }, syarat: "Menang 5x battle", warna: "Hijau" },
  { no: 3, nama: "Petualang", desc: "Penjelajah yang ulet", bonus: { atk: 3, def: 1, hp: 20 }, syarat: "Level 10+", warna: "Hijau" },
  { no: 4, nama: "Ksatria", desc: "Pejuang terhormat", bonus: { atk: 5, def: 3, hp: 30 }, syarat: "Level 20+", warna: "Biru" },
  { no: 5, nama: "Pemburu Bayaran", desc: "Penakluk bounty", bonus: { atk: 7, def: 2, hp: 25 }, syarat: "Menang 3x bounty", warna: "Biru" },
  { no: 6, nama: "Pet Master", desc: "Trainer pet hebat", bonus: { atk: 4, def: 4, hp: 40 }, syarat: "Pet Level 10+", warna: "Ungu" },
  { no: 7, nama: "Penyihir", desc: "Penguasa sihir", bonus: { atk: 10, def: 0, hp: 20 }, syarat: "Level 30+", warna: "Ungu" },
  { no: 8, nama: "Champion", desc: "Juara arena", bonus: { atk: 10, def: 5, hp: 50 }, syarat: "Menang 10x duel", warna: "Emas" },
  { no: 9, nama: "Dragon Slayer", desc: "Pembunuh naga", bonus: { atk: 15, def: 5, hp: 60 }, syarat: "Kalahkan Dragon (bounty 7)", warna: "Emas" },
  { no: 10, nama: "Legend", desc: "Legend yang tak terlupakan", bonus: { atk: 20, def: 10, hp: 100 }, syarat: "Level 50+", warna: "Pelangi" },
]

async function handler(m, { conn, text, args, usedPrefix, command, config: botConfig }) {
  try {
    const player = ensurePlayer(m, m.pushName || "Player")
    if (!player) return m.reply(claraWrap("RPG Title", "Kamu belum mulai RPG. Ketik " + usedPrefix + "rpg untuk mulai."))

    const titles = player.titles || ["Newbie"]
    const activeTitle = player.activeTitle || "Newbie"

    const input = (args[0] || "").toLowerCase().trim()

    if (input === "equip" || input === "pakai") {
      const num = parseInt(args[1] || "0")
      if (isNaN(num) || num < 1 || num > TITLES.length) {
        return m.reply(claraWrap("RPG Title", "Nomor title tidak valid. Ketik " + usedPrefix + "rpgtitle untuk lihat list."))
      }

      const title = TITLES[num - 1]
      if (!titles.includes(title.nama)) {
        return m.reply(claraWrap("RPG Title", "Kamu belum punya title: " + title.nama + "\nSyarat: " + title.syarat))
      }

      // Remove bonus from old title, apply new
      const oldTitle = TITLES.find(t => t.nama === activeTitle) || TITLES[0]
      const newPlayer = {
        ...player,
        activeTitle: title.nama,
        atk: (player.atk || 10) - (oldTitle.bonus.atk || 0) + title.bonus.atk,
        def: (player.def || 5) - (oldTitle.bonus.def || 0) + title.bonus.def,
        maxHp: (player.maxHp || 100) - (oldTitle.bonus.hp || 0) + title.bonus.hp,
      }
      newPlayer.hp = Math.min(newPlayer.hp, newPlayer.maxHp)
      savePlayer(m, newPlayer)

      return m.reply(claraWrap("RPG Title", [
        "Title aktif: " + title.nama,
        "",
        "Bonus:",
        "  ATK: +" + title.bonus.atk,
        "  DEF: +" + title.bonus.def,
        "  HP: +" + title.bonus.hp,
        "",
        "Stat sekarang:",
        "  ATK: " + newPlayer.atk,
        "  DEF: " + newPlayer.def,
        "  MaxHP: " + newPlayer.maxHp,
      ].join("\n")))
    }

    // Show title list
    let lines = []
    lines.push("RPG Title System")
    lines.push("Title aktif: " + activeTitle)
    lines.push("Dimiliki: " + titles.length + "/" + TITLES.length)
    lines.push("")
    TITLES.forEach(t => {
      const owned = titles.includes(t.nama) ? "[X]" : "[ ]"
      const active = t.nama === activeTitle ? " (AKTIF)" : ""
      lines.push(t.no + ". " + owned + " " + t.nama + active)
      lines.push("   Bonus: ATK+" + t.bonus.atk + " DEF+" + t.bonus.def + " HP+" + t.bonus.hp)
      lines.push("   Syarat: " + t.syarat)
      lines.push("")
    })
    lines.push("Cara: " + usedPrefix + "rpgtitle equip <nomor>")
    lines.push("Contoh: " + usedPrefix + "rpgtitle equip 3")

    return m.reply(claraWrap("RPG Title", lines.join("\n")))
  } catch (e) {
    console.error("rpgtitle error:", e.message)
    return m.reply(claraWrap("RPG Title", "Error: " + e.message))
  }
}

export default { pluginConfig, handler }
