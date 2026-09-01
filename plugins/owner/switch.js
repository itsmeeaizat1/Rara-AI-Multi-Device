// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Unified Switch: Dispatcher untuk semua toggle on/off (channel, group, auto, fitur)
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { pluginStore } from '../../src/lib/nova-plugins.js'
import {
  NOTIFY_EVENTS, getAllNotifyStatus, setNotifyEnabled
} from '../../src/lib/nova-saluran-broadcast.js'
import { toSC, claraWrap, bracketBox, tipText, separator, novaCaption } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'

// Auto feature library imports
import { enableAutoBackup, disableAutoBackup, getBackupStatus } from '../../src/lib/nova-auto-backup.js'
import { enableHealthCheck, disableHealthCheck, getHealthStatus } from '../../src/lib/nova-auto-api-health.js'
import { enableReengage, disableReengage, getReengageStatus } from '../../src/lib/nova-auto-reengage.js'
import { enableRefill, disableRefill, getRefillStatus } from '../../src/lib/nova-auto-refill.js'
import { enableRenewalReminder, disableRenewalReminder, getRenewalStatus } from '../../src/lib/nova-auto-renewal.js'
import { enableAutoReport, disableAutoReport, getReportStatus } from '../../src/lib/nova-auto-report.js'
import { enableAutoBirthday, disableAutoBirthday, getBirthdayStatus } from '../../src/lib/nova-auto-birthday.js'
import { getBmkgStatus, updateBmkgSettings, startBmkgJobs, stopBmkgJobs } from '../../src/lib/nova-bmkg-scheduler.js'
import { getCuacaStatus, updateCuacaSettings, startCuacaJobs, stopCuacaJobs } from '../../src/lib/nova-bmkg-cuaca-scheduler.js'
import { getSettings as getCleanSettings, updateSettings as updateCleanSettings, startCleaner, stopCleaner } from '../../src/lib/nova-cache-cleaner.js'

