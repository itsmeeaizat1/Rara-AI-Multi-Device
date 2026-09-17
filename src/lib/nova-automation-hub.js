// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-automation-hub.js — Central Automation Engine
// Integrasi: servermonitor + crashguard + smartdigest + autoforward + automod
// Run loop tiap 60 detik untuk cek semua sistem

import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getDatabase } from './nova-database.js'
import config from '../../config.js'

const execAsync = promisify(exec)

let sockInstance = null
let loopInterval = null
let lastDigestSent = 0

// ==================== UTILITIES ====================

function getOwnerJid() {
  return config.owner?.[0] || ""
}

async function sendToOwner(text) {
  if (!sockInstance || !getOwnerJid()) return
  try {
    await sockInstance.sendMessage(getOwnerJid(), { text })
  } catch (e) {
    console.error("[automation-hub] sendToOwner error:", e.message)
  }
}

function getAutomodData() {
  const db = getDatabase()
  if (!db.db.data.automation) db.db.data.automation = {}
  return db.db.data.automation
}

function saveAutomodData() {
  const db = getDatabase()
  db.markDirty("settings")
  db.db.write?.()
}

// ==================== TOGGLE RULE — dipakai .novaagent act antilink/dll ====
// (request owner 12 Sep 2026: "novaagent klo disuruh aktifkan fitur ada yg
// gak tau" — .novaagent aktifkan antilink digrup ini SEBELUMNYA malah ambil
// LINK GRUP karena LLM ke-confuse kata "link" di dalam "antilink". Sekarang
// nova-agent.js punya action native antilink/antibadword/antisticker/
// antivoice/antispam yang manggil helper ini — pakai grup SAAT INI (m.chat),
// auto-daftar + auto-enable automod kalau grup belum terdaftar.
const AUTOMOD_RULE_KEYS = ["antilink", "antispam", "antibadword", "antisticker", "antivoice"]

export function setAutomodRule(gid, rule, on) {
  if (!AUTOMOD_RULE_KEYS.includes(rule)) throw new Error("Rule automod gak dikenal: " + rule)
  const data = getAutomodData()
  if (!data.automod) data.automod = { groups: {}, globalBadwords: ["spam", "scam", " judi", "casino", "porn"] }
  if (!data.automod.groups[gid]) {
    data.automod.groups[gid] = {
      enabled: true,
      rules: { antilink: false, antispam: false, antibadword: false, antisticker: false, antivoice: false },
      badwords: [], action: "warn", warnings: {}, violations: 0,
    }
  }
  const g = data.automod.groups[gid]
  g.enabled = true // aktifkan otomatis (grup ini minta fitur dinyalain — automod-nya wajib hidup)
  g.rules[rule] = on === true
  saveAutomodData()
  return g.rules[rule]
}

export function getAutomodRules(gid) {
  const data = getAutomodData()
  return data.automod?.groups?.[gid]?.rules || null
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return d + "d " + h + "h"
  if (h) return h + "h " + m + "m"
  return m + "m"
}

// ==================== VPS MONITOR ====================

function getCPUUsage() {
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
      name: p.name,
      status: p.pm2_env?.status || "unknown",
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
      cpu: p.monit?.cpu || 0,
    }))
  } catch { return [] }
}

async function checkVPSHealth() {
  const data = getAutomodData()
  const monCfg = data.servermonitor || {}
  if (!monCfg.alertEnabled) return

  const cpu = getCPUUsage()
  const totalMem = os.totalmem()
  const usedMem = totalMem - os.freemem()
  const ram = Math.round((usedMem / totalMem) * 100)
  const disk = await getDiskUsage()

  const alerts = []
  if (cpu >= (monCfg.cpuThreshold || 80)) {
    alerts.push("⚠️ CPU " + cpu + "% >= " + (monCfg.cpuThreshold || 80) + "%")
  }
  if (ram >= (monCfg.ramThreshold || 85)) {
    alerts.push("⚠️ RAM " + ram + "% >= " + (monCfg.ramThreshold || 85) + "%")
  }
  if (disk >= (monCfg.diskThreshold || 90)) {
    alerts.push("⚠️ Disk " + disk + "% >= " + (monCfg.diskThreshold || 90) + "%")
  }

  // Throttle alerts: max 1 per 10 minutes
  const now = Date.now()
  const lastAlert = monCfg.lastAlert || 0
  if (alerts.length && now - lastAlert > 600000) {
    monCfg.lastAlert = now
    saveAutomodData()

    const uptime = formatUptime(os.uptime())
    let text = "「 ✦ VPS Alert ✦ 」\n"
    text += new Date().toLocaleString("id-ID") + "\n"
    text += "Uptime: " + uptime + "\n\n"
    alerts.forEach(a => text += "• " + a + "\n")
    text += "\n"
    text += "Cek detail: .servermonitor status\n"

    await sendToOwner(text)
    console.log("[automation-hub] VPS alert sent")
  }
}

