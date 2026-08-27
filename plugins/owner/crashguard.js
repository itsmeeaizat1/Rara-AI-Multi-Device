// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// crashguard.js — PM2 Crash Monitor + Auto-Restart + Notifikasi owner
// .crashguard status — Lihat status crash guard & history
// .crashguard on/off — Toggle monitoring
// .crashguard restart — Restart PM2 process manual
// .crashguard history — Lihat crash history
// .crashguard clear — Clear crash history
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'

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

const GUARD_KEY = "crashguard_config"
const HISTORY_KEY = "crashguard_history"

async function getConfig(db) {
  return await db.get(GUARD_KEY) || {
    enabled: false,
    processName: "all",
    maxRestarts: 5,
    restartWindow: 300000,
    lastRestart: 0,
  }
}

async function saveConfig(db, cfg) {
  await db.set(GUARD_KEY, cfg)
}

async function getHistory(db) {
  return await db.get(HISTORY_KEY) || []
}

async function addHistory(db, entry) {
  const history = await getHistory(db)
  history.unshift(entry)
  if (history.length > 20) history.length = 20
  await db.set(HISTORY_KEY, history)
}

async function getPM2Info() {
  try {
    const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
    const procs = JSON.parse(stdout)
    return procs.map(p => ({
      name: p.name,
      pid: p.pid,
      status: p.pm2_env?.status || "unknown",
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      unstableRestarts: p.pm2_env?.unstable_restarts || 0,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
      cpu: p.monit?.cpu || 0,
    }))
  } catch {
    return []
  }
}

async function restartPM2(processName) {
  try {
    const target = processName === "all" ? "all" : processName
    const { stdout, stderr } = await execAsync("pm2 restart " + target + " 2>&1")
    return { success: true, output: stdout || stderr || "Restarted" }
  } catch (e) {
    return { success: false, output: e.message }
  }
}

async function getRecentLogs(processName, lines = 20) {
  try {
    const target = processName === "all" ? "" : processName
    const { stdout } = await execAsync(
      "pm2 logs " + target + " --lines " + lines + " --nostream --raw 2>&1 | tail -" + lines
    )
    return stdout.slice(-2000)
  } catch {
    return "Tidak bisa mengambil logs"
  }
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

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "status"
    const cfg = await getConfig(db)

    // Sub-command: on/off
    if (subCmd === "on" || subCmd === "off") {
      cfg.enabled = subCmd === "on"
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Crash Guard 」\n" +
        "├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n" +
        "├── Process: " + cfg.processName + "\n" +
        "├── Max restarts: " + cfg.maxRestarts + " per " + (cfg.restartWindow / 60000) + " menit\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: restart
    if (subCmd === "restart") {
      const procName = args[1] || cfg.processName
      await m.react("🕒")
      const result = await restartPM2(procName)

      await addHistory(db, {
        time: Date.now(),
        action: "manual_restart",
        process: procName,
        success: result.success,
      })

      await m.react("🐣")
      if (result.success) {
        return m.reply(
          "╭──「 Crash Guard 」\n" +
          "├── PM2 \"" + procName + "\" berhasil di-restart\n" +
          "╰──────────❀"
        )
      }
      return m.reply(
        "╭──「 Crash Guard 」\n" +
        "├── Gagal restart PM2 \"" + procName + "\"\n" +
        "├── " + result.output + "\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: history
    if (subCmd === "history") {
      const history = await getHistory(db)
      await m.react("🐣")
      if (!history.length) {
        return m.reply(
          "╭──「 Crash Guard 」\n" +
          "├── Belum ada crash/restart history.\n" +
          "╰──────────❀"
        )
      }
      let text = "╭──「 Crash Guard History 」\n"
      history.slice(0, 10).forEach((h, i) => {
        const icon = h.success ? "✅" : "❌"
        text += "├── " + (i + 1) + ". " + icon + " " + h.action + " — " + (h.process || "?") + "\n"
        text += "├── " + new Date(h.time).toLocaleString("id-ID") + "\n"
        if (h.error) text += "├── " + h.error.slice(0, 80) + "\n"
        if (i < 9) text += "├──\n"
      })
      text += "╰──────────❀"
      return m.reply(text)
    }

    // Sub-command: clear
    if (subCmd === "clear") {
      await db.set(HISTORY_KEY, [])
      await m.react("🐣")
      return m.reply(
        "╭──「 Crash Guard 」\n" +
        "├── History dihapus.\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: set process
    if (subCmd === "set") {
      const key = args[1]?.toLowerCase()
      const val = args[2]
      if (key === "process" && val) cfg.processName = val
      if (key === "maxrestart" && val) cfg.maxRestarts = parseInt(val) || 5
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Crash Guard 」\n" +
        "├── Config updated.\n" +
        "├── Process: " + cfg.processName + "\n" +
        "├── Max restarts: " + cfg.maxRestarts + "\n" +
        "╰──────────❀"
      )
    }

    // Default: status
    const pm2Info = await getPM2Info()
    const history = await getHistory(db)
    const lastRestart = cfg.lastRestart ? timeAgo(Date.now() - cfg.lastRestart) : "never"

    await m.react("🐣")

    let text = "╭──「 Crash Guard 」\n"
    text += "├── Status: " + (cfg.enabled ? "ON (monitoring)" : "OFF") + "\n"
    text += "├── Last restart: " + lastRestart + "\n"
    text += "├── Total events: " + history.length + "\n"
    text += "├──\n"

    if (pm2Info.length) {
      text += "├── PM2 Processes:\n"
      pm2Info.forEach(p => {
        const icon = p.status === "online" ? "✅" : "❌"
        const upTime = p.uptime ? timeAgo(Date.now() - p.uptime) : "?"
        text += "├── " + icon + " " + p.name + " — " + p.status + "\n"
        text += "├── Restarts: " + p.restarts + " | Up: " + upTime + "\n"
        text += "├── CPU: " + p.cpu + "% | RAM: " + p.memory + "MB\n"
        if (p.unstableRestarts > 0) {
          text += "├── ⚠️ Unstable restarts: " + p.unstableRestarts + "\n"
        }
      })
    } else {
      text += "├── PM2 tidak terdeteksi\n"
    }

    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[crashguard] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── Gagal menjalankan crash guard.\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