const pluginConfig = {
  name: "switch",
  alias: [
    "switch", "enable", "disable", "togglefitur", "onofffitur", "onoff",
    // Auto aliases — semua command auto* lama tetap works
    "autoread", "autotyping", "autojoingc", "autoreadsw", "autoreactsw",
    "autobackup", "autohealth", "autoreengage", "autorefill", "autorenewal",
    "autoreport", "autoulah", "autobmkg", "autocleancache", "autocuaca",
    "autoreactsticker", "autoreactvn", "autosholat", "autostatusview",
    "autotranslatevn", "autoforward", "autosambut", "automod",
    "autobroadcastchannel", "autobackupdrive"
  ],
  category: "owner",
  description: 'Switch on/off semua fitur (channel, group, auto, command)',
  usage: '.switch [channel|group|auto|fitur]',
  example: '.switch channel\n.switch group welcome\n.switch auto autobackup on\n.switch fitur off rpg',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

// ═══════════════════════════════════════════════════════════
// GROUP FEATURES (dari enable.js + disable.js)
// ═══════════════════════════════════════════════════════════
const GROUP_FEATURES = {
  welcome:       { label: "Welcome",        dbKey: "welcome",       on: true,  off: false },
  goodbye:       { label: "Goodbye",        dbKey: "goodbye",       on: true,  off: false },
  autoreaction:  { label: "Auto Reaction",  dbKey: "autoreaction",  on: true,  off: false },
  autosticker:   { label: "Auto Sticker",   dbKey: "autosticker",    on: true,  off: false },
  autoreply:     { label: "Auto Reply",     dbKey: "autoreply",      on: true,  off: false },
  automedia:     { label: "Auto Media",     dbKey: "automedia",      on: true,  off: false },
  autodl:        { label: "Auto Download",  dbKey: "autodl",         on: true,  off: false },
  autosambut:    { label: "Auto Sambut",    dbKey: "autoSambut",     on: true,  off: false },
  autoforward:   { label: "Auto Forward",   dbKey: "autoforward",    on: true,  off: false },
  antilinkgc:    { label: "Anti Link Grup", dbKey: "antilinkgc",     on: "on",  off: "off", modeKey: "antilinkgcMode",  modes: ["kick","remove"] },
  antilinkall:   { label: "Anti Link All",  dbKey: "antilinkall",    on: "on",  off: "off", modeKey: "antilinkallMode", modes: ["kick","remove"] },
  antivn:        { label: "Anti VN",        dbKey: "antivn",         on: true,  off: false },
  antifoto:      { label: "Anti Foto",      dbKey: "antifoto",       on: true,  off: false },
  antivideo:     { label: "Anti Video",     dbKey: "antivideo",      on: true,  off: false },
  antisticker:   { label: "Anti Sticker",   dbKey: "antisticker",    on: "on",  off: "off" },
  antitoxic:     { label: "Anti Toxic",     dbKey: "antitoxic",      on: true,  off: false },
  antikasar:     { label: "Anti Kasar",     dbKey: "antikasar",      on: "on",  off: "off" },
  anti18plus:    { label: "Anti 18+",       dbKey: "anti18plus",     on: "on",  off: "off" },
  antibucin:     { label: "Anti Bucin",     dbKey: "antibucin",      on: "on",  off: "off" },
  antijudol:     { label: "Anti Judol",     dbKey: "antijudol",      on: "on",  off: "off" },
  antiribut:     { label: "Anti Ribut",     dbKey: "antiribut",      on: "on",  off: "off" },
  antibot:       { label: "Anti Bot",       dbKey: "antibot",        on: true,  off: false },
  antiphising:   { label: "Anti Phising",   dbKey: "antiphising",    on: "on",  off: "off" },
  antiswgc:      { label: "Anti SW Grup",   dbKey: "antiswgc",       on: "on",  off: "off" },
  antitagsw:     { label: "Anti Tag SW",    dbKey: "antitagsw",      on: "on",  off: "off" },
  antiremove:    { label: "Anti Delete",    dbKey: "antiremove",     on: "on",  off: "off" },
  anticustom:    { label: "Anti Custom",    dbKey: "anticustom",     on: "on",  off: "off", modeKey: "anticustomMode", modes: ["kick","remove","warn"] },
  antimedia:     { label: "Anti Media",     dbKey: "antimedia",      on: "on",  off: "off" },
  antidocument: { label: "Anti Document",   dbKey: "antidocument",  on: "on",  off: "off" },
  antivirtex:    { label: "Anti Virtex",    dbKey: "antivirtex",     on: true,  off: false },
  antibug:       { label: "Anti Bug",       dbKey: "antibug",         on: true,  off: false },
  antinomorluar: { label: "Anti Nomor Luar", dbKey: "antinomorluar", on: true,  off: false, extraKey: "nomorluarBlock", defaultExtra: "60" },
  antispam:      { label: "Anti Spam",      dbKey: "antispam",       on: "on",  off: "off" },
  mutegc:        { label: "Mute Grup",      dbKey: "mutegc",         on: true,  off: false },
}

const GROUP_ALIASES = {
  antilink: "antilinkgc", antigc: "antilinkgc",
  antiall: "antilinkall", antitagall: "antilinkall",
  asticker: "antisticker", astkr: "antisticker",
  antidelete: "antiremove", antihapus: "antiremove", ar: "antiremove",
  toxic: "antitoxic", kasar: "antikasar",
  nsfw: "anti18plus", "18+": "anti18plus",
  bucin: "antibucin", judol: "antijudol", ribut: "antiribut",
  sambut: "autosambut", forward: "autoforward",
  reaction: "autoreaction", sticker: "autosticker",
  reply: "autoreply", media: "automedia",
  download: "autodl", spam: "antispam",
  bot: "antibot", phising: "antiphising",
  swgc: "antiswgc", tagsw: "antitagsw",
  antivid: "antivideo", novideo: "antivideo", avn: "antivn", voice: "antivn", vn: "antivn",
  foto: "antifoto", image: "antifoto", photo: "antifoto", novid: "antivideo",
  mute: "mutegc", virtex: "antivirtex", virus: "antivirtex", bug: "antibug",
  nomorluar: "antinomorluar", asing: "antinomorluar", foreign: "antinomorluar",
  bye: "goodbye", wb: "welcome",
}

const GROUP_CATEGORIES = {
  "Main":       ["welcome", "goodbye", "autoreaction", "autosticker", "autoreply", "automedia", "autodl", "autosambut", "autoforward"],
  "Anti Link":  ["antilinkgc", "antilinkall"],
  "Anti Media": ["antivn", "antifoto", "antivideo", "antisticker", "antimedia", "antidocument"],
  "Anti Toxic": ["antitoxic", "antikasar", "anti18plus", "antibucin", "antijudol", "antiribut"],
  "Anti Lain":  ["antibot", "antiphising", "antiswgc", "antitagsw", "antiremove", "anticustom", "antispam", "antivirtex", "antibug", "antinomorluar"],
  "Grup":       ["mutegc"],
}

function isOn(value, onValue) {
  return value === onValue || value === true || value === "on"
}

// ═══════════════════════════════════════════════════════════
// AUTO FEATURES REGISTRY
// ═══════════════════════════════════════════════════════════
// Tiap entry: { label, getStatus: () => boolean, toggle: (on) => void }

const AUTO_REGISTRY = {
  autoread: {
    label: "Auto Read",
    getStatus: () => { try { return getDatabase().setting("autoRead") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoRead", on) },
  },
  autotyping: {
    label: "Auto Typing",
    getStatus: () => { try { return getDatabase().setting("autoTyping") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoTyping", on) },
  },
  autojoingc: {
    label: "Auto Join Grup",
    getStatus: () => { try { return getDatabase().setting("autoJoinGc") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoJoinGc", on) },
  },
  autoreadsw: {
    label: "Auto Read Story",
    getStatus: () => { try { return (getDatabase().setting("autoReadSW") || {}).enabled ?? false } catch { return false } },
    toggle: (on) => { const db = getDatabase(); const cur = db.setting("autoReadSW") || {}; db.setting("autoReadSW", { ...cur, enabled: on }) },
  },
  autoreactsw: {
    label: "Auto React Story",
    getStatus: () => { try { return (getDatabase().setting("autoReactSW") || {}).enabled ?? false } catch { return false } },
    toggle: (on) => { const db = getDatabase(); const cur = db.setting("autoReactSW") || { emoji: "🔥" }; db.setting("autoReactSW", { ...cur, enabled: on }) },
  },
  autobackup: {
    label: "Auto Backup DB",
    getStatus: () => { try { return getBackupStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableAutoBackup() : disableAutoBackup() },
  },
  autohealth: {
    label: "Auto API Health Check",
    getStatus: () => { try { return getHealthStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableHealthCheck() : disableHealthCheck() },
  },
  autoreengage: {
    label: "Auto Re-engage",
    getStatus: () => { try { return getReengageStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableReengage() : disableReengage() },
  },
  autorefill: {
    label: "Auto Refill Notif",
    getStatus: () => { try { return getRefillStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableRefill() : disableRefill() },
  },
  autorenewal: {
    label: "Auto Renewal Reminder",
    getStatus: () => { try { return getRenewalStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableRenewalReminder() : disableRenewalReminder() },
  },
  autoreport: {
    label: "Auto Report Harian",
    getStatus: () => { try { return getReportStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableAutoReport() : disableAutoReport() },
  },
  autoulah: {
    label: "Auto Birthday",
    getStatus: () => { try { return getBirthdayStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableAutoBirthday() : disableAutoBirthday() },
  },
  autobmkg: {
    label: "Auto BMKG Gempa",
    getStatus: () => { try { return getBmkgStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => {
      if (on) { const s = updateBmkgSettings(c => ({ ...c, enabled: true })); startBmkgJobs(s) }
      else { updateBmkgSettings(c => ({ ...c, enabled: false })); stopBmkgJobs() }
    },
  },
  autocuaca: {
    label: "Auto Cuaca",
    getStatus: () => { try { return getCuacaStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => {
      if (on) { const s = updateCuacaSettings(c => ({ ...c, enabled: true })); startCuacaJobs(s) }
      else { updateCuacaSettings(c => ({ ...c, enabled: false })); stopCuacaJobs() }
    },
  },
  autocleancache: {
    label: "Auto Clean Cache",
    getStatus: () => { try { return getCleanSettings()?.enabled ?? false } catch { return false } },
    toggle: (on) => {
      if (on) { const s = updateCleanSettings({ enabled: true }); startCleaner(s) }
      else { stopCleaner(); updateCleanSettings({ enabled: false }) }
    },
  },
  autoreactsticker: {
    label: "Auto React Sticker",
    getStatus: () => { try { return getDatabase().setting("autoreactstickerEnabled") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoreactstickerEnabled", on) },
  },
  autoreactvn: {
    label: "Auto React VN",
    getStatus: () => { try { return getDatabase().setting("autoreactvnEnabled") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoreactvnEnabled", on) },
  },
  autosholat: {
    label: "Auto Sholat",
    getStatus: () => { try { return getDatabase().setting("autoSholat") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoSholat", on) },
  },
  autoforward: {
    label: "Auto Forward",
    getStatus: () => { try { const db = getDatabase(); if (!db.db?.data?.automation?.autoforward) return false; return db.db.data.automation.autoforward.enabled } catch { return false } },
    toggle: (on) => { try { const db = getDatabase(); if (!db.db.data.automation) db.db.data.automation = {}; if (!db.db.data.automation.autoforward) db.db.data.automation.autoforward = { enabled: false, keywords: [], scope: "all", forwardedCount: 0 }; db.db.data.automation.autoforward.enabled = on; db.markDirty("settings"); db.db.write?.() } catch {} },
  },
  autosambut: {
    label: "Auto Sambut (Owner)",
    getStatus: () => { try { const db = getDatabase(); const g = db.getGroup(m?.chat) || {}; return g.autoSambut?.enabled ?? false } catch { return false } },
    toggle: (on) => { try { const db = getDatabase(); const g = db.getGroup(m?.chat) || {}; db.setGroup(m?.chat, { autoSambut: { ...g.autoSambut, enabled: on } }) } catch {} },
  },
}

// Kategori untuk tampilan
const AUTO_CATEGORIES = {
  "Pesan":      ["autoread", "autotyping", "autojoingc"],
  "Story":      ["autoreadsw", "autoreactsw"],
  "Sistem":     ["autobackup", "autohealth", "autocleancache", "autoreport"],
  "Notifikasi": ["autorefill", "autorenewal", "autoreengage", "autoulah"],
  "Info":       ["autobmkg", "autocuaca", "autosholat"],
  "Reaksi":     ["autoreactsticker", "autoreactvn"],
  "Grup":       ["autoforward", "autosambut"],
}

// ═══════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════
const AUTO_KEYS = Object.keys(AUTO_REGISTRY)
const AUTO_ALIASES = {
  autobday: "autoulah", autobirthday: "autoulah",
  apicheck: "autohealth", aphealth: "autohealth",
  autocuacav2: "autocuaca",
  autobcchannel: "autobroadcastchannel", autobc: "autobroadcastchannel",
  autobroadcast: "autobroadcastchannel", autochannel: "autobroadcastchannel",
  autobcchannel: "autobroadcastchannel",
  autostatusview: "autoreadsw", // autostatusview = gabungan autoreadsw + autoreactsw
}

function getMode(cmd, args) {
  const c = (cmd || '').toLowerCase()
  // Legacy alias routing
  if (c === 'enable') return 'group:on'
  if (c === 'disable') return 'group:off'
  if (c === 'togglefitur' || c === 'onofffitur' || c === 'onoff') return 'fitur'

  // Auto* direct aliases — kalau command本身就是 auto feature
  const autoAlias = AUTO_ALIASES[c] || (AUTO_KEYS.includes(c) ? c : null)
  if (autoAlias) return `auto:${autoAlias}`

  const a = (args[0] || '').toLowerCase()
  if (a === 'channel') return 'channel'
  if (a === 'group' || a === 'grup') return 'group'
  if (a === 'auto') {
    const sub = (args[1] || '').toLowerCase()
    const subResolved = AUTO_ALIASES[sub] || (AUTO_KEYS.includes(sub) ? sub : '')
    return subResolved ? `auto:${subResolved}` : 'auto'
  }
  if (a === 'fitur' || a === 'command' || a === 'cmd') return 'fitur'
  return 'menu'
}

// ═══════════════════════════════════════════════════════════
// SALURAN HANDLER
// ═══════════════════════════════════════════════════════════
async function handleChannel(m, { sock, config: cfg }) {
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  const subCmd = args[1]?.toLowerCase()

  if (!subCmd || subCmd === 'status' || subCmd === 'cek') {
    const statuses = getAllNotifyStatus()
    let onCount = 0, offCount = 0
    let text = claraWrap("Switch Channel", `│ Channel: *${cfg?.saluran?.name || "Belum diset nih"}*\n│ Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`) + "\n" + toSC("STATUS TOGGLE") + ":\n\n"

    for (const [key, info] of Object.entries(statuses)) {
      const emoji = info.enabled ? "🟢" : "🔴"
      text += `${emoji} *${info.label}*\n`
      text += `Status: *${info.enabled ? "ON" : "OFF"}* | \`${prefix}switch channel ${key}\`\n\n`
      if (info.enabled) onCount++; else offCount++
    }
    text += separator("━", 22) + "\n" + tipText(`ON: ${onCount} | OFF: ${offCount}`) + "\n" + tipText(`Toggle semua: \`${prefix}switch channel all on/off\``)
    return m.reply(text)
  }

  if (subCmd === 'all') {
    const action = args[2]?.toLowerCase()
    if (action !== 'on' && action !== 'off')
      return m.reply(claraWrap("Switch Channel", `Gunakan: \`${prefix}switch channel all on\` atau \`${prefix}switch channel all off\``))
    const enabled = action === 'on'
    let count = 0
    for (const key of Object.keys(NOTIFY_EVENTS)) { setNotifyEnabled(key, enabled); count++ }
    return m.reply(claraWrap("Switch Channel", "🔔") + "\n\n" + claraWrap(toSC("SEMUA EVENT"), `│ Status: *${enabled ? "ALL ON" : "ALL OFF"}*\n│ Total: *${count} event*`) + "\n\n" + tipText(`Cek status: \`${prefix}switch channel\``))
  }

  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus()
    const current = statuses[subCmd].enabled
    const newVal = !current
    setNotifyEnabled(subCmd, newVal)
    return m.reply(claraWrap("Switch Channel", "🔔") + "\n\n" + claraWrap(toSC("TOGGLE BERHASIL"), `│ Event: *${NOTIFY_EVENTS[subCmd]}*\n│ Status: *${newVal ? "ON" : "OFF"}*`) + "\n\n" + tipText(newVal ? "Notifikasi akan dikirim ke channel" : "Notifikasi dimatikan") + "\n" + tipText(`Cek semua: \`${prefix}switch channel\``))
  }

  let list = ""
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) list += `\`${key}\` — ${label}\n`
  return m.reply(claraWrap("Switch Channel", `Event: *${subCmd}*\nTidak ada dalam daftar toggle`) + "\n" + toSC("EVENT TERSEDIA") + ":\n\n" + list + "\n" + tipText(`Contoh: \`${prefix}switch channel sewaRegister\``))
}

// ═══════════════════════════════════════════════════════════
// GROUP HANDLER
// ═══════════════════════════════════════════════════════════
async function handleGroup(m, { sock, config: cfg, forceOff }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  let featureName, mode

  if (forceOff) {
    featureName = (args[0] || '').toLowerCase()
    mode = null
  } else {
    featureName = (args[1] || '').toLowerCase()
    mode = (args[2] || '').toLowerCase()
    if (featureName === 'off') {
      forceOff = true
      featureName = mode
      mode = null
    }
  }

  if (!featureName) {
    const groupData = db.getGroup(m.chat) || {}
    let txt = `╭─「 *${toSC('SWITCH GROUP')}* 」\n\n`
    for (const [cat, features] of Object.entries(GROUP_CATEGORIES)) {
      txt += `│ *${toSC(cat)}*\n`
      for (const feat of features) {
        const f = GROUP_FEATURES[feat]
        if (!f) continue
        const current = groupData[f.dbKey]
        const active = isOn(current, f.on)
        txt += `│   ${active ? "🟢" : "🔴"} ${feat}\n`
      }
      txt += `\n`
    }
    txt += `╰──────────\n`
    txt += tipText(`ON: \`${prefix}switch group <fitur>\` | OFF: \`${prefix}switch group off <fitur>\``)
    return m.reply(txt)
  }

  const resolved = GROUP_ALIASES[featureName] || featureName
  const feature = GROUP_FEATURES[resolved]

  if (!feature)
    return m.reply(`╭─「 *${toSC('Switch Group')}* 」\n│ ❌ ${toSC('Fitur tidak ditemukan')}: ${featureName}\n│ ${toSC('Ketik')} \`${prefix}switch group\` ${toSC('untuk melihat daftar')}\n╰──────────`)

  const groupData = db.getGroup(m.chat) || {}

  if (forceOff) {
    db.setGroup(m.chat, { [feature.dbKey]: feature.off })
    return m.reply(`╭─「 *${toSC('SWITCH GROUP')}* 」\n│ 🔴 ${toSC(feature.label)}: OFF\n╰──────────`)
  }

  let update = { [feature.dbKey]: feature.on }
  if (feature.modes && mode && feature.modes.includes(mode))
    update[feature.modeKey] = mode
  if (feature.extraKey && mode && /^\d+$/.test(mode))
    update[feature.extraKey] = mode

  db.setGroup(m.chat, update)
  let txt = `╭─「 *${toSC('SWITCH GROUP')}* 」\n│ 🟢 ${toSC(feature.label)}: ON`
  if (feature.modes) {
    const newMode = mode && feature.modes.includes(mode) ? mode : (groupData[feature.modeKey] || feature.modes[0])
    txt += `\n│ ${toSC('Mode')}: ${newMode}`
  }
  txt += `\n╰──────────`
  return m.reply(txt)
}

// ═══════════════════════════════════════════════════════════
// AUTO HANDLER
// ═══════════════════════════════════════════════════════════
async function handleAuto(m, { sock, config: cfg, autoKey }) {
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []

  // Kalau autoKey di-pass (dari alias .autoread dll), ambil action dari args[0]
  // Kalau dari .switch auto <key> <action>, autoKey sudah resolved
  let action
  if (autoKey) {
    // Dipanggil dari alias langsung: .autoread on/off
    action = (args[0] || '').toLowerCase()
  } else {
    // Dipanggil dari .switch auto — show status list
    action = (args[2] || '').toLowerCase()
  }

  // No specific key — show all auto features status
  if (!autoKey) {
    let txt = `╭─「 *${toSC('SWITCH AUTO')}* 」\n\n`
    for (const [cat, features] of Object.entries(AUTO_CATEGORIES)) {
      txt += `│ *${toSC(cat)}*\n`
      for (const key of features) {
        const reg = AUTO_REGISTRY[key]
        if (!reg) continue
        const enabled = reg.getStatus()
        txt += `│   ${enabled ? "🟢" : "🔴"} ${key}\n`
      }
      txt += `\n`
    }
    txt += `╰──────────\n`
    txt += tipText(`ON: \`${prefix}switch auto <nama> on\` | OFF: \`${prefix}switch auto <nama> off\``)
    return m.reply(txt)
  }

  const reg = AUTO_REGISTRY[autoKey]
  if (!reg)
    return m.reply(`╭─「 *${toSC('SWITCH AUTO')}* 」\n│ ❌ ${toSC('Fitur tidak ditemukan')}: ${autoKey}\n│ ${toSC('Ketik')} \`${prefix}switch auto\` ${toSC('untuk melihat daftar')}\n╰──────────`)

  // No action — show status + usage
  if (!action || (action !== 'on' && action !== 'off')) {
    const current = reg.getStatus()
    return m.reply(`╭─「 *${toSC('SWITCH AUTO')}* 」\n│ ${current ? "🟢" : "🔴"} ${toSC(reg.label)}: ${current ? "ON" : "OFF"}\n│ \`${prefix}switch auto ${autoKey} on\` — ${toSC('aktifkan')}\n│ \`${prefix}switch auto ${autoKey} off\` — ${toSC('matikan')}\n╰──────────`)
  }

  // Toggle
  const enable = action === 'on'
  try {
    reg.toggle(enable)
    return m.reply(`╭─「 *${toSC('SWITCH AUTO')}* 」\n│ ${enable ? "🟢" : "🔴"} ${toSC(reg.label)}: ${enable ? "ON" : "OFF"}\n╰──────────`)
  } catch (e) {
    return m.reply(`╭─「 *${toSC('SWITCH AUTO')}* 」\n│ ❌ ${e.message || e}\n╰──────────`)
  }
}

// ═══════════════════════════════════════════════════════════
// FITUR HANDLER
// ═══════════════════════════════════════════════════════════
async function handleFitur(m, { sock, config: cfg }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  let action, target

  if (args[0]?.toLowerCase() === 'fitur' || args[0]?.toLowerCase() === 'command' || args[0]?.toLowerCase() === 'cmd') {
    action = (args[1] || '').toLowerCase()
    target = (args[2] || '').toLowerCase()
  } else {
    action = (args[0] || '').toLowerCase()
    target = (args[1] || '').toLowerCase()
  }

  const disabledCmds = db.setting("disabledCommands") || []
  const disabledCats = db.setting("disabledCategories") || []

  if (!action) {
    let text = `╭─「 *${toSC('SWITCH FITUR')}* 」\n\n`
    text += `│ 📋 ${toSC('Panduan')}:\n`
    text += `│ • \`${prefix}switch fitur off rpg\` → ${toSC('matikan kategori')}\n`
    text += `│ • \`${prefix}switch fitur on kencanmatch\` → ${toSC('hidupkan command')}\n`
    text += `│ • \`${prefix}switch fitur list\` → ${toSC('lihat semua status')}\n\n`
    text += `│ 🔴 ${toSC('Kategori Nonaktif')}:\n`
    text += disabledCats.length > 0 ? `│   ${disabledCats.map(c => "`" + c + "`").join(", ")}\n` : `│   (${toSC('semua kategori aktif')})\n`
    text += `\n│ 🔴 ${toSC('Command Nonaktif')}:\n`
    text += disabledCmds.length > 0 ? `│   ${disabledCmds.map(c => "`" + c + "`").join(", ")}\n` : `│   (${toSC('semua command aktif')})\n`
    text += `\n╰──────────`
    return m.reply(text)
  }

  if (action === 'list') {
    const allCats = [...(pluginStore.categories?.keys() || [])].sort()
    let text = `╭─「 *${toSC('DAFTAR FITUR')}* 」\n\n`
    text += `│ 📂 ${toSC('KATEGORI')} (${allCats.length})\n`
    for (const cat of allCats) {
      const isOff = disabledCats.includes(cat)
      text += `│   ${isOff ? "🔴" : "🟢"} ${cat}\n`
    }
    if (disabledCmds.length > 0) {
      text += `\n│ ⚙️ ${toSC('COMMAND NONAKTIF')} (${disabledCmds.length})\n`
      for (const cmd of disabledCmds) text += `│   🔴 ${cmd}\n`
    }
    text += `\n╰──────────`
    return m.reply(text)
  }

  let mode = '', name = ''
  if (action === 'on') { mode = 'on'; name = target }
  else if (action === 'off') { mode = 'off'; name = target }
  else { mode = 'toggle'; name = action }

  if (!name)
    return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n│ ${toSC('Contoh')}: \`${prefix}switch fitur off rpg\`\n│ ${toSC('Contoh')}: \`${prefix}switch fitur on kencanmatch\`\n╰──────────`)

  const allCats = [...(pluginStore.categories?.keys() || [])].sort()
  const allCmds = [...(pluginStore.commands?.keys() || [])].sort()
  const isCategory = allCats.includes(name)
  const isCommand = allCmds.includes(name)

  if (!isCategory && !isCommand)
    return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n│ ❌ ${toSC('Tidak ditemukan')}: ${name}\n│ ${toSC('Ketik')} \`${prefix}switch fitur list\`\n╰──────────`)
  if (isCommand && name === 'switch')
    return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n│ ❌ ${toSC('Tidak bisa menonaktifkan command ini')}\n╰──────────`)

  const type = isCategory ? "kategori" : "command"
  const list = isCategory ? disabledCats : disabledCmds
  const idx = list.indexOf(name)
  const isCurrentlyOff = idx !== -1
  let newState

  if (mode === 'on') {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n│ ✅ ${toSC(type)} ${name} ${toSC('sudah aktif')}\n╰──────────`)
  } else if (mode === 'off') {
    if (!isCurrentlyOff) { list.push(name); newState = true }
    else return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n│ 🔴 ${toSC(type)} ${name} ${toSC('sudah nonaktif')}\n╰──────────`)
  } else {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else { list.push(name); newState = true }
  }

  if (isCategory) db.setting("disabledCategories", disabledCats)
  else db.setting("disabledCommands", disabledCmds)

  const status = newState ? "🔴 Nonaktif" : "🟢 Aktif"
  const emoji = newState ? "⏸️" : "▶️"
  return m.reply(`╭─「 *${toSC('SWITCH FITUR')}* 」\n\n│ ${emoji} ${toSC(type.charAt(0).toUpperCase() + type.slice(1))}: *${name}*\n│ ${toSC('Status')}: ${status}\n\n╰──────────`)
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const prefix = m.prefix || '.'
  const text = `╭─「 *${toSC('SWITCH')}* 」
│ ${toSC('Pilih kategori toggle')}:
│
│ 📢 *${toSC('SALURAN')}*
│   ${toSC('Notifikasi event ke channel WhatsApp')}
│   \`${prefix}switch channel\`
│
│ 🏠 *${toSC('GROUP')}*
│   ${toSC('Fitur grup (welcome, antilink, anti-toxic, dll)')}
│   \`${prefix}switch group\`
│
│ ⚡ *${toSC('AUTO')}*
│   ${toSC('Semua fitur auto (backup, read, typing, BMKG, dll)')}
│   \`${prefix}switch auto\`
│
│ ⚙️ *${toSC('FITUR')}*
│   ${toSC('On/off command atau kategori plugin')}
│   \`${prefix}switch fitur\`
│
╰──────────

${toSC('Alias lama masih works')}: .enable .disable .togglefitur .autoread .autobackup dll`

  try {
    const thumb = fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'nova.jpg'))
    await sock.sendButton(m.chat, thumb, text, m, {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📢 Channel', id: `${prefix}switch channel` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Group', id: `${prefix}switch group` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⚡ Auto', id: `${prefix}switch auto` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⚙️ Fitur', id: `${prefix}switch fitur` }) },
      ],
    })
  } catch {
    await m.reply(text)
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
async function handler(m, { sock, config: cfg }) {
  try {
    const cmd = m.command || ''
    const args = m.args || []
    const mode = getMode(cmd, args)

    if (mode === 'menu') return showMenu(m, sock)
    if (mode === 'channel') return handleChannel(m, { sock, config: cfg })
    if (mode === 'group') return handleGroup(m, { sock, config: cfg })
    if (mode === 'group:on') return handleGroup(m, { sock, config: cfg })
    if (mode === 'group:off') return handleGroup(m, { sock, config: cfg, forceOff: true })
    if (mode === 'fitur') return handleFitur(m, { sock, config: cfg })
    if (mode === 'auto') return handleAuto(m, { sock, config: cfg })
    if (mode.startsWith('auto:')) {
      const autoKey = mode.split(':')[1]
      return handleAuto(m, { sock, config: cfg, autoKey })
    }

    return showMenu(m, sock)
  } catch (e) {
    return m.reply(`╭─「 *${toSC('SWITCH')}* 」\n│ ❌ ${e.message || e}\n╰──────────`)
  }
}

export { pluginConfig as config, handler }