// ==================== CRASH GUARD ====================

async function checkCrashGuard() {
  const data = getAutomodData()
  const guardCfg = data.crashguard || {}
  if (!guardCfg.enabled) return

  const pm2 = await getPM2Status()
  const now = Date.now()

  for (const p of pm2) {
    if (p.status !== "online") {
      // Process is down — attempt restart
      const restartWindow = guardCfg.restartWindow || 300000
      const maxRestarts = guardCfg.maxRestarts || 5
      const recentRestarts = guardCfg.restartHistory?.filter(
        r => now - r.time < restartWindow
      ) || []

      if (recentRestarts.length >= maxRestarts) {
        // Too many restarts — alert only
        if (now - (guardCfg.lastRestartAlert || 0) > 1800000) {
          guardCfg.lastRestartAlert = now
          saveAutomodData()
          await sendToOwner(
            "「 ✦ Crash Guard Alert ✦ 」\n" +
            "" + new Date().toLocaleString("id-ID") + "\n" +
            "PM2 \"" + p.name + "\" DOWN\n" +
            "Max restarts (" + maxRestarts + ") tercapai.\n" +
            "Restart manual diperlukan.\n" +
            "\n" +
            ".crashguard restart " + p.name + "\n" +
            ""
          )
        }
        continue
      }

      // Attempt restart
      try {
        await execAsync("pm2 restart " + p.name + " 2>&1")
        if (!guardCfg.restartHistory) guardCfg.restartHistory = []
        guardCfg.restartHistory.push({ time: now, process: p.name, action: "auto_restart" })
        guardCfg.restartHistory = guardCfg.restartHistory.slice(-20)
        guardCfg.lastRestart = now
        saveAutomodData()

        await sendToOwner(
          "「 ✦ Crash Guard Auto-Restart ✦ 」\n" +
          "" + new Date().toLocaleString("id-ID") + "\n" +
          "PM2 \"" + p.name + "\" was DOWN — auto-restarted\n" +
          "Restarts in window: " + (recentRestarts.length + 1) + "/" + maxRestarts + "\n" +
          ""
        )
        console.log("[automation-hub] Auto-restarted PM2:", p.name)
      } catch (e) {
        console.error("[automation-hub] Restart failed:", e.message)
        await sendToOwner(
          "「 ✦ Crash Guard Failed ✦ 」\n" +
          "Gagal auto-restart PM2 \"" + p.name + "\"\n" +
          "" + e.message.slice(0, 100) + "\n" +
          ""
        )
      }
    }
  }
}

// ==================== SMART DIGEST ====================

