// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Unified Switch: Dispatcher untuk semua toggle on/off (saluran, group, fitur)
import { getDatabase } from '../../src/lib/nova-database.js'
import { pluginStore } from '../../src/lib/nova-plugins.js'
import {
  NOTIFY_EVENTS, getAllNotifyStatus, setNotifyEnabled
} from '../../src/lib/nova-saluran-broadcast.js'
import { toSC, claraWrap, bracketBox, tipText, separator, novaCaption } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'

const pluginConfig = {
  name: "switch",
  alias: [
    "switch", "enable", "disable", "togglefitur", "onofffitur", "onoff"
  ],
  category: "owner",
  description: 'Switch on/off semua fitur (saluran, group, command)',
  usage: '.switch [saluran|group|fitur]',
  example: '.switch saluran\n.switch group welcome\n.switch fitur off rpg',
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
  antidocument:  { label: "Anti Document",   dbKey: "antidocument",  on: "on",  off: "off" },
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
// ROUTING
// ═══════════════════════════════════════════════════════════
function getMode(cmd, args) {
  const c = (cmd || '').toLowerCase()
  // Legacy alias routing
  if (c === 'enable') return 'group:on'
  if (c === 'disable') return 'group:off'
  if (c === 'togglefitur' || c === 'onofffitur' || c === 'onoff') return 'fitur'

  const a = (args[0] || '').toLowerCase()
  if (a === 'saluran') return 'saluran'
  if (a === 'group' || a === 'grup') return 'group'
  if (a === 'fitur' || a === 'command' || a === 'cmd') return 'fitur'
  return 'menu'
}

// ═══════════════════════════════════════════════════════════
// SALURAN HANDLER (dari togglesaluran.js)
// ═══════════════════════════════════════════════════════════
async function handleSaluran(m, { sock, config: cfg }) {
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  // args[0] = "saluran", args[1] = event/status, args[2] = on/off (untuk all)
  const subCmd = args[1]?.toLowerCase()

  // No event — show all statuses
  if (!subCmd || subCmd === 'status' || subCmd === 'cek') {
    const statuses = getAllNotifyStatus()
    let onCount = 0, offCount = 0
    let text = claraWrap("Switch Saluran", `│ Saluran: *${cfg?.saluran?.name || "Belum diset"}*\n│ Total Event: *${Object.keys(NOTIFY_EVENTS).length}*`) + "\n" + toSC("STATUS TOGGLE") + ":\n\n"

    for (const [key, info] of Object.entries(statuses)) {
      const emoji = info.enabled ? "🟢" : "🔴"
      text += `${emoji} *${info.label}*\n`
      text += `Status: *${info.enabled ? "ON" : "OFF"}* | \`${prefix}switch saluran ${key}\`\n\n`
      if (info.enabled) onCount++; else offCount++
    }
    text += separator("━", 22) + "\n" + tipText(`ON: ${onCount} | OFF: ${offCount}`) + "\n" + tipText(`Toggle semua: \`${prefix}switch saluran all on/off\``)
    return m.reply(text)
  }

  // Toggle all
  if (subCmd === 'all') {
    const action = args[2]?.toLowerCase()
    if (action !== 'on' && action !== 'off')
      return m.reply(claraWrap("Switch Saluran", `Gunakan: \`${prefix}switch saluran all on\` atau \`${prefix}switch saluran all off\``))
    const enabled = action === 'on'
    let count = 0
    for (const key of Object.keys(NOTIFY_EVENTS)) { setNotifyEnabled(key, enabled); count++ }
    return m.reply(claraWrap("Switch Saluran", "🔔") + "\n\n" + claraWrap(toSC("SEMUA EVENT"), `│ Status: *${enabled ? "ALL ON" : "ALL OFF"}*\n│ Total: *${count} event*`) + "\n\n" + tipText(`Cek status: \`${prefix}switch saluran\``))
  }

  // Toggle specific event
  if (NOTIFY_EVENTS[subCmd]) {
    const statuses = getAllNotifyStatus()
    const current = statuses[subCmd].enabled
    const newVal = !current
    setNotifyEnabled(subCmd, newVal)
    return m.reply(claraWrap("Switch Saluran", "🔔") + "\n\n" + claraWrap(toSC("TOGGLE BERHASIL"), `│ Event: *${NOTIFY_EVENTS[subCmd]}*\n│ Status: *${newVal ? "ON" : "OFF"}*`) + "\n\n" + tipText(newVal ? "Notifikasi akan dikirim ke saluran" : "Notifikasi dimatikan") + "\n" + tipText(`Cek semua: \`${prefix}switch saluran\``))
  }

  // Unknown event
  let list = ""
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) list += `\`${key}\` — ${label}\n`
  return m.reply(claraWrap("Switch Saluran", `Event: *${subCmd}*\nTidak ada dalam daftar toggle`) + "\n" + toSC("EVENT TERSEDIA") + ":\n\n" + list + "\n" + tipText(`Contoh: \`${prefix}switch saluran sewaRegister\``))
}

