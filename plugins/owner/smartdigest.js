// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// smartdigest.js — Smart Activity Digest untuk owner
// .smartdigest now — Generate digest sekarang
// .smartdigest auto on/off — Toggle auto-digest harian
// .smartdigest settime 08:00 — Set jam auto-digest
// .smartdigest reset — Reset stats
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import config from '../../config.js'

const pluginConfig = {
  name: "smartdigest",
  alias: ["smartdigest"],
  category: "owner",
  description: "Digest aktivitas bot harian (command terpopuler, grup aktif, user baru)",
  usage: ".smartdigest now | auto on/off | settime HH:MM | reset",
  example: ".smartdigest now",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
}

const DIGEST_KEY = "smartdigest_data"
const STATS_KEY = "bot_activity_stats"

async function getStats(db) {
  return await db.get(STATS_KEY) || {
    commands: {},
    groups: {},
    users: {},
    messages: 0,
    errors: 0,
    newMembers: 0,
    startedAt: Date.now(),
  }
}

async function saveStats(db, stats) {
  await db.set(STATS_KEY, stats)
}

async function getConfig(db) {
  return await db.get(DIGEST_KEY) || {
    autoEnabled: false,
    sendTime: "08:00",
    lastSent: 0,
  }
}

async function saveConfig(db, cfg) {
  await db.set(DIGEST_KEY, cfg)
}

function timeAgo(ms) {
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days) return days + "d " + (hours % 24) + "h"
  if (hours) return hours + "h " + (mins % 60) + "m"
  return mins + "m"
}

function generateDigest(stats, period) {
  const now = Date.now()
  const elapsed = now - (stats.startedAt || now)
  const commands = Object.entries(stats.commands || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const groups = Object.entries(stats.groups || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const users = Object.entries(stats.users || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  let text = "╭──「 Bot Activity Digest 」\n"
  text += "├── Periode: " + timeAgo(elapsed) + " terakhir\n"
  text += "├── Total pesan: " + (stats.messages || 0) + "\n"
  text += "├── Total command: " + Object.values(stats.commands || {}).reduce((a, b) => a + b, 0) + "\n"
  text += "├── Errors: " + (stats.errors || 0) + "\n"
  text += "├── New members: " + (stats.newMembers || 0) + "\n"
  text += "├──\n"

  if (commands.length) {
    text += "├── Top Commands:\n"
    commands.forEach(([cmd, count], i) => {
      text += "├── " + (i + 1) + ". ." + cmd + " (" + count + "x)\n"
    })
    text += "├──\n"
  }

  if (groups.length) {
    text += "├── Grup Paling Aktif:\n"
    groups.forEach(([gid, count], i) => {
      text += "├── " + (i + 1) + ". " + (gid.slice(0, 20)) + "... (" + count + " msg)\n"
    })
    text += "├──\n"
  }

  if (users.length) {
    text += "├── User Paling Aktif:\n"
    users.forEach(([uid, count], i) => {
      text += "├── " + (i + 1) + ". " + uid.split("@")[0] + " (" + count + " cmd)\n"
    })
    text += "├──\n"
  }

  text += "╰──────────❀"
  return text
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "now"
    const stats = await getStats(db)

    // Sub-command: auto
    if (subCmd === "auto") {
      const cfg = await getConfig(db)
      const toggle = args[1]?.toLowerCase()
      if (toggle === "on") {
        cfg.autoEnabled = true
        await saveConfig(db, cfg)
        await m.react("🐣")
        return m.reply(
          "╭──「 Smart Digest 」\n" +
          "├── Auto-digest: ON\n" +
          "├── Jam kirim: " + cfg.sendTime + " WIB\n" +
          "├── Dikirim ke PM owner\n" +
          "╰──────────❀"
        )
      } else if (toggle === "off") {
        cfg.autoEnabled = false
        await saveConfig(db, cfg)
        await m.react("🐣")
        return m.reply(
          "╭──「 Smart Digest 」\n" +
          "├── Auto-digest: OFF\n" +
          "╰──────────❀"
        )
      }
    }

    // Sub-command: settime
    if (subCmd === "settime") {
      const time = args[1] || "08:00"
      const cfg = await getConfig(db)
      cfg.sendTime = time
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Smart Digest 」\n" +
        "├── Jam kirim diubah: " + time + " WIB\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: reset
    if (subCmd === "reset") {
      const fresh = {
        commands: {}, groups: {}, users: {},
        messages: 0, errors: 0, newMembers: 0,
        startedAt: Date.now(),
      }
      await saveStats(db, fresh)
      await m.react("🐣")
      return m.reply(
        "╭──「 Smart Digest 」\n" +
        "├── Stats direset. Mulai dari sekarang.\n" +
        "╰──────────❀"
      )
    }

    // Default: now — generate digest
    await m.react("🐣")
    const digest = generateDigest(stats)
    return m.reply(digest)
  } catch (e) {
    console.error("[smartdigest] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── Gagal generate digest.\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
