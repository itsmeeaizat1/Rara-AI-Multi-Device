// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// servermonitor.js — VPS Health Monitor + Auto-Alert (integrated with automation hub)
import os from 'os'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBox } from "../../src/lib/rara-menu-style.js";
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDatabase } from '../../src/lib/rara-database.js'
import { initAutomationHub } from '../../src/lib/rara-automation-hub.js'

const execAsync = promisify(exec)

const pluginConfig = {
  name: "servermonitor",
  alias: ["servermonitor"],
  category: "owner",
  description: "Monitor VPS health (CPU, RAM, disk, PM2) + auto-alert ke owner",
  usage: ".servermonitor status | alert on/off | threshold | test",
  example: ".servermonitor status",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
}

function getCfg(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.servermonitor) {
    db.db.data.automation.servermonitor = {
      alertEnabled: false,
      cpuThreshold: 80, ramThreshold: 85, diskThreshold: 90,
      lastAlert: 0,
    }
  }
  return db.db.data.automation.servermonitor
}

function save(db) { db.markDirty("settings"); db.db.write?.() }

async function getCPUUsage() {
  const cpus = os.cpus()
  let idle = 0, total = 0
  for (const cpu of cpus) {
    for (const type in cpu.times) total += cpu.times[type]
    idle += cpu.times.idle
  }
  return Math.round(((total - idle) / total) * 100)
}

async function getDiskUsage() {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'")
    return parseInt(stdout.trim()) || 0
  } catch { return 0 }
}

async function getPM2Status() {
  try {
    const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
    return JSON.parse(stdout).map(p => ({
      name: p.name, status: p.pm2_env?.status || "unknown",
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
    }))
  } catch { return [] }
}

function formatUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d) return d + "d " + h + "h"
  if (h) return h + "h " + m + "m"
  return m + "m"
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "status"
    const cfg = getCfg(db)

    if (subCmd === "alert") {
      const toggle = args[1]?.toLowerCase()
      if (toggle === "on") {
        cfg.alertEnabled = true; save(db)
        return m.reply(raraBox("Server Monitor", ["✅ Auto-alert: ON", "Cek tiap 60 detik, alert ke PM owner", "---", "Threshold: CPU " + cfg.cpuThreshold + "% | RAM " + cfg.ramThreshold + "% | Disk " + cfg.diskThreshold + "%"]))
      } else if (toggle === "off") {
        cfg.alertEnabled = false; save(db)
        return m.reply(raraBox("Server Monitor", ["❌ Auto-alert: OFF", "Monitoring dimatikan"]))
      }
    }

    if (subCmd === "threshold") {
      const rest = args.slice(1)
      for (let i = 0; i < rest.length; i += 2) {
        const key = rest[i]?.toLowerCase(), val = parseInt(rest[i + 1])
        if (key === "cpu" && val) cfg.cpuThreshold = val
        if (key === "ram" && val) cfg.ramThreshold = val
        if (key === "disk" && val) cfg.diskThreshold = val
      }
      save(db);
      return m.reply(raraBox("Server Monitor", ["✅ Threshold diupdate!", "CPU: " + cfg.cpuThreshold + "%", "RAM: " + cfg.ramThreshold + "%", "Disk: " + cfg.diskThreshold + "%"]))
    }

    if (subCmd === "test") {
      const cpu = await getCPUUsage()
      const ram = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      const disk = await getDiskUsage()
      const alerts = []
      if (cpu >= cfg.cpuThreshold) alerts.push("⚠️ CPU " + cpu + "% >= " + cfg.cpuThreshold + "%")
      if (ram >= cfg.ramThreshold) alerts.push("⚠️ RAM " + ram + "% >= " + cfg.ramThreshold + "%")
      if (disk >= cfg.diskThreshold) alerts.push("⚠️ Disk " + disk + "% >= " + cfg.diskThreshold + "%")
      if (alerts.length) return m.reply(alerts.join("\n"))
      return m.reply(raraWrap("servermonitor", "Semua normal. Tidak ada alert.\nCPU " + cpu + "% | RAM " + ram + "% | Disk " + disk + "%"))
    }

    // Default: status
    const cpu = await getCPUUsage()
    const totalMem = os.totalmem(), usedMem = totalMem - os.freemem()
    const ram = Math.round((usedMem / totalMem) * 100)
    const disk = await getDiskUsage()
    const pm2 = await getPM2Status()

    let text = "CPU: " + cpu + "% (" + os.cpus().length + " cores)\n"
    text += "RAM: " + ram + "% (" + Math.round(usedMem / 1024 / 1024) + "MB / " + Math.round(totalMem / 1024 / 1024) + "MB)\n"
    text += "Disk: " + disk + "%\n"
    text += "Uptime: " + formatUptime(os.uptime()) + "\n"
    text += "Load: " + os.loadavg().map(l => l.toFixed(2)).join(", ") + "\n"
    text += "Alert: " + (cfg.alertEnabled ? "ON ✅" : "OFF ❌") + "\n"
    if (pm2.length) {
      text += "\nPM2 Processes:\n"
      pm2.forEach(p => {
        const icon = p.status === "online" ? "✅" : "❌"
        text += icon + " " + p.name + " — " + p.status + " (" + p.restarts + " restarts, " + p.memory + "MB)\n"
      })
    } else { text += "PM2: tidak terdeteksi\n" }
    return m.reply(text.trim())
  } catch (e) {
    console.error("[servermonitor] error:", e.message)
    return m.reply(raraWrap("servermonitor", "Gagal proses. Coba lagi.", "error"))
  }
}

export { pluginConfig as config, handler }