// ═══════════════════════════════════════════════════════════
// GROUP HANDLER (dari enable.js + disable.js)
// ═══════════════════════════════════════════════════════════
async function handleGroup(m, { sock, config: cfg, forceOff }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  // args[0] = "group", args[1] = fitur, args[2] = mode
  // Jika forceOff (dari .disable), args[0] = fitur langsung
  let featureName, mode

  if (forceOff) {
    // Dipanggil dari alias .disable — args[0] = nama fitur
    featureName = (args[0] || '').toLowerCase()
    mode = null
  } else {
    featureName = (args[1] || '').toLowerCase()
    mode = (args[2] || '').toLowerCase()
    // .switch group off <fitur>
    if (featureName === 'off') {
      forceOff = true
      featureName = mode
      mode = null
    }
  }

  if (!featureName) {
    // Show all group features status
    const groupData = db.getGroup(m.chat) || {}
    let txt = `╭──「 *${toSC('SWITCH GROUP')}* 」\n\n`
    for (const [cat, features] of Object.entries(GROUP_CATEGORIES)) {
      txt += `├── *${toSC(cat)}*\n`
      for (const feat of features) {
        const f = GROUP_FEATURES[feat]
        if (!f) continue
        const current = groupData[f.dbKey]
        const active = isOn(current, f.on)
        txt += `│   ${active ? "🟢" : "🔴"} ${feat}\n`
      }
      txt += `\n`
    }
    txt += `╰──────────❀\n`
    txt += tipText(`ON: \`${prefix}switch group <fitur>\` | OFF: \`${prefix}switch group off <fitur>\``)
    return m.reply(txt)
  }

  const resolved = GROUP_ALIASES[featureName] || featureName
  const feature = GROUP_FEATURES[resolved]

  if (!feature)
    return m.reply(`╭──「 *${toSC('Switch Group')}* 」\n├── ❌ ${toSC('Fitur tidak ditemukan')}: ${featureName}\n├── ${toSC('Ketik')} \`${prefix}switch group\` ${toSC('untuk melihat daftar')}\n╰──────────❀`)

  const groupData = db.getGroup(m.chat) || {}

  if (forceOff) {
    // Disable
    db.setGroup(m.chat, { [feature.dbKey]: feature.off })
    if (typeof m.react === 'function') { try { await m.react('🐣'); } catch {} }
    return m.reply(`╭──「 *${toSC('SWITCH GROUP')}* 」\n├── 🔴 ${toSC(feature.label)}: OFF\n╰──────────❀`)
  }

  // Enable
  let update = { [feature.dbKey]: feature.on }
  if (feature.modes && mode && feature.modes.includes(mode))
    update[feature.modeKey] = mode
  if (feature.extraKey && mode && /^\d+$/.test(mode))
    update[feature.extraKey] = mode

  db.setGroup(m.chat, update)
  if (typeof m.react === 'function') { try { await m.react('🐣'); } catch {} }

  let txt = `╭──「 *${toSC('SWITCH GROUP')}* 」\n├── 🟢 ${toSC(feature.label)}: ON`
  if (feature.modes) {
    const newMode = mode && feature.modes.includes(mode) ? mode : (groupData[feature.modeKey] || feature.modes[0])
    txt += `\n├── ${toSC('Mode')}: ${newMode}`
  }
  txt += `\n╰──────────❀`
  return m.reply(txt)
}

