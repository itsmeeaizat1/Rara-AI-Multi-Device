// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// crashguard.js — PM2 Crash Monitor + Auto-Restart (integrated with automation hub)
import { exec } from 'child_process'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { promisify } from 'util'
import { getDatabase } from '../../src/lib/nova-database.js'

const execAsync = promisify(exec)

const pluginConfig = {
  name: "crashguard",
  alias: ["crashguard"],
  category: "owner",
  description: "Monitor PM2 crash + auto-restart + notifikasi owner",
  usage: ".crashguard status | on/off | restart | history | clear",
  example: ".crashguard status",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

function getCfg(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.crashguard) {
    db.db.data.automation.crashguard = {
      enabled: false, processName: "all",
      maxRestarts: 5, restartWindow: 300000,
      lastRestart: 0, restartHistory: [],
    }
  }
  return db.db.data.automation.crashguard
}

function save(db) { db.markDirty("settings"); db.db.write?.() }

async function getPM2Info() {
  try {
    const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
    return JSON.parse(stdout).map(p => ({
      name: p.name, status: p.pm2_env?.status || "unknown",
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      unstable: p.pm2_env?.unstable_restarts || 0,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
      cpu: p.monit?.cpu || 0,
    }))
  } catch { return [] }
}

function timeAgo(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return s + "s ago"
  const m = Math.floor(s / 60)
  if (m < 60) return m + "m ago"
  const h = Math.floor(m / 60)
  if (h < 24) return h + "h ago"
  return Math.floor(h / 24) + "d ago"
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "status"
    const cfg = getCfg(db)

    if (subCmd === "on" || subCmd === "off") {
      cfg.enabled = subCmd === "on"; save(db)
      await m.react("🐣")
      return m.reply("╭──「 Crash Guard 」\n│ Status: " + (cfg.enabled ? "ON (monitoring)" : "OFF") + "\n│ Max restarts: " + cfg.maxRestarts + " per " + (cfg.restartWindow / 60000) + " min\n╰──────────❀")
    }

    if (subCmd === "restart") {
      const procName = args[1] || cfg.processName
      await m.react("🕒")
      try {
        await execAsync("pm2 restart " + (procName === "all" ? "all" : procName) + " 2>&1")
        cfg.restartHistory.unshift({ time: Date.now(), action: "manual_restart", process: procName, success: true })
        cfg.restartHistory = cfg.restartHistory.slice(0, 20)
        cfg.lastRestart = Date.now()
        save(db)
        await m.react("🐣")
        return m.reply("╭──「 Crash Guard 」\n│ PM2 \"" + procName + "\" berhasil di-restart\n╰──────────❀")
      } catch (e) {
        await m.react("🐣")
        return m.reply("╭──「 🛡️ Crash Guard 」\n│ ❌ Gagal restart: " + e.message.slice(0, 100) + "\n╰──────────❀")
      }
    }

    if (subCmd === "history") {
      const history = cfg.restartHistory || []
      await m.react("🐣")
      if (!history.length) return m.reply("╭──「 Crash Guard 」\n│ Belum ada history.\n╰──────────❀")
      let text = "╭──「 Crash Guard History 」\n"
      history.slice(0, 10).forEach((h, i) => {
        const icon = h.success ? "✅" : "❌"
        text += "" + (i + 1) + ". " + icon + " " + h.action + " — " + (h.process || "?") + "\n"
        text += "" + new Date(h.time).toLocaleString("id-ID") + "\n"
        if (i < 9) text += "│\n"
      })
      text += "╰──────────❀"
      return m.reply(text)
    }

    if (subCmd === "clear") {
      cfg.restartHistory = []; save(db)
      await m.react("🐣")
      return m.reply("╭──「 Crash Guard 」\n│ History dihapus.\n╰──────────❀")
    }

    if (subCmd === "set") {
      const key = args[1]?.toLowerCase(), val = args[2]
      if (key === "process" && val) cfg.processName = val
      if (key === "maxrestart" && val) cfg.maxRestarts = parseInt(val) || 5
      save(db); await m.react("🐣")
      return m.reply("╭──「 Crash Guard 」\n│ Config updated.\n│ Process: " + cfg.processName + "\n│ Max restarts: " + cfg.maxRestarts + "\n╰──────────❀")
    }

    // Default: status
    const pm2 = await getPM2Info()
    const lastRestart = cfg.lastRestart ? timeAgo(Date.now() - cfg.lastRestart) : "never"
    await m.react("🐣")
    let text = "╭──「 Crash Guard 」\n"
    text += "│ Status: " + (cfg.enabled ? "ON (monitoring)" : "OFF") + "\n"
    text += "│ Last restart: " + lastRestart + "\n"
    text += "│ Events: " + (cfg.restartHistory?.length || 0) + "\n"
    text += "│\n"
    if (pm2.length) {
      text += "│ PM2 Processes:\n"
      pm2.forEach(p => {
        const icon = p.status === "online" ? "✅" : "❌"
        const up = p.uptime ? timeAgo(Date.now() - p.uptime) : "?"
        text += "" + icon + " " + p.name + " — " + p.status + "\n"
        text += "│ Restarts: " + p.restarts + " | Up: " + up + " | CPU: " + p.cpu + "% | RAM: " + p.memory + "MB\n"
        if (p.unstable > 0) text += "│ ⚠️ Unstable: " + p.unstable + "\n"
      })
    } else { text += "│ PM2 tidak terdeteksi\n" }
    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[crashguard] error:", e.message)
    await m.react("🐣")
    return m.reply("╭──「 Error 」\n" + (e.message || "Ada error nih") + "\n╰──────────❀")
  }
}

export { pluginConfig as config, handler }
