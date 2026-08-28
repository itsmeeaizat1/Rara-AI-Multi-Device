// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
  name: 'bcpcjeda',
  alias: ["bcpcjeda"],
  category: 'owner',
  description: 'Atur jeda broadcast private chat',
  usage: '.bcpcjeda <waktu> (contoh: 5s, 2m, 1h)',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

function parseDelay(input) {
  if (!input) return null
  const match = input.match(/^(\d+)(s|m|h|d)$/i)
  if (!match) return null
  const val = parseInt(match[1])
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 's': return val * 1000
    case 'm': return val * 60 * 1000
    case 'h': return val * 60 * 60 * 1000
    case 'd': return val * 24 * 60 * 60 * 1000
    default: return null
  }
}

function formatDelay(ms) {
  if (ms >= 86400000) return `${(ms / 86400000).toFixed(0)} hari`
  if (ms >= 3600000) return `${(ms / 3600000).toFixed(0)} jam`
  if (ms >= 60000) return `${(ms / 60000).toFixed(0)} menit`
  return `${(ms / 1000).toFixed(0)} detik`
}

async function handler(m, { sock }) {
  const db = getDatabase()
  const input = m.text?.trim()
  const current = db.setting('jedaBcpc') || 5000

  if (!input) {
    return m.reply(
      "╭──「 ⏱️ Jeda Broadcast Private 」\n" +
      "│\n" +
      "│ ⏱️ Jeda saat ini: " + formatDelay(current) + " (" + current + "ms)\n" +
      "│\n" +
      "│ 📌 *Cara Pakai:*\n" +
      "│ `" + m.prefix + "bcpcjeda <angka><satuan>`\n" +
      "│\n" +
      "│ 💡 *Satuan:*\n" +
      "│ s — detik | m — menit | h — jam | d — hari\n" +
      "│\n" +
      "│ 💡 *Contoh:*\n" +
      "│ `" + m.prefix + "bcpcjeda 5s` → 5 detik\n" +
      "│ `" + m.prefix + "bcpcjeda 2m` → 2 menit\n" +
      "│ `" + m.prefix + "bcpcjeda 1h` → 1 jam\n" +
      "╰──────────❀"
    )
  }

  const ms = parseDelay(input)
  if (!ms || ms < 1000) {
    return m.reply(
      "╭──「 ⏱️ Jeda Broadcast Private 」\n" +
      "│\n" +
      "│ ❌ Format salah\n" +
      "│ 💡 Contoh: `5s`, `2m`, `1h`, `1d`\n" +
      "╰──────────❀"
    )
  }

  const prev = current
  db.setting('jedaBcpc', ms)

  return m.reply(
    "╭──「 ⏱️ Jeda Broadcast Private 」\n" +
    "│\n" +
    "│ ✅ Jeda berhasil diubah\n" +
    "│ 📌 Sebelumnya: " + formatDelay(prev) + "\n" +
    "│ 📌 Sekarang: " + formatDelay(ms) + "\n" +
    "│\n" +
    "│ 📊 Estimasi 100 kontak: " + Math.ceil((100 * ms) / 60000) + " menit\n" +
    "╰──────────❀"
  )
}

export { pluginConfig as config, handler }
