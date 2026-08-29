// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Unified Leaderboard: Dispatcher + RPG + Group Activity (semua dalam 1 file)
import fs from 'fs'
import path from 'path'
import { getDatabase } from '../../src/lib/nova-database.js'
import { getRpgData } from '../../src/lib/nova-rpg-service.js'
import { getCintaData, getLovePower } from '../../src/lib/nova-rpg-cinta.js'
import { toSC, claraWrap, bracketBox, tipText, formatNumber } from '../../src/lib/nova-menu-style.js'
import {
  trackActivity, getLeaderboard, getWeeklyStats,
  getRank, resetWeekly, getActivityStatus, setActivityTracking
} from '../../src/lib/nova-activity-tracker.js'
import config from '../../config.js'

const pluginConfig = {
  name: "leaderboard",
  alias: [
    "leaderboard", "leaderboardrpg", "lbrpg",
    "topkoin", "topexp", "topenergi", "toplevel", "topbalance",
    "topcinta", "toplove", "topcouple",
    "aktifitas", "aktif", "topaktif", "activity"
  ],
  category: 'main',
  description: 'Pusat leaderboard — RPG (koin/exp/energi/cinta) & Group (aktivitas)',
  usage: '.leaderboard [rpg|group|koin|exp|energi|cinta|aktif|me|reset|stats]',
  example: '.leaderboard rpg',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

// ═══════════════════════════════════════════════════════════
// ROUTING — tentukan jenis leaderboard dari command/alias
// ═══════════════════════════════════════════════════════════
function getMode(cmd, args) {
  const c = (cmd || '').toLowerCase()
  const a = (args[0] || '').toLowerCase()

  // Group activity aliases
  if (['aktifitas', 'aktif', 'topaktif', 'activity'].some(x => c.includes(x)))
    return 'group'
  // RPG direct aliases
  if (c.includes('koin') || c.includes('coin') || c.includes('bal') || c.includes('money'))
    return 'rpg:koin'
  if (c.includes('exp') || c.includes('xp') || c.includes('level'))
    return 'rpg:exp'
  if (c.includes('energi') || c.includes('energy'))
    return 'rpg:energi'
  if (c.includes('cinta') || c.includes('love') || c.includes('couple'))
    return 'rpg:cinta'
  if (c.includes('leaderboardrpg') || c.includes('lbrpg'))
    return 'rpg:overview'

  // Arg-based routing
  if (a === 'rpg' || a === 'rpg2') return 'rpg:overview'
  if (a === 'group' || a === 'grup') return 'group'
  if (['koin', 'coin', 'bal', 'balance', 'money'].includes(a)) return 'rpg:koin'
  if (['exp', 'xp', 'level'].includes(a)) return 'rpg:exp'
  if (['energi', 'energy'].includes(a)) return 'rpg:energi'
  if (['cinta', 'love', 'couple'].includes(a)) return 'rpg:cinta'
  // Group sub-commands via arg
  if (['me', 'saya', 'my', 'reset', 'clear', 'stats', 'stat', 'info', 'on', 'off', 'enable', 'disable'].includes(a))
    return 'group'

  // Default: show menu
  return 'menu'
}

// ═══════════════════════════════════════════════════════════
// RPG LEADERBOARD
// ═══════════════════════════════════════════════════════════
async function showRpgLeaderboard(m, sock, subType) {
  const db = getDatabase()
  const dbData = db.data?.users || db.getAllUsers?.() || {}
  const senderJid = m.sender.replace('@s.whatsapp.net', '')
  const users = []

  for (const [jid, userData] of Object.entries(dbData)) {
    if (!jid || jid === 'undefined') continue
    if (jid.length > 15 || jid.startsWith('120')) continue

    let cintaAffection = 0, hasSpouse = false, lovePower = 0
    try {
      const fullJid = jid.includes('@') ? jid : jid + '@s.whatsapp.net'
      const rpg = getRpgData({ sender: fullJid, pushName: userData.name || jid.split('@')[0] })
      const cinta = rpg.cinta || {}
      cintaAffection = cinta.affection || 0
      hasSpouse = Boolean(cinta.spouse)
      lovePower = hasSpouse ? getLovePower({ sender: fullJid, pushName: userData.name || jid.split('@')[0] }) : 0
    } catch {}

    users.push({
      jid,
      koin: userData.koin || 0,
      exp: userData.rpg?.exp || userData.exp || 0,
      energi: userData.energi || 0,
      level: userData.rpg?.level || userData.level || 1,
      cinta: cintaAffection,
      lovePower,
      hasSpouse,
      name: userData.name || jid.split('@')[0]
    })
  }

  if (users.length === 0)
    return m.reply(`╭──「 *${toSC('Leaderboard')}* 」\n│ ${toSC('Belum ada data user')}\n╰──────────`)

  // ── Overview ──
  if (subType === 'overview') {
    const maxBal = users.reduce((a, b) => a.koin > b.koin ? a : b, users[0])
    const maxExp = users.reduce((a, b) => a.exp > b.exp ? a : b, users[0])
    const maxNrg = users.reduce((a, b) => a.energi > b.energi ? a : b, users[0])
    const cintaUsers = users.filter(u => u.hasSpouse)
    const maxCinta = cintaUsers.length > 0
      ? cintaUsers.reduce((a, b) => a.lovePower > b.lovePower ? a : b, cintaUsers[0])
      : null

    const mentions = [
      maxBal.jid.includes('@') ? maxBal.jid : maxBal.jid + '@s.whatsapp.net',
      maxExp.jid.includes('@') ? maxExp.jid : maxExp.jid + '@s.whatsapp.net',
      maxNrg.jid.includes('@') ? maxNrg.jid : maxNrg.jid + '@s.whatsapp.net',
    ]
    if (maxCinta) mentions.push(maxCinta.jid.includes('@') ? maxCinta.jid : maxCinta.jid + '@s.whatsapp.net')

    const text = `╭──「 *${toSC('Leaderboard')}* 」
│ ${toSC('Total User')}: ${formatNumber(users.length)}
│ 💰 ${toSC('Koin Teratas')}: ${formatNumber(maxBal.koin)} (@${maxBal.jid.split('@')[0]})
│ ✨ ${toSC('EXP Teratas')}: ${formatNumber(maxExp.exp)} (@${maxExp.jid.split('@')[0]})
│ ⚡ ${toSC('Energi Teratas')}: ${formatNumber(maxNrg.energi)} (@${maxNrg.jid.split('@')[0]})
${maxCinta ? `│ ❤️ ${toSC('Cinta Teratas')}: ${formatNumber(maxCinta.lovePower)} LP (@${maxCinta.jid.split('@')[0]})` : `│ ❤️ ${toSC('Cinta')}: ${toSC('Belum ada couple')}`}
╰──────────

${toSC('Pilih tombol di bawah untuk melihat ranking')}!`

    try {
      await sock.sendButton(m.chat, fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'nova.jpg')), text, m, {
        buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💰 Top Koin', id: `${m.prefix}topkoin` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '✨ Top EXP', id: `${m.prefix}topexp` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '⚡ Top Energi', id: `${m.prefix}topenergi` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '❤️ Top Cinta', id: `${m.prefix}topcinta` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👥 Group', id: `${m.prefix}leaderboard group` }) },
        ],
      })
    } catch {
      await m.reply(claraWrap('leaderboard', text, { mentions }))
    }
    return
  }

  // ── Cinta ──
  if (subType === 'cinta') {
    const cintaUsers = users.filter(u => u.hasSpouse)
    if (cintaUsers.length === 0)
      return m.reply(`╭──「 *${toSC('Top Cinta')}* 」\n│ ${toSC('Belum ada couple terdaftar')}\n│ ${toSC('Mulai berpacaran dengan')} .jadian\n╰──────────`)

    cintaUsers.sort((a, b) => b.lovePower - a.lovePower)
    const top10 = cintaUsers.slice(0, 10)
    const mentions = []

    let text = `╭──「 *${toSC('TOP CINTA')}*  」`
    top10.forEach((u, i) => {
      const medal = MEDALS[i] || `${i + 1}.`
      const isMe = u.jid === senderJid ? " *(You)*" : ""
      text += `\n│ ${medal} @${u.jid.split('@')[0]}${isMe}`
      text += `\n│   ❤️ ${toSC('Affection')}: ${formatNumber(u.cinta)} | 💪 LP: ${formatNumber(u.lovePower)}`
      mentions.push(u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net')
    })
    text += `\n╰──────────\n`

    const myRank = cintaUsers.findIndex(u => u.jid === senderJid)
    if (myRank !== -1) text += `\n${toSC('Posisi kamu')}: *#${myRank + 1}* ${toSC('dari')} *${formatNumber(cintaUsers.length)}* couple.`
    else text += `\n${toSC('Kamu belum punya pasangan')}. ${toSC('Ketik')} .jadian ${toSC('untuk mulai')}!`

    await m.reply(claraWrap('leaderboard', text, { mentions }))
    return
  }

  // ── Koin / Exp / Energi ──
  let title, field, formatVal
  if (subType === 'koin') {
    title = 'TOP GLOBAL KOIN'; field = 'koin'
    formatVal = (u) => `Rp ${formatNumber(u.koin)}`
  } else if (subType === 'exp') {
    title = 'TOP GLOBAL LEVEL'; field = 'exp'
    formatVal = (u) => `Lv. ${u.level} (${formatNumber(u.exp)} XP)`
  } else {
    title = 'TOP GLOBAL ENERGI'; field = 'energi'
    formatVal = (u) => `${formatNumber(u.energi)} ${toSC('Energi')}`
  }

  users.sort((a, b) => b[field] - a[field])
  const top10 = users.slice(0, 10)
  const totalField = users.reduce((s, u) => s + (u[field] || 0), 0)
  const mentions = []

  let text = `╭──「 *${toSC(title)}* 」`
  top10.forEach((u, i) => {
    const medal = MEDALS[i] || `${i + 1}.`
    const pct = totalField > 0 ? ((u[field] / totalField) * 100).toFixed(1) : 0
    const isMe = u.jid === senderJid ? " *(You)*" : ""
    text += `\n│ ${medal} @${u.jid.split('@')[0]}${isMe}`
    text += `\n│   ${formatVal(u)} (${pct}%)`
    mentions.push(u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net')
  })
  text += `\n╰──────────\n`

  const myRank = users.findIndex(u => u.jid === senderJid)
  if (myRank !== -1) text += `\n${toSC('Posisi kamu')}: *#${myRank + 1}* ${toSC('dari')} *${formatNumber(users.length)}* user.`
  else text += `\n${toSC('Kamu belum terdaftar di database')}.`

  await m.reply(claraWrap('leaderboard', text, { mentions }))
}

// ═══════════════════════════════════════════════════════════
// GROUP ACTIVITY LEADERBOARD
// ═══════════════════════════════════════════════════════════
async function showGroupLeaderboard(m, sock) {
  if (!m.isGroup)
    return m.reply(`╭──「 *${toSC('Leaderboard Grup')}* 」\n│ ${toSC('Hanya bisa digunakan di dalam grup')}\n╰──────────`)
  trackActivity(m, { isCommand: true })
  const args = m.args || []
  const sub = args[0]?.toLowerCase()

  const checkAdmin = async () => {
    const groupMeta = m.groupMetadata || (sock?.groupMetadata ? await sock.groupMetadata(m.chat).catch(() => null) : null)
    const adminJids = groupMeta?.participants?.filter((p) => p.admin === 'admin' || p.admin === 'superadmin').map((p) => p.id || p.jid) || []
    return Boolean(m.isAdmin || m.isOwner || adminJids.includes(m.sender))
  }

  try {
    // on/off
    if (['on', 'off', 'enable', 'disable'].includes(sub)) {
      const isAdmin = await checkAdmin()
      if (!isAdmin) {
        if (typeof m.react === 'function') { try { } catch {} }
        return m.reply(bracketBox('❌', 'Akses Ditolak', ['Fitur ini hanya dapat diubah oleh Admin Grup.']))
      }
      setActivityTracking(m.chat, sub === 'on' || sub === 'enable')
      const status = sub === 'on' || sub === 'enable' ? 'Aktif' : 'Nonaktif'
      const desc = sub === 'on' || sub === 'enable' ? 'Pelacakan keaktifan diaktifkan.' : 'Pelacakan keaktifan dimatikan.'
      return m.reply(bracketBox('⚙️', 'Status Activity Tracker', [`Status: *${status}*`, desc]) + '\n' + tipText(`Ketik .aktifitas untuk melihat papan peringkat.`))
    }

    // me
    if (['me', 'saya', 'my'].includes(sub)) {
      const userRank = getRank(m.chat, m.sender)
      if (!userRank || !userRank.memberStats) {
        return m.reply(bracketBox('📊', 'Statistik Keaktifan Anda', ['Belum ada data aktivitas minggu ini.', 'Kirim pesan untuk mulai mengumpulkan poin!']) + '\n' + tipText('Poin: 1/pesan, 2/command, 5/media'))
      }
      const { rank, totalMembers, memberStats, topPercentage } = userRank
      const lines = [
        `Member: ${memberStats.name || m.sender.split('@')[0]}`,
        `Peringkat: #${rank} dari ${totalMembers} member (Top ${topPercentage}%)`,
        `Total Poin: ${formatNumber(memberStats.points || 0)} pts`,
        `Total Pesan: ${formatNumber(memberStats.messageCount || 0)}`,
        `Command: ${formatNumber(memberStats.commandCount || 0)}x`,
        `Media: ${formatNumber(memberStats.mediaCount || 0)}x`,
      ]
      return m.reply(bracketBox('📊', 'Statistik Keaktifan Anda', lines) + '\n' + tipText('Kirim lebih banyak pesan & media untuk menaikkan peringkat!'))
    }

    // reset
    if (['reset', 'clear'].includes(sub)) {
      const isAdmin = await checkAdmin()
      if (!isAdmin) {
        if (typeof m.react === 'function') { try { } catch {} }
        return m.reply(bracketBox('❌', 'Akses Ditolak', ['Hanya Admin Grup yang dapat mereset leaderboard.']))
      }
      resetWeekly(m.chat)
      return m.reply(bracketBox('🔄', 'Reset Leaderboard', ['Leaderboard keaktifan grup berhasil direset.', 'Semua poin dikembalikan ke awal.']) + '\n' + tipText('Periode mingguan baru dimulai sekarang.'))
    }

    // stats
    if (['stats', 'stat', 'info'].includes(sub)) {
      const stats = getWeeklyStats(m.chat)
      const topName = stats.topMember ? stats.topMember.name || stats.topMember.jid.split('@')[0] : '-'
      const topPts = stats.topMember ? formatNumber(stats.topMember.points || 0) : '0'
      const weekStartStr = stats.weekStart ? new Date(stats.weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'
      const lines = [
        `Status Tracker: ${stats.trackingEnabled ? 'Aktif' : 'Nonaktif'}`,
        `Awal Periode: ${weekStartStr}`,
        `Total Pesan: ${formatNumber(stats.totalMessages)}`,
        `Total Poin: ${formatNumber(stats.totalPoints)}`,
        `Total Command: ${formatNumber(stats.totalCommands)}`,
        `Total Media: ${formatNumber(stats.totalMedia)}`,
        `Member Aktif: ${formatNumber(stats.activeMembers)} / ${stats.totalMembersTracked}`,
        `Top Member: ${topName} (${topPts} pts)`,
      ]
      return m.reply(bracketBox('📈', 'Statistik Keaktifan Grup', lines) + '\n' + tipText('Gunakan .aktifitas untuk melihat top 10 member.'))
    }

    // default: top 10
    const status = getActivityStatus(m.chat)
    if (!status.trackingEnabled) {
      if (typeof m.react === 'function') { try { } catch {} }
      return m.reply(bracketBox('⚠️', 'Leaderboard Nonaktif', ['Pelacakan keaktifan di grup ini dinonaktifkan.', 'Admin dapat mengaktifkannya: .aktifitas on']))
    }

    const lb = getLeaderboard(m.chat, 10)
    if (!lb || lb.length === 0) {
      return m.reply(bracketBox('🏆', 'Leaderboard Keaktifan Minggu Ini', ['Belum ada data keaktifan member minggu ini.', 'Mulai kirim pesan untuk mencatatkan poin!']) + '\n' + tipText('Poin: 1/pesan, 2/command, 5/media'))
    }

    const lines = lb.map((item, i) => {
      const icon = MEDALS[i] || `#${i + 1}`
      const name = item.name || item.jid.split('@')[0]
      return `${icon} ${name} — *${formatNumber(item.points)} pts* (${formatNumber(item.messageCount)} pesan)`
    })
    return m.reply(bracketBox('🏆', 'Leaderboard Keaktifan Minggu Ini', lines) + '\n' + tipText('Poin: 1/pesan, 2/command, 5/media | .aktifitas me untuk rank Anda'))

  } catch (error) {
    if (typeof m.react === 'function') { try { } catch {} }
    return m.reply(bracketBox('❌', 'Error Leaderboard', [`Terjadi kesalahan: ${error.message}`]))
  }
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER — .leaderboard tanpa arg
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const thumbPath = path.join(process.cwd(), 'assets', 'images', 'nova.jpg')
  let thumb
  try { thumb = fs.readFileSync(thumbPath) } catch { thumb = Buffer.alloc(0) }

  const text = `╭──「 *${toSC('Leaderboard')}* 」
│ ${toSC('Pilih jenis leaderboard')}:
│
│ 🎮 *${toSC('RPG')}*
│   ${toSC('Koin, EXP, Energi, Cinta — global semua user')}
│
│ 👥 *${toSC('Group')}*
│   ${toSC('Aktivitas member grup minggu ini')}
│
╰──

${toSC('Ketik')} *${m.prefix}leaderboard rpg* ${toSC('atau')} *${m.prefix}leaderboard group*`

  try {
    await sock.sendButton(m.chat, thumb, text, m, {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎮 RPG Leaderboard', id: `${m.prefix}leaderboard rpg` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👥 Group Leaderboard', id: `${m.prefix}leaderboard group` }) },
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
  const cmd = m.command || ''
  const args = m.args || []
  const mode = getMode(cmd, args)

  if (mode === 'menu') return showMenu(m, sock)
  if (mode === 'group') return showGroupLeaderboard(m, sock)

  // RPG subtypes
  const rpgSub = mode.split(':')[1] || 'overview'
  return showRpgLeaderboard(m, sock, rpgSub)
}

export { pluginConfig as config, handler }
