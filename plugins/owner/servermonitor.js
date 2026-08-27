// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// servermonitor.js — VPS Health Monitor + Auto-Alert ke owner
// .servermonitor status — Cek VPS sekarang
// .servermonitor alert on/off — Toggle auto-alert
// .servermonitor threshold cpu 80 ram 85 disk 90 — Set threshold alert
// .servermonitor test — Test kirim alert
import os from 'os'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

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

const MONITOR_KEY = "servermonitor_config"

async function getConfig(db) {
  const data = await db.get(MONITOR_KEY) || {}
  return {
    alertEnabled: data.alertEnabled ?? false,
    cpuThreshold: data.cpuThreshold ?? 80,
    ramThreshold: data.ramThreshold ?? 85,
    diskThreshold: data.diskThreshold ?? 90,
    lastAlert: data.lastAlert || 0,
    lastCheck: data.lastCheck || 0,
  }
}

async function saveConfig(db, cfg) {
  await db.set(MONITOR_KEY, cfg)
}

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
  } catch {
    return 0
  }
}

async function getPM2Status() {
  try {
    const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
    const procs = JSON.parse(stdout)
    return procs.map(p => ({
      name: p.name,
      status: p.pm2_env?.status || "unknown",
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
    }))
  } catch {
    return []
  }
}

async function getSystemInfo() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPercent = Math.round((usedMem / totalMem) * 100)
  const cpuPercent = await getCPUUsage()
  const diskPercent = await getDiskUsage()
  const pm2 = await getPM2Status()
  const uptime = os.uptime()
  const loadAvg = os.loadavg()

  return {
    cpu: cpuPercent,
    ram: memPercent,
    ramUsed: Math.round(usedMem / 1024 / 1024),
    ramTotal: Math.round(totalMem / 1024 / 1024),
    disk: diskPercent,
    uptime: uptime,
    loadAvg: loadAvg,
    pm2: pm2,
    cores: os.cpus().length,
  }
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d) parts.push(d + "d")
  if (h) parts.push(h + "h")
  parts.push(m + "m")
  return parts.join(" ")
}

function formatReport(info) {
  let text = "╭──「 VPS Monitor 」\n"
  text += "├── CPU: " + info.cpu + "% (" + info.cores + " cores)\n"
  text += "├── RAM: " + info.ram + "% (" + info.ramUsed + "MB / " + info.ramTotal + "MB)\n"
  text += "├── Disk: " + info.disk + "%\n"
  text += "├── Uptime: " + formatUptime(info.uptime) + "\n"
  text += "├── Load: " + info.loadAvg.map(l => l.toFixed(2)).join(", ") + "\n"
  text += "├──\n"

  if (info.pm2.length) {
    text += "├── PM2 Processes:\n"
    info.pm2.forEach(p => {
      const icon = p.status === "online" ? "✅" : "❌"
      text += "├── " + icon + " " + p.name + " — " + p.status + " (" + p.restarts + " restarts, " + p.memory + "MB)\n"
    })
  } else {
    text += "├── PM2: tidak terdeteksi\n"
  }

  text += "╰──────────❀"
  return text
}

function checkAlerts(info, cfg) {
  const alerts = []
  if (info.cpu >= cfg.cpuThreshold) {
    alerts.push("⚠️ CPU " + info.cpu + "% >= " + cfg.cpuThreshold + "%")
  }
  if (info.ram >= cfg.ramThreshold) {
    alerts.push("⚠️ RAM " + info.ram + "% >= " + cfg.ramThreshold + "%")
  }
  if (info.disk >= cfg.diskThreshold) {
    alerts.push("⚠️ Disk " + info.disk + "% >= " + cfg.diskThreshold + "%")
  }
  info.pm2.forEach(p => {
    if (p.status !== "online") {
      alerts.push("❌ PM2 " + p.name + " status: " + p.status)
    }
  })
  return alerts
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "status"
    const cfg = await getConfig(db)

    // Sub-command: alert on/off
    if (subCmd === "alert") {
      const toggle = args[1]?.toLowerCase()
      if (toggle === "on") {
        cfg.alertEnabled = true
        await saveConfig(db, cfg)
        await m.react("🐣")
        return m.reply(
          "╭──「 VPS Monitor 」\n" +
          "├── Auto-alert: ON\n" +
          "├── Threshold: CPU " + cfg.cpuThreshold + "% / RAM " + cfg.ramThreshold + "% / Disk " + cfg.diskThreshold + "%\n" +
          "├── Bot akan cek VPS tiap 5 menit\n" +
          "├── Alert dikirim ke PM owner\n" +
          "╰──────────❀"
        )
      } else if (toggle === "off") {
        cfg.alertEnabled = false
        await saveConfig(db, cfg)
        await m.react("🐣")
        return m.reply(
          "╭──「 VPS Monitor 」\n" +
          "├── Auto-alert: OFF\n" +
          "╰──────────❀"
        )
      }
    }

    // Sub-command: threshold
    if (subCmd === "threshold") {
      const rest = args.slice(1)
      for (let i = 0; i < rest.length; i += 2) {
        const key = rest[i]?.toLowerCase()
        const val = parseInt(rest[i + 1])
        if (key === "cpu" && val) cfg.cpuThreshold = val
        if (key === "ram" && val) cfg.ramThreshold = val
        if (key === "disk" && val) cfg.diskThreshold = val
      }
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 VPS Monitor 」\n" +
        "├── Threshold updated:\n" +
        "├── CPU: " + cfg.cpuThreshold + "%\n" +
        "├── RAM: " + cfg.ramThreshold + "%\n" +
        "├── Disk: " + cfg.diskThreshold + "%\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: test
    if (subCmd === "test") {
      const info = await getSystemInfo()
      const alerts = checkAlerts(info, cfg)
      await m.react("🐣")
      if (alerts.length) {
        return m.reply(
          "╭──「 VPS Alert Test 」\n" +
          alerts.map(a => "├── " + a).join("\n") + "\n" +
          "╰──────────❀"
        )
      }
      return m.reply(
        "╭──「 VPS Alert Test 」\n" +
        "├── Tidak ada alert aktif. Semua normal.\n" +
        formatReport(info).replace("╭──「 VPS Monitor 」", "├──\n├── Status:") + "\n" +
        "╰──────────❀"
      )
    }

    // Default: status
    const info = await getSystemInfo()
    await m.react("🐣")
    let text = formatReport(info)

    if (cfg.alertEnabled) {
      const alerts = checkAlerts(info, cfg)
      if (alerts.length) {
        text += "\n\n╭──「 Alerts 」\n" +
          alerts.map(a => "├── " + a).join("\n") + "\n" +
          "╰──────────❀"
      }
    }

    return m.reply(text)
  } catch (e) {
    console.error("[servermonitor] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── Gagal mengambil info VPS.\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