// ═══════════════════════════════════════════════════════════
// FITUR HANDLER (dari togglefitur.js)
// ═══════════════════════════════════════════════════════════
async function handleFitur(m, { sock, config: cfg }) {
  const db = getDatabase()
  const prefix = cfg?.command?.prefix || '.'
  const args = m.args || []
  // args[0] = "fitur", args[1] = action/on/off/toggle, args[2] = target
  // Atau dari alias .togglefitur: args[0] = action, args[1] = target

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

  // Tanpa arg — show status
  if (!action) {
    let text = `╭──「 *${toSC('SWITCH FITUR')}* 」\n\n`
    text += `├── 📋 ${toSC('Panduan')}:\n`
    text += `├── • \`${prefix}switch fitur off rpg\` → ${toSC('matikan kategori')}\n`
    text += `├── • \`${prefix}switch fitur on kencanmatch\` → ${toSC('hidupkan command')}\n`
    text += `├── • \`${prefix}switch fitur list\` → ${toSC('lihat semua status')}\n\n`
    text += `├── 🔴 ${toSC('Kategori Nonaktif')}:\n`
    text += disabledCats.length > 0 ? `│   ${disabledCats.map(c => "`" + c + "`").join(", ")}\n` : `│   (${toSC('semua kategori aktif')})\n`
    text += `\n├── 🔴 ${toSC('Command Nonaktif')}:\n`
    text += disabledCmds.length > 0 ? `│   ${disabledCmds.map(c => "`" + c + "`").join(", ")}\n` : `│   (${toSC('semua command aktif')})\n`
    text += `\n╰──────────❀`
    return m.reply(text)
  }

  // List
  if (action === 'list') {
    const allCats = [...(pluginStore.categories?.keys() || [])].sort()
    let text = `╭──「 *${toSC('DAFTAR FITUR')}* 」\n\n`
    text += `├── 📂 ${toSC('KATEGORI')} (${allCats.length})\n`
    for (const cat of allCats) {
      const isOff = disabledCats.includes(cat)
      text += `│   ${isOff ? "🔴" : "🟢"} ${cat}\n`
    }
    if (disabledCmds.length > 0) {
      text += `\n├── ⚙️ ${toSC('COMMAND NONAKTIF')} (${disabledCmds.length})\n`
      for (const cmd of disabledCmds) text += `│   🔴 ${cmd}\n`
    }
    text += `\n╰──────────❀`
    return m.reply(text)
  }

  // ON / OFF / TOGGLE
  let mode = '', name = ''
  if (action === 'on') { mode = 'on'; name = target }
  else if (action === 'off') { mode = 'off'; name = target }
  else { mode = 'toggle'; name = action }

  if (!name)
    return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n├── ${toSC('Contoh')}: \`${prefix}switch fitur off rpg\`\n├── ${toSC('Contoh')}: \`${prefix}switch fitur on kencanmatch\`\n╰──────────❀`)

  const allCats = [...(pluginStore.categories?.keys() || [])].sort()
  const allCmds = [...(pluginStore.commands?.keys() || [])].sort()
  const isCategory = allCats.includes(name)
  const isCommand = allCmds.includes(name)

  if (!isCategory && !isCommand)
    return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n├── ❌ ${toSC('Tidak ditemukan')}: ${name}\n├── ${toSC('Ketik')} \`${prefix}switch fitur list\`\n╰──────────❀`)

  // Cegah nonaktifkan switch sendiri
  if (isCommand && name === 'switch')
    return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n├── ❌ ${toSC('Tidak bisa menonaktifkan command ini')}\n╰──────────❀`)

  const type = isCategory ? "kategori" : "command"
  const list = isCategory ? disabledCats : disabledCmds
  const idx = list.indexOf(name)
  const isCurrentlyOff = idx !== -1
  let newState

  if (mode === 'on') {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n├── ✅ ${toSC(type)} ${name} ${toSC('sudah aktif')}\n╰──────────❀`)
  } else if (mode === 'off') {
    if (!isCurrentlyOff) { list.push(name); newState = true }
    else return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n├── 🔴 ${toSC(type)} ${name} ${toSC('sudah nonaktif')}\n╰──────────❀`)
  } else {
    if (isCurrentlyOff) { list.splice(idx, 1); newState = false }
    else { list.push(name); newState = true }
  }

  if (isCategory) db.setting("disabledCategories", disabledCats)
  else db.setting("disabledCommands", disabledCmds)

  const status = newState ? "🔴 Nonaktif" : "🟢 Aktif"
  const emoji = newState ? "⏸️" : "▶️"
  return m.reply(`╭──「 *${toSC('SWITCH FITUR')}* 」\n\n├── ${emoji} ${toSC(type.charAt(0).toUpperCase() + type.slice(1))}: *${name}*\n├── ${toSC('Status')}: ${status}\n\n╰──────────❀`)
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const prefix = m.prefix || '.'
  const text = `╭──「 *${toSC('SWITCH')}* 」
├── ${toSC('Pilih kategori toggle')}:
│
├── 📢 *${toSC('SALURAN')}*
│   ${toSC('Notifikasi event ke channel WhatsApp')}
│   \`${prefix}switch saluran\`
│
├── 🏠 *${toSC('GROUP')}*
│   ${toSC('Fitur grup (welcome, antilink, anti-toxic, dll)')}
│   \`${prefix}switch group\`
│
├── ⚙️ *${toSC('FITUR')}*
│   ${toSC('On/off command atau kategori plugin')}
│   \`${prefix}switch fitur\`
│
╰──────────❀

${toSC('Alias lama masih works')}: .enable .disable .togglefitur`

  try {
    const thumb = fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'nova.jpg'))
    await sock.sendButton(m.chat, thumb, text, m, {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📢 Saluran', id: `${prefix}switch saluran` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Group', id: `${prefix}switch group` }) },
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
    if (mode === 'saluran') return handleSaluran(m, { sock, config: cfg })
    if (mode === 'group') return handleGroup(m, { sock, config: cfg })
    if (mode === 'group:on') return handleGroup(m, { sock, config: cfg }) // .enable alias
    if (mode === 'group:off') return handleGroup(m, { sock, config: cfg, forceOff: true }) // .disable alias
    if (mode === 'fitur') return handleFitur(m, { sock, config: cfg })

    return showMenu(m, sock)
  } catch (e) {
    return m.reply(`╭──「 *${toSC('SWITCH')}* 」\n├── ❌ ${e.message || e}\n╰──────────❀`)
  }
}

export { pluginConfig as config, handler }
