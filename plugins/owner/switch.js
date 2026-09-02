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
    // Auto* aliases dihapus — masing-masing punya plugin sendiri
    // .switch auto <feature> on/off tetap works via "switch" command
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
    label: "Auto Re-engage Users",
    getStatus: () => { try { return getReengageStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableReengage() : disableReengage() },
  },
  autorefill: {
    label: "Auto Refill Limit/Energi",
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
    label: "Auto Ucapan Ulang Tahun",
    getStatus: () => { try { return getBirthdayStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { on ? enableAutoBirthday() : disableAutoBirthday() },
  },
  autobmkg: {
    label: "Auto Info Gempa BMKG",
    getStatus: () => { try { return getBmkgStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { updateBmkgSettings({ enabled: on }); on ? startBmkgJobs() : stopBmkgJobs() },
  },
  autocuaca: {
    label: "Auto Info Cuaca BMKG",
    getStatus: () => { try { return getCuacaStatus()?.enabled ?? false } catch { return false } },
    toggle: (on) => { updateCuacaSettings({ enabled: on }); on ? startCuacaJobs() : stopCuacaJobs() },
  },
  autocleancache: {
    label: "Auto Clean Cache & Temp",
    getStatus: () => { try { return getCleanSettings()?.enabled ?? false } catch { return false } },
    toggle: (on) => { updateCleanSettings({ enabled: on }); on ? startCleaner() : stopCleaner() },
  },
  autoreactsticker: {
    label: "Auto React Sticker",
    getStatus: () => { try { return getDatabase().setting("autoReactSticker") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoReactSticker", on) },
  },
  autoreactvn: {
    label: "Auto React Voice Note",
    getStatus: () => { try { return getDatabase().setting("autoReactVN") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoReactVN", on) },
  },
  autosholat: {
    label: "Auto Reminder Sholat",
    getStatus: () => { try { return getDatabase().setting("autoSholat") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoSholat", on) },
  },
  autostatusview: {
    label: "Auto View Status/Story",
    getStatus: () => { try { return getDatabase().setting("autoStatusView") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoStatusView", on) },
  },
  autotranslatevn: {
    label: "Auto Translate VN (Speech-to-Text)",
    getStatus: () => { try { return getDatabase().setting("autoTranslateVN") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoTranslateVN", on) },
  },
  autoforward: {
    label: "Auto Forward Message",
    getStatus: () => { try { return getDatabase().setting("autoForward") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoForward", on) },
  },
  autosambut: {
    label: "Auto Sambut Member Baru",
    getStatus: () => { try { return getDatabase().setting("autoSambut") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoSambut", on) },
  },
  automod: {
    label: "Auto Moderation",
    getStatus: () => { try { return getDatabase().setting("autoMod") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoMod", on) },
  },
  autobroadcastchannel: {
    label: "Auto Broadcast ke Saluran",
    getStatus: () => { try { return getDatabase().setting("autoBroadcastChannel") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoBroadcastChannel", on) },
  },
  autobackupdrive: {
    label: "Auto Backup Google Drive",
    getStatus: () => { try { return getDatabase().setting("autoBackupDrive") ?? false } catch { return false } },
    toggle: (on) => { getDatabase().setting("autoBackupDrive", on) },
  },
}

const AUTO_ALIASES = {
  read: "autoread", typing: "autotyping", join: "autojoingc", joingc: "autojoingc",
  readsw: "autoreadsw", reactsw: "autoreactsw", backup: "autobackup",
  health: "autohealth", reengage: "autoreengage", refill: "autorefill",
  renewal: "autorenewal", report: "autoreport", ulah: "autoulah", birthday: "autoulah",
  bmkg: "autobmkg", cuaca: "autocuaca", clean: "autocleancache", cleancache: "autocleancache",
  reactsticker: "autoreactsticker", reactvn: "autoreactvn", sholat: "autosholat",
  statusview: "autostatusview", translatevn: "autotranslatevn", forward: "autoforward",
  sambut: "autosambut", mod: "automod", broadcastchannel: "autobroadcastchannel",
  backupdrive: "autobackupdrive"
}

const AUTO_CATEGORIES = {
  "Sistem & Respon": [
    "autoread", "autotyping", "autojoingc", "autoreadsw", "autoreactsw",
    "autostatusview", "autotranslatevn", "autoreactsticker", "autoreactvn"
  ],
  "Pemeliharaan": [
    "autobackup", "autohealth", "autocleancache", "autobackupdrive"
  ],
  "Retensi & Finansial": [
    "autoreengage", "autorefill", "autorenewal", "autoreport", "autoulah"
  ],
  "Info & Utilitas": [
    "autobmkg", "autocuaca", "autosholat", "autoforward", "autosambut",
    "automod", "autobroadcastchannel"
  ]
}

const AUTO_KEYS = Object.keys(AUTO_REGISTRY)

// ═══════════════════════════════════════════════════════════
// PARSER INTENT & MODE
// ═══════════════════════════════════════════════════════════
function getMode(cmd, args) {
  const c = cmd.toLowerCase()
  const a = (args[0] || '').toLowerCase()

  if (AUTO_KEYS.includes(c) || AUTO_ALIASES[c]) {
    const key = AUTO_ALIASES[c] || c
    return `auto:${key}`
  }

  if (c === 'enable' || c === 'on') {
    if (a && GROUP_FEATURES[GROUP_ALIASES[a] || a]) return 'group:on'
    if (a === 'auto') return 'auto'
    if (a === 'channel') return 'channel'
    return 'group:on'
  }

  if (c === 'disable' || c === 'off') {
    if (a && GROUP_FEATURES[GROUP_ALIASES[a] || a]) return 'group:off'
    if (a === 'auto') return 'auto'
    if (a === 'channel') return 'channel'
    return 'group:off'
  }

  if (c === 'togglefitur' || c === 'onofffitur') return 'fitur'

  if (!a) return 'menu'
  if (a === 'channel' || a === 'saluran') return 'channel'
  if (a === 'group' || a === 'grup' || a === 'gc') return 'group'
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
    let text = claraWrap("Switch Channel", `Channel: *${cfg?.saluran?.name || "Belum diset nih"}*
Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`) + "\nSTATUS TOGGLE:\n\n"

    for (const [key, info] of Object.entries(statuses)) {
      text += `• ${info.label} — *${info.enabled ? "ON" : "OFF"}*\n`
      text += `\`${prefix}switch channel ${key}\`\n\n`
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
    return m.reply(claraWrap("Switch Channel", "🔔") + "\n\n" + claraWrap("SEMUA EVENT", `Status: *${enabled ? "ALL ON" : "ALL OFF"}*
Total: *${count} event*`) + "\n\n" + tipText(`Cek status: \`${prefix}switch channel\``))
  }

  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus()
    const current = statuses[subCmd].enabled
    const newVal = !current
    setNotifyEnabled(subCmd, newVal)
    return m.reply(claraWrap("Switch Channel", "🔔") + "\n\n" + claraWrap("TOGGLE BERHASIL", `Event: *${NOTIFY_EVENTS[subCmd]}*
Status: *${newVal ? "ON" : "OFF"}*`) + "\n\n" + tipText(newVal ? "Notifikasi akan dikirim ke channel" : "Notifikasi dimatikan") + "\n" + tipText(`Cek semua: \`${prefix}switch channel\``))
  }

  let list = ""
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) list += `\`${key}\` — ${label}\n`
  return m.reply(claraWrap("Switch Channel", `Event: *${subCmd}*\nTidak ada dalam daftar toggle`) + "\nEVENT TERSEDIA:\n\n" + list + "\n" + tipText(`Contoh: \`${prefix}switch channel sewaRegister\``))
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
    // Dari .switch off <fitur> atau .disable <fitur>
    featureName = (args[0] || '').toLowerCase()
    mode = null
  } else {
    featureName = (args[1] || '').toLowerCase()
    mode = (args[2] || '').toLowerCase()
    // Handle ".switch group goodbye off" — off di belakang
    if (mode === 'off' || mode === 'false' || mode === '0') {
      forceOff = true
      mode = null
    }
    // Handle ".switch group off goodbye" — off di depan fitur
    if (featureName === 'off' || featureName === 'false') {
      forceOff = true
      featureName = mode
      mode = null
    }
  }

  if (!featureName) {
    const groupData = db.getGroup(m.chat) || {}
    let txt = ""
    for (const [cat, features] of Object.entries(GROUP_CATEGORIES)) {
      txt += `*${cat}*\n`
      for (const feat of features) {
        const f = GROUP_FEATURES[feat]
        if (!f) continue
        const current = groupData[f.dbKey]
        const active = isOn(current, f.on)
        txt += `${active ? "ON" : "OFF"}  ${feat}\n`
      }
      txt += `\n`
    }
    txt += tipText(`ON: \`${prefix}switch group <fitur>\` | OFF: \`${prefix}switch group <fitur> off\``)
    return m.reply(txt.trim())
  }

  const resolved = GROUP_ALIASES[featureName] || featureName
  const feature = GROUP_FEATURES[resolved]

  if (!feature)
    return m.reply(`❌ Fitur tidak ditemukan: ${featureName}\nKetik \`${prefix}switch group\` untuk melihat daftar`)

  const groupData = db.getGroup(m.chat) || {}

  if (forceOff) {
    db.setGroup(m.chat, { [feature.dbKey]: feature.off })
    return m.reply(`${feature.label}: *OFF*`)
  }

  let update = { [feature.dbKey]: feature.on }
  if (feature.modes && mode && feature.modes.includes(mode))
    update[feature.modeKey] = mode
  if (feature.extraKey && mode && /^\d+$/.test(mode))
    update[feature.extraKey] = mode

  db.setGroup(m.chat, update)
  let txt = `${feature.label}: *ON*`
  if (feature.modes) {
    const newMode = mode && feature.modes.includes(mode) ? mode : (groupData[feature.modeKey] || feature.modes[0])
    txt += `\nMode: ${newMode}`
  }
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
    let txt = ""
    for (const [cat, features] of Object.entries(AUTO_CATEGORIES)) {
      txt += `*${cat}*\n`
      for (const key of features) {
        const reg = AUTO_REGISTRY[key]
        if (!reg) continue
        const enabled = reg.getStatus()
        txt += `${enabled ? "ON" : "OFF"}  ${key}\n`
      }
      txt += `\n`
    }
    txt += tipText(`ON: \`${prefix}switch auto <nama> on\` | OFF: \`${prefix}switch auto <nama> off\``)
    return m.reply(txt.trim())
  }

  const reg = AUTO_REGISTRY[autoKey]
  if (!reg)
    return m.reply(`❌ Fitur tidak ditemukan: ${autoKey}\nKetik \`${prefix}switch auto\` untuk melihat daftar`)

  // No action — show status + usage
  if (!action || (action !== 'on' && action !== 'off')) {
    const current = reg.getStatus()
    return m.reply(`${reg.label}: *${current ? "ON" : "OFF"}*\n\`${prefix}switch auto ${autoKey} on\` — aktifkan\n\`${prefix}switch auto ${autoKey} off\` — matikan`)
  }

  // Toggle
  const enable = action === 'on'
  try {
    reg.toggle(enable)
    return m.reply(`${reg.label}: *${enable ? "ON" : "OFF"}*`)
  } catch (e) {
    return m.reply(`❌ ${e.message || e}`)
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
    let text = `Panduan:\n`
    text += `• \`${prefix}switch fitur off rpg\` → matikan kategori\n`
    text += `• \`${prefix}switch fitur on kencanmatch\` → hidupkan command\n`
    text += `• \`${prefix}switch fitur list\` → lihat semua status\n\n`
    text += `Kategori Nonaktif (OFF):\n`
    text += disabledCats.length > 0 ? `${disabledCats.map(c => "`" + c + "`").join(", ")}\n` : `(semua kategori aktif)\n`
    text += `\nCommand Nonaktif (OFF):\n`
    text += disabledCmds.length > 0 ? `${disabledCmds.map(c => "`" + c + "`").join(", ")}\n` : `(semua command aktif)`
    return m.reply(text)
  }

  if (action === 'list') {
    const allCats = [...(pluginStore.categories?.keys() || [])].sort()
    let text = `KATEGORI (${allCats.length})\n`
    for (const cat of allCats) {
      const isOff = disabledCats.includes(cat)
      text += `${isOff ? "OFF" : "ON"}  ${cat}\n`
    }
    if (disabledCmds.length > 0) {
      text += `\nCOMMAND NONAKTIF (${disabledCmds.length})\n`
      for (const cmd of disabledCmds) text += `OFF  ${cmd}\n`
    }
    return m.reply(text.trim())
  }

  let mode = '', name = ''
  if (action === 'on') { mode = 'on'; name = target }
  else if (action === 'off') { mode = 'off'; name = target }
  else { mode = 'toggle'; name = action }

  if (!name)
    return m.reply(`Contoh: \`${prefix}switch fitur off rpg\`\nContoh: \`${prefix}switch fitur on kencanmatch\``)

  const allCats = [...(pluginStore.categories?.keys() || [])].sort()
  const allCmds = [...(pluginStore.commands?.keys() || [])].sort()
  const isCategory = allCats.includes(name)
  const isCommand = allCmds.includes(name)

  if (!isCategory && !isCommand)
    return m.reply(`❌ Tidak ditemukan: ${name}\nKetik \`${prefix}switch fitur list\``)
  if (isCommand && name === 'switch')
    return m.reply(`❌ Tidak bisa menonaktifkan command ini`)

  const type = isCategory ? "kategori" : "command"
  const list = isCategory ? disabledCats : disabledCmds
  const idx = list.indexOf(name)
  const isCurrentlyOff = idx !== -1
  let newState

  if (mode === 'on') {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else return m.reply(`✅ ${type} ${name} sudah aktif`)
  } else if (mode === 'off') {
    if (!isCurrentlyOff) { list.push(name); newState = true }
    else return m.reply(`${type} \`${name}\` sudah nonaktif`)
  } else {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else { list.push(name); newState = true }
  }

  if (isCategory) db.setting("disabledCategories", disabledCats)
  else db.setting("disabledCommands", disabledCmds)

  const status = newState ? "Nonaktif" : "Aktif"
  return m.reply(`${type.charAt(0).toUpperCase() + type.slice(1)}: *${name}*\nStatus: ${status}`)
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const prefix = m.prefix || '.'
  const text = `Pilih kategori toggle:

📢 *SALURAN*
   Notifikasi event ke channel WhatsApp
   \`${prefix}switch channel\`

🏠 *GROUP*
   Fitur grup (welcome, antilink, anti-toxic, dll)
   \`${prefix}switch group\`

⚡ *AUTO*
   Semua fitur auto (backup, read, typing, BMKG, dll)
   \`${prefix}switch auto\`

⚙️ *FITUR*
   On/off command atau kategori plugin
   \`${prefix}switch fitur\`

Alias lama masih works: .enable .disable .togglefitur .autoread .autobackup dll`

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
    return m.reply(`❌ ${e.message || e}`)
  }
}

export { pluginConfig as config, handler }
