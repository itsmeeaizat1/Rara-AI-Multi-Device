// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Blacklist — pengganti .ban/.unban/.listban (request owner: jangan "ban", tapi "blacklist")
// Sekarang pasangan konsisten: .whitelist (yang boleh) & .blacklist (yang diblokir)
import config from '../../config.js'
import { notifyUserBanned } from '../../src/lib/nova-saluran-broadcast.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import { isLid, lidToJid } from '../../src/lib/nova-lid.js'
import { novaGuide, novaWrap } from "../../src/lib/nova-menu-style.js"

const pluginConfig = {
  name: "blacklist",
  alias: ["blacklist", "bl", "ban", "unban", "listban"],
  category: 'owner',
  description: 'Blacklist nomor — pasangan .whitelist',
  usage: '.blacklist add/remove/list',
  example: '.blacklist add 6281234567890',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

// Normalisasi nomor: strip non-digit, 08xxx → 628xxx
function normalizeNumber(input) {
  let num = String(input || '').replace(/[^0-9]/g, '')
  if (num.startsWith('08')) num = '62' + num.slice(1)
  else if (num.startsWith('0')) num = '62' + num.slice(1)
  return num
}

// Resolve target: reply > mention > args
function resolveTarget(m) {
  let raw = ''
  if (m.quoted) {
    raw = m.quoted.sender || m.quoted.participant || ''
  } else if (m.mentionedJid?.length) {
    raw = m.mentionedJid[0] || ''
  } else if (m.args?.[0]) {
    raw = m.args[0]
  }
  if (!raw) return ''
  if (isLid(raw)) raw = lidToJid(raw)
  return normalizeNumber(raw)
}

function getBlacklist(db) {
  return db.setting('bannedUsers') || []
}

function saveBlacklist(db, list) {
  db.setting('bannedUsers', list)
  db.save()
  // sinkron ke config in-memory biar cek lama (config.isBanned) ikut update
  try { config.bannedUsers = list } catch {}
}

function findIndex(list, num) {
  return list.findIndex((b) => {
    const c = String(b).replace(/[^0-9]/g, '')
    return c === num || c.endsWith(num) || num.endsWith(c)
  })
}

async function addNumber(m, { sock }) {
  const target = resolveTarget(m)
  if (!target || target.length < 10 || target.length > 15) {
    return m.reply(novaWrap("blacklist", `❌ *Gagal*\n\n` +
      `Masukkan nomor, tag user, atau reply pesannya\n\n` +
      `💡 Contoh: \`${m.prefix}blacklist add 6281234567890\``))
  }
  if (config.isOwner(target)) {
    return m.reply(novaWrap("blacklist", `❌ *Gagal*\n\nTidak bisa blacklist owner`))
  }

  const db = getDatabase()
  const list = getBlacklist(db)

  if (findIndex(list, target) !== -1) {
    return m.reply(novaWrap("blacklist", `❌ *Gagal*\n\nNomor \`${target}\` sudah ada di blacklist`))
  }

  list.push(target)
  saveBlacklist(db, list)

  // Broadcast ke saluran (best-effort)
  await notifyUserBanned(sock, {
    phoneNumber: target,
    reason: 'Diblacklist oleh owner',
    totalBanned: list.length,
  }).catch((e) => { console.error('[blacklist.js]:', e.message) })

  return m.reply(novaWrap("blacklist", `✅ *Berhasil*\n\n` +
    `+\`${target}\` masuk blacklist\n` +
    `Nomor ini gak bisa chat bot lagi\n` +
    `Total: \`${list.length}\` nomor`))
}

async function removeNumber(m) {
  const target = resolveTarget(m)
  if (!target) {
    return m.reply(novaWrap("blacklist", `❌ *Gagal*\n\n` +
      `Masukkan nomor yang mau dihapus\n\n` +
      `💡 Contoh: \`${m.prefix}blacklist remove 6281234567890\``))
  }

  const db = getDatabase()
  const list = getBlacklist(db)
  const idx = findIndex(list, target)

  if (idx === -1) {
    return m.reply(novaWrap("blacklist", `❌ *Gagal*\n\nNomor \`${target}\` tidak ada di blacklist`))
  }

  const removed = list.splice(idx, 1)[0]
  saveBlacklist(db, list)

  return m.reply(novaWrap("blacklist", `✅ *Berhasil*\n\n` +
    `-\`${removed}\` dihapus dari blacklist\n` +
    `Nomor ini bisa chat bot lagi\n` +
    `Total: \`${list.length}\` nomor`))
}

async function listNumbers(m) {
  const db = getDatabase()
  const list = getBlacklist(db)

  if (!list.length) {
    return m.reply(novaWrap("blacklist", `📌 *Blacklist Kosong*\n\n` +
      `💡 Tambah dengan \`${m.prefix}blacklist add <nomor>\``))
  }

  let text = `🚫 *Daftar Blacklist* (${list.length})\n\n`
  list.forEach((n, i) => { text += `${i + 1}. +${n}\n` })
  return m.reply(novaWrap("blacklist", text))
}

async function handler(m, { sock }) {
  const cmd = (m.command || '').toLowerCase()

  // Alias lama — biar muscle memory gak putus:
  // .ban <nomor> = blacklist add, .unban <nomor> = blacklist remove, .listban = list
  if (cmd === 'ban') return addNumber(m, { sock })
  if (cmd === 'unban') return removeNumber(m)
  if (cmd === 'listban') return listNumbers(m)

  // .blacklist / .bl — subcommand
  const args = m.args || []
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'add' || sub === 'tambah') return addNumber({ ...m, args: args.slice(1) }, { sock })
  if (sub === 'remove' || sub === 'delete' || sub === 'hapus' || sub === 'del') return removeNumber({ ...m, args: args.slice(1) })
  if (sub === 'list' || sub === 'daftar') return listNumbers(m)

  if (!sub) {
    const db = getDatabase()
    const list = getBlacklist(db)
    return m.reply(novaWrap("blacklist", `📌 *Blacklist* (${list.length} nomor)\n\n` +
      `Blacklist SELALU aktif — nomor di dalamnya gak bisa chat bot\n\n` +
      `💡 \`${m.prefix}blacklist add <nomor>\` — tambah\n` +
      `\`${m.prefix}blacklist remove <nomor>\` — hapus\n` +
      `\`${m.prefix}blacklist list\` — daftar`))
  }

  // Salah subcommand — guide
  return m.reply(novaGuide(
    "blacklist",
    "Blacklist nomor yang gak boleh chat bot",
    `${m.prefix}blacklist add 6281234567890`,
    "Sub: add/remove/list — bisa nomor, @tag, atau reply",
  ))
}

export { pluginConfig as config, handler }
