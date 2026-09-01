// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// smartdigest.js — Activity Digest (integrated with automation hub)
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "smartdigest",
  alias: ["smartdigest"],
  category: "owner",
  description: "Digest aktivitas bot harian (command, grup, user teraktif)",
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

function getCfg(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.smartdigest) {
    db.db.data.automation.smartdigest = { autoEnabled: false, sendTime: "08:00" }
  }
  return db.db.data.automation.smartdigest
}

function getStats(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.activityStats) {
    db.db.data.automation.activityStats = {
      commands: {}, groups: {}, users: {},
      messages: 0, errors: 0, newMembers: 0, startedAt: Date.now(),
    }
  }
  return db.db.data.automation.activityStats
}

function save(db) { db.markDirty("settings"); db.db.write?.() }

function timeAgo(ms) {
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  if (d) return d + "d " + h + "h"
  if (h) return h + "h " + m + "m"
  return m + "m"
}

function generateDigest(stats) {
  const elapsed = Date.now() - (stats.startedAt || Date.now())
  const commands = Object.entries(stats.commands || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const groups = Object.entries(stats.groups || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const users = Object.entries(stats.users || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)

  let text = "╭─「 ✦ Bot Activity Digest ✦ 」\n"
  text += "│ Periode: " + timeAgo(elapsed) + " terakhir\n"
  text += "│ Total pesan: " + (stats.messages || 0) + "\n"
  text += "│ Total command: " + Object.values(stats.commands || {}).reduce((a, b) => a + b, 0) + "\n"
  text += "│ Errors: " + (stats.errors || 0) + "\n"
  text += "│\n"
  if (commands.length) {
    text += "│ Top Commands:\n"
    commands.forEach(([cmd, count], i) => { text += "" + (i + 1) + ". ." + cmd + " (" + count + "x)\n" })
    text += "│\n"
  }
  if (groups.length) {
    text += "│ Grup Aktif:\n"
    groups.forEach(([gid, count], i) => { text += "" + (i + 1) + ". " + gid.slice(0, 15) + "... (" + count + ")\n" })
    text += "│\n"
  }
  if (users.length) {
    text += "│ User Aktif:\n"
    users.forEach(([uid, count], i) => { text += "" + (i + 1) + ". " + uid.split("@")[0] + " (" + count + ")\n" })
  }
  text += "╰────  •  ────"
  return text
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "now"
    const cfg = getCfg(db)

    if (subCmd === "auto") {
      const toggle = args[1]?.toLowerCase()
      if (toggle === "on") { cfg.autoEnabled = true; save(db);
        return m.reply("╭─「 ✦ Smart Digest ✦ 」\n│ Auto-digest: ON\n│ Jam kirim: " + cfg.sendTime + " WIB\n│ Dikirim ke PM owner otomatis\n╰────  •  ────") }
      if (toggle === "off") { cfg.autoEnabled = false; save(db);
        return m.reply("╭─「 ✦ Smart Digest ✦ 」\n│ Auto-digest: OFF\n╰────  •  ────") }
    }

    if (subCmd === "settime") {
      cfg.sendTime = args[1] || "08:00"; save(db);
      return m.reply("╭─「 ✦ Smart Digest ✦ 」\n│ Jam kirim: " + cfg.sendTime + " WIB\n╰────  •  ────")
    }

    if (subCmd === "reset") {
      db.db.data.automation.activityStats = {
        commands: {}, groups: {}, users: {},
        messages: 0, errors: 0, newMembers: 0, startedAt: Date.now(),
      }
      save(db);
      return m.reply("╭─「 ✦ Smart Digest ✦ 」\n│ Stats direset.\n╰────  •  ────")
    }

    // Default: now
    return m.reply(generateDigest(getStats(db)))
  } catch (e) {
    console.error("[smartdigest] error:", e.message)
    return m.reply("╭─「 ✦ Error ✦ 」\n" + (e.message || "Ada error nih") + "\n╰────  •  ────")
  }
}

export { pluginConfig as config, handler }