async function checkSmartDigest() {
  const data = getAutomodData()
  const digestCfg = data.smartdigest || {}
  if (!digestCfg.autoEnabled) return

  const sendTime = digestCfg.sendTime || "08:00"
  const [targetHour, targetMin] = sendTime.split(":").map(Number)
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMinTotal = targetHour * 60 + targetMin

  // Only send within ±1 minute window
  if (Math.abs(nowMin - targetMinTotal) > 1) return

  // Prevent double-send
  const todayKey = now.toDateString()
  if (lastDigestSent === todayKey) return
  lastDigestSent = todayKey

  const stats = data.activityStats || {
    commands: {}, groups: {}, users: {},
    messages: 0, errors: 0, newMembers: 0, startedAt: Date.now(),
  }

  const commands = Object.entries(stats.commands || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
  const groups = Object.entries(stats.groups || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
  const users = Object.entries(stats.users || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)

  const elapsed = Date.now() - (stats.startedAt || Date.now())
  const elapsedStr = formatUptime(elapsed / 1000)

  let text = "「 ✦ Daily Digest ✦ 」\n"
  text += "" + now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) + "\n"
  text += "Periode: " + elapsedStr + "\n"
  text += "Total pesan: " + (stats.messages || 0) + "\n"
  text += "Total command: " + Object.values(stats.commands || {}).reduce((a, b) => a + b, 0) + "\n"
  text += "Errors: " + (stats.errors || 0) + "\n"
  text += "\n"

  if (commands.length) {
    text += "Top Commands:\n"
    commands.forEach(([cmd, count], i) => {
      text += "" + (i + 1) + ". ." + cmd + " (" + count + "x)\n"
    })
    text += "\n"
  }
  if (groups.length) {
    text += "Grup Aktif:\n"
    groups.forEach(([gid, count], i) => {
      text += "" + (i + 1) + ". " + gid.slice(0, 15) + "... (" + count + ")\n"
    })
    text += "\n"
  }
  if (users.length) {
    text += "User Aktif:\n"
    users.forEach(([uid, count], i) => {
      text += "" + (i + 1) + ". " + uid.split("@")[0] + " (" + count + ")\n"
    })
  }
  text += ""

  await sendToOwner(text)
  console.log("[automation-hub] Daily digest sent")

  // Reset stats after digest
  data.activityStats = {
    commands: {}, groups: {}, users: {},
    messages: 0, errors: 0, newMembers: 0, startedAt: Date.now(),
  }
  saveAutomodData()
}

// ==================== AUTO FORWARD HOOK ====================

export async function checkAutoForward(m, sock) {
  try {
    const data = getAutomodData()
    const fwdCfg = data.autoforward || {}
    if (!fwdCfg.enabled || !fwdCfg.keywords?.length) return

    const text = (m.text || m.message?.conversation || "").toLowerCase()
    if (!text) return

    // Check scope
    const isGroup = m.key?.remoteJid?.endsWith("@g.us")
    if (fwdCfg.scope === "gc" && !isGroup) return
    if (fwdCfg.scope === "pc" && isGroup) return

    // Check keywords
    const matched = fwdCfg.keywords.some(kw => text.includes(kw))
    if (!matched) return

    // Forward to owner
    const ownerJid = getOwnerJid()
    if (!ownerJid || !sock) return

    const sender = m.key?.participant || m.key?.remoteJid || "?"
    const chat = m.key?.remoteJid || "?"
    const chatName = isGroup ? "Grup" : "Private"
    const originalText = m.text || m.message?.conversation || ""

    let forwardText = "「 ✦ Auto Forward ✦ 」\n"
    forwardText += "\n"
    forwardText += "• Dari   : " + chatName + "\n"
    forwardText += "• Sender : " + sender.split("@")[0] + "\n"
    forwardText += "• Chat   : " + chat.slice(0, 25) + "\n"
    forwardText += "\n"
    forwardText += "Pesan:\n"
    forwardText += "" + originalText.slice(0, 500) + "\n"
    forwardText += "\n"
    forwardText += ""

    await sock.sendMessage(ownerJid, { text: forwardText })

    fwdCfg.forwardedCount = (fwdCfg.forwardedCount || 0) + 1
    saveAutomodData()
  } catch (e) {
    console.error("[automation-hub] autoforward error:", e.message)
  }
}

// ==================== AUTO MOD HOOK ====================

export async function checkAutoMod(m, sock) {
  try {
    const data = getAutomodData()
    const modCfg = data.automod || {}
    const groups = modCfg.groups || {}

    const chat = m.key?.remoteJid
    if (!chat?.endsWith("@g.us")) return

    const groupCfg = groups[chat]
    if (!groupCfg?.enabled) return

    const text = (m.text || m.message?.conversation || "").toLowerCase()
    const sender = m.key?.participant || m.key?.remoteJid
    let violation = null

    // Anti-link
    if (groupCfg.rules?.antilink && text) {
      const linkPattern = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/i
      if (linkPattern.test(text)) violation = "link terdeteksi"
    }

    // Anti-badword
    if (groupCfg.rules?.antibadword && text) {
      const badwords = [...(groupCfg.badwords || []), ...(modCfg.globalBadwords || [])]
      if (badwords.some(w => text.includes(w.toLowerCase()))) {
        violation = "badword terdeteksi"
      }
    }

    // Anti-sticker
    if (groupCfg.rules?.antisticker && m.message?.stickerMessage) {
      violation = "sticker dilarang"
    }

    // Anti-voice
    if (groupCfg.rules?.antivoice && m.message?.audioMessage?.ptt) {
      violation = "voice note dilarang"
    }

    if (!violation) return

    // Track violation
    groupCfg.violations = (groupCfg.violations || 0) + 1
    if (!groupCfg.warnings) groupCfg.warnings = {}
    groupCfg.warnings[sender] = (groupCfg.warnings[sender] || 0) + 1
    saveAutomodData()

    const action = groupCfg.action || "warn"

    if (action === "delete") {
      try { await sock.sendMessage(chat, { delete: m.key }) } catch {}
      await sock.sendMessage(chat, {
        text: "「 ✦ Auto Mod ✦ 」\nPesan dihapus: " + violation + "\nby @" + sender.split("@")[0] + "",
        mentions: [sender]
      })
    } else if (action === "warn") {
      const warns = groupCfg.warnings[sender] || 1
      await sock.sendMessage(chat, {
        text: "「 ✦ Auto Mod Warning ✦ 」\n@" + sender.split("@")[0] + " — " + violation + "\nWarning " + warns + "/3",
        mentions: [sender]
      })
      // Auto-kick after 3 warnings
      if (warns >= 3) {
        try {
          await sock.groupParticipantsUpdate(chat, [sender], "remove")
          await sock.sendMessage(chat, {
            text: "「 ✦ Auto Mod ✦ 」\n@" + sender.split("@")[0] + " dikeluarkan (3 warnings)",
            mentions: [sender]
          })
        } catch {}
      }
    } else if (action === "kick") {
      try {
        await sock.sendMessage(chat, { delete: m.key })
        await sock.groupParticipantsUpdate(chat, [sender], "remove")
        await sock.sendMessage(chat, {
          text: "「 ✦ Auto Mod ✦ 」\n@" + sender.split("@")[0] + " dikeluarkan: " + violation + "",
          mentions: [sender]
        })
      } catch {}
    }
  } catch (e) {
    console.error("[automation-hub] automod error:", e.message)
  }
}

// ==================== ACTIVITY TRACKER ====================

export function trackActivity(m) {
  try {
    const data = getAutomodData()
    if (!data.activityStats) {
      data.activityStats = {
        commands: {}, groups: {}, users: {},
        messages: 0, errors: 0, newMembers: 0, startedAt: Date.now(),
      }
    }
    const stats = data.activityStats
    stats.messages = (stats.messages || 0) + 1

    const chat = m.key?.remoteJid
    const sender = m.key?.participant || m.key?.remoteJid

    if (chat?.endsWith("@g.us")) {
      stats.groups[chat] = (stats.groups[chat] || 0) + 1
    }
    if (sender && m.command) {
      stats.users[sender] = (stats.users[sender] || 0) + 1
      stats.commands[m.command] = (stats.commands[m.command] || 0) + 1
    }
    saveAutomodData()
  } catch {}
}

export function trackError() {
  try {
    const data = getAutomodData()
    if (!data.activityStats) return
    data.activityStats.errors = (data.activityStats.errors || 0) + 1
    saveAutomodData()
  } catch {}
}

// ==================== MAIN LOOP ====================

async function automationLoop() {
  try { await checkVPSHealth() } catch (e) { console.error("[hub] VPS:", e.message) }
  try { await checkCrashGuard() } catch (e) { console.error("[hub] crash:", e.message) }
  try { await checkSmartDigest() } catch (e) { console.error("[hub] digest:", e.message) }
}

export function initAutomationHub(sock) {
  if (loopInterval) clearInterval(loopInterval)
  sockInstance = sock

  // Run every 60 seconds
  loopInterval = setInterval(automationLoop, 60000)

  // Initial run after 5 seconds
  setTimeout(automationLoop, 5000)

  console.log("[automation-hub] Initialized — monitoring VPS, PM2, digest schedule")
}

export function stopAutomationHub() {
  if (loopInterval) {
    clearInterval(loopInterval)
    loopInterval = null
  }
  console.log("[automation-hub] Stopped")
}

export function isHubRunning() {
  return loopInterval !== null
}
