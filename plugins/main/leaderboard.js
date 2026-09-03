// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Unified Leaderboard — RPG (new fields) + Group Activity (semua dalam 1 file)
import fs from 'fs'
import path from 'path'
import { getDatabase } from '../../src/lib/nova-database.js'
import { getRpgData, JOB_DB } from '../../src/lib/nova-rpg-service.js'
import { getCintaData, getLovePower } from '../../src/lib/nova-rpg-cinta.js'
import { toSC, claraWrap, bracketBox, tipText, formatNumber } from '../../src/lib/nova-menu-style.js'
import {
  trackActivity, getLeaderboard, getWeeklyStats,
  getRank, resetWeekly, getActivityStatus, setActivityTracking
} from '../../src/lib/nova-activity-tracker.js'

const pluginConfig = {
  name: "leaderboard",
  alias: [
    "leaderboard", "lb", "papanperingkat", "topplayer",
    "leaderboardrpg", "lbrpg", "toprpg", "papanrpg",
    "topkoin", "topexp", "toplimit", "topenergi", "toplevel", "topbalance",
    "topgold", "topgems", "toppvp", "topboss", "topdungeon",
    "topcinta", "toplove", "topcouple",
    "aktifitas", "aktif", "topaktif", "activity"
  ],
  category: 'main',
  description: 'Pusat leaderboard — RPG (gold/level/pvp/dll) + Mini Game (mancing/mining/ojek/slot/gacha/dll) + Group (aktivitas) — SEMUA dalam 1 command',
  usage: '.leaderboard [all|rpg|gold|level|pvp|gems|boss|dungeon|limit|cinta|survival|mancing|mining|ojek|slot|gacha|masak|...|group|me|reset|stats]',
  example: '.leaderboard all\n.leaderboard survival\n.leaderboard mancing\n.leaderboard gold',
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
// MINI GAME & STAT CATEGORIES — metrik deep-path ke rpg.<game>.<field>
// (dipindah dari plugins/rpg/leaderboard.js yang sekarang dihapus)
// ═══════════════════════════════════════════════════════════
const GAME_CATEGORIES = [
  { key: 'kerja',       label: 'Job Level',          metric: 'joblevel',                  raw: 'Kerja' },
  { key: 'kills',       label: 'Total Kills',        metric: 'totalKills',                raw: 'Kills' },
  { key: 'achievement', label: 'Achievement Poin',  metric: 'achievementPoints',         raw: 'Achievement' },
  { key: 'survival',    label: 'Hari Survival',     metric: 'survival.daysSurvived',     raw: 'Survival' },
  { key: 'mancing',     label: 'Total Tangkapan',   metric: 'mancing.totalCatch',        raw: 'Mancing' },
  { key: 'mancingv2',   label: 'Tangkapan V2',      metric: 'fishingv2.totalCaught',     raw: 'Mancing V2' },
  { key: 'berburu',     label: 'Buruan Berhasil',   metric: 'berburu.totalHunt',         raw: 'Berburu' },
  { key: 'mining',      label: 'Bijih Ditambang',   metric: 'mining.totalMine',          raw: 'Mining' },
  { key: 'nebang',      label: 'Pohon Ditebang',    metric: 'nebang.totalNebang',        raw: 'Nebang' },
  { key: 'nguli',       label: 'Total Kerja Kuli',   metric: 'nguli.totalNguli',          raw: 'Nguli' },
  { key: 'ojek',        label: 'Total Anter Ojek',  metric: 'ojekrpg.totalOjek',         raw: 'Ojek' },
  { key: 'sampah',      label: 'Total Buang Sampah', metric: 'sampah.totalSampah',        raw: 'Sampah' },
  { key: 'masak',       label: 'Total Masakan',     metric: 'cookingv2.cookedHistory',    raw: 'Masak' },
  { key: 'slot',        label: 'Kemenangan Slot',   metric: 'slotmachine.wins',          raw: 'Slot' },
  { key: 'gacha',       label: 'Total Pull Gacha',  metric: 'gachawaifu.pulls',          raw: 'Gacha' },
]

// Resolve deep path "survival.daysSurvived" → rpg.survival.daysSurvived.
// Array di ujung path dihitung sebagai jumlah item (length) — konsisten dgn getLeaderboard nova-rpg-service.
function deepValue(rpg, metricPath) {
  let v = rpg
  for (const k of String(metricPath || '').split('.')) v = v?.[k]
  if (Array.isArray(v)) v = v.length
  return typeof v === 'number' ? v : 0
}

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
  if (c.includes('koin') || c.includes('coin') || c.includes('bal') || c.includes('money') || c.includes('topgold'))
    return 'rpg:gold'
  if (c.includes('topexp') || c.includes('xp') || c.includes('toplevel'))
    return 'rpg:exp'
  if (c.includes('limit') || c.includes('energi') || c.includes('energy'))
    return 'limit'
  if (c.includes('toppvp') || c.includes('pvp'))
    return 'rpg:pvp'
  if (c.includes('topgems') || c.includes('gems'))
    return 'rpg:gems'
  if (c.includes('topboss') || c.includes('boss'))
    return 'rpg:boss'
  if (c.includes('topdungeon') || c.includes('dungeon'))
    return 'rpg:dungeon'
  if (c.includes('cinta') || c.includes('love') || c.includes('couple'))
    return 'rpg:cinta'
  if (c.includes('leaderboardrpg') || c.includes('lbrpg') || c.includes('toprpg') || c.includes('papanrpg'))
    return 'rpg:overview'

  // Arg-based routing
  if (a === 'all' || a === 'semua') return 'all'
  if (a === 'rpg' || a === 'rpg2' || a === 'overview') return 'rpg:overview'
  if (a === 'group' || a === 'grup') return 'group'
  if (['gold', 'koin', 'coin', 'bal', 'balance', 'money'].includes(a)) return 'rpg:gold'
  if (['exp', 'xp', 'level'].includes(a)) return 'rpg:exp'
  if (['limit', 'energi', 'energy'].includes(a)) return 'limit'
  if (['pvp', 'arena', 'duel'].includes(a)) return 'rpg:pvp'
  if (['gems', 'gem'].includes(a)) return 'rpg:gems'
  if (['boss', 'raid', 'bos'].includes(a)) return 'rpg:boss'
  if (['dungeon', 'dg'].includes(a)) return 'rpg:dungeon'
  if (['cinta', 'love', 'couple'].includes(a)) return 'rpg:cinta'
  // Mini game & stat categories (dari rpg/leaderboard.js yang digabung)
  const gameCat = GAME_CATEGORIES.find(g => g.key === a || (a === 'fish' && g.key === 'mancing') || (a === 'waifu' && g.key === 'gacha'))
  if (gameCat) return 'game:' + gameCat.key
  // Group sub-commands via arg
  if (['me', 'saya', 'my', 'reset', 'clear', 'stats', 'stat', 'info', 'on', 'off', 'enable', 'disable'].includes(a))
    return 'group'

  // Default: show menu
  return 'menu'
}

// ═══════════════════════════════════════════════════════════
// COLLECT ALL RPG USERS — baca dari field RPG baru
// ═══════════════════════════════════════════════════════════
function collectRpgUsers(senderJid) {
  const db = getDatabase()
  const dbData = db.data?.users || db.getAllUsers?.() || {}
  const users = []

  for (const [jid, userData] of Object.entries(dbData)) {
    if (!jid || jid === 'undefined') continue
    if (jid.length > 15 || jid.startsWith('120')) continue

    const rpg = userData.rpg || null
    const fullJid = jid.includes('@') ? jid : jid + '@s.whatsapp.net'

    // Cinta data
    let cintaAffection = 0, hasSpouse = false, lovePower = 0
    try {
      const cinta = rpg?.cinta || {}
      cintaAffection = cinta.affection || 0
      hasSpouse = Boolean(cinta.spouse || rpg?.coupleId || rpg?.married)
      if (hasSpouse) {
        lovePower = getLovePower({ sender: fullJid, pushName: userData.name || jid.split('@')[0] })
      }
    } catch {}

    users.push({
      jid,
      name: userData.name || jid.split('@')[0],
      // RPG new fields (from nova-rpg-service DEFAULT_RPG)
      gold:        rpg?.gold || userData.koin || userData.balance || 0,
      exp:         rpg?.exp || userData.exp || 0,
      totalExp:    rpg?.totalExp || 0,
      level:       rpg?.level || userData.level || 1,
      // Limit akses fitur (user.energi, refill harian) — BEDA dari energi game (rpg.energy/maxEnergy)
      // -1 = unlimited (owner/premium) → tampil 0 biar gak nyampah di ranking
      limit:      (typeof userData.energi === 'number' && userData.energi >= 0) ? userData.energi : 0,
      gems:        rpg?.gems || 0,
      tokens:      rpg?.tokens || 0,
      // Combat stats
      pvpRating:   rpg?.pvpRating || 1000,
      pvpWins:     rpg?.pvpWins || 0,
      pvpLosses:   rpg?.pvpLosses || 0,
      pvpStreak:   rpg?.pvpStreak || 0,
      bossKills:   rpg?.bossKills || 0,
      dungeonClears: rpg?.dungeonClears || 0,
      totalKills:  rpg?.totalKills || 0,
      // Job
      job:         rpg?.job || 'novice',
      jobLevel:    rpg?.jobLevel || 1,
      // Cinta
      cinta:       cintaAffection,
      lovePower,
      hasSpouse,
      warWin:      (rpg?.cinta?.warWin || rpg?.coupleWarWins || 0),
      rpg, // raw object — buat metrik deep-path mini game (mancing/ojek/slot/dll)
    })
  }

  return users
}

// ═══════════════════════════════════════════════════════════
// RPG LEADERBOARD
// ═══════════════════════════════════════════════════════════
async function showRpgLeaderboard(m, sock, subType) {
  const senderJid = m.sender.replace(/@s\.whatsapp\.net/, '')
  const users = collectRpgUsers(senderJid)

  if (users.length === 0)
    return m.reply(claraWrap('Leaderboard', 'Belum ada data player RPG terdaftar.'))

  // ── Overview ──
  if (subType === 'overview') {
    const maxGold   = users.reduce((a, b) => a.gold > b.gold ? a : b, users[0])
    const maxExp    = users.reduce((a, b) => a.totalExp > b.totalExp ? a : b, users[0])
    const maxLevel  = users.reduce((a, b) => a.level > b.level ? a : b, users[0])
    const maxPvp    = users.reduce((a, b) => a.pvpRating > b.pvpRating ? a : b, users[0])
    const maxBoss   = users.reduce((a, b) => a.bossKills > b.bossKills ? a : b, users[0])
    const cintaUsers = users.filter(u => u.hasSpouse)
    const maxCinta  = cintaUsers.length > 0
      ? cintaUsers.reduce((a, b) => a.lovePower > b.lovePower ? a : b, cintaUsers[0])
      : null

    const mkJid = (u) => u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
    const mentions = [maxGold, maxLevel, maxPvp, maxBoss].map(mkJid)
    if (maxCinta) mentions.push(mkJid(maxCinta))

    const lines = [
      `Total Player: *${formatNumber(users.length)}*`,
      ``,
      `Gold: ${formatNumber(maxGold.gold)} (@${maxGold.jid.split('@')[0]})`,
      `Level: Lv.${maxLevel.level} (@${maxLevel.jid.split('@')[0]})`,
      `PvP: ${maxPvp.pvpRating} rating (@${maxPvp.jid.split('@')[0]})`,
      `Boss: ${maxBoss.bossKills} kills (@${maxBoss.jid.split('@')[0]})`,
      maxCinta
        ? `Cinta: ${formatNumber(maxCinta.lovePower)} LP (@${maxCinta.jid.split('@')[0]})`
        : `Cinta: Belum ada couple`,
      ``,
      `Pilih tombol di bawah untuk detail ranking!`,
    ]

    try {
      await sock.sendButton(m.chat, fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'nova.jpg')), lines.join('\n'), m, {
        buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Gold', id: `${m.prefix}topgold` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Level', id: `${m.prefix}toplevel` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'PvP', id: `${m.prefix}toppvp` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Boss', id: `${m.prefix}topboss` }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Cinta', id: `${m.prefix}topcinta` }) },
        ],
      })
    } catch {
      await m.reply(claraWrap('Leaderboard RPG', lines.join('\n'), { mentions }))
    }
    return
  }

  // ── Cinta ──
  if (subType === 'cinta') {
    const cintaUsers = users.filter(u => u.hasSpouse)
    if (cintaUsers.length === 0)
      return m.reply(claraWrap('Leaderboard Cinta', 'Belum ada couple terdaftar.\nMulai berpacaran dengan .jadian'))

    cintaUsers.sort((a, b) => b.lovePower - a.lovePower)
    const top10 = cintaUsers.slice(0, 10)
    const mentions = []

    let text = ""
    top10.forEach((u, i) => {
      const medal = MEDALS[i] || `${i + 1}.`
      const isMe = u.jid === senderJid ? " *(You)*" : ""
      text += `\n${medal} @${u.jid.split('@')[0]}${isMe}`
      text += `\nAffection: ${formatNumber(u.cinta)} | LP: ${formatNumber(u.lovePower)}`
      mentions.push(u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net')
    })

    const myRank = cintaUsers.findIndex(u => u.jid === senderJid)
    if (myRank !== -1) text += `\n\nPosisi kamu: *#${myRank + 1}* dari *${formatNumber(cintaUsers.length)}* couple.`
    else text += `\n\nKamu belum punya pasangan. Ketik .jadian untuk mulai!`

    await m.reply(claraWrap('Leaderboard Cinta', text, { mentions }))
    return
  }

  // ── Gold / Exp / PvP / Gems / Boss / Dungeon / Energi ──
  const FIELDS = {
    gold:     { title: 'TOP GLOBAL GOLD',     key: 'gold',        label: (u) => `${formatNumber(u.gold)} gold` },
    exp:      { title: 'TOP GLOBAL LEVEL',    key: 'totalExp',    label: (u) => `Lv.${u.level} (${formatNumber(u.exp)} XP)` },
    pvp:      { title: 'TOP GLOBAL PvP',       key: 'pvpRating',  label: (u) => `${u.pvpRating} rating (W:${u.pvpWins} L:${u.pvpLosses})` },
    gems:     { title: 'TOP GLOBAL GEMS',      key: 'gems',       label: (u) => `${formatNumber(u.gems)} gems` },
    boss:     { title: 'TOP GLOBAL BOSS KILL', key: 'bossKills',  label: (u) => `${u.bossKills} boss kills` },
    dungeon:  { title: 'TOP GLOBAL DUNGEON',  key: 'dungeonClears', label: (u) => `${u.dungeonClears} dungeon clears` },
    limit:    { title: 'TOP GLOBAL LIMIT',     key: 'limit',      label: (u) => `${formatNumber(u.limit)} limit` },
  }

  const field = FIELDS[subType] || FIELDS['gold']
  users.sort((a, b) => b[field.key] - a[field.key])
  const top10 = users.slice(0, 10)
  const totalField = users.reduce((s, u) => s + (u[field.key] || 0), 0)
  const mentions = []

  let text = ""
  top10.forEach((u, i) => {
    const medal = MEDALS[i] || `${i + 1}.`
    const pct = totalField > 0 ? ((u[field.key] / totalField) * 100).toFixed(1) : 0
    const isMe = u.jid === senderJid ? " *(You)*" : ""
    const jobName = JOB_DB[u.job]?.name || 'Pemula'
    text += `\n${medal} @${u.jid.split('@')[0]}${isMe}`
    text += `\n${field.label(u)} (${pct}%) | ${jobName}`
    mentions.push(u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net')
  })

  const myRank = users.findIndex(u => u.jid === senderJid)
  if (myRank !== -1) text += `\n\nPosisi kamu: *#${myRank + 1}* dari *${formatNumber(users.length)}* player.`
  else text += `\n\nKamu belum terdaftar di database RPG.`

  await m.reply(claraWrap(field.title, text, { mentions }))
}

// ═══════════════════════════════════════════════════════════
// MINI GAME / STAT LEADERBOARD — metrik deep-path per game
// ═══════════════════════════════════════════════════════════
async function showGameLeaderboard(m, sock, catKey) {
  const senderJid = m.sender.replace(/@s\.whatsapp\.net/, '')
  const cat = GAME_CATEGORIES.find(g => g.key === catKey) || GAME_CATEGORIES[0]
  const users = collectRpgUsers(senderJid)

  if (users.length === 0)
    return m.reply(claraWrap('Leaderboard', 'Belum ada data player RPG terdaftar.\nKetik .daftar untuk mulai main RPG.'))

  // hitung metrik tiap user lalu sort
  const scored = users
    .map(u => ({ ...u, score: deepValue(u.rpg, cat.metric) }))
    .sort((a, b) => b.score - a.score)

  if (scored[0].score <= 0 && !scored.some(u => u.score > 0))
    return m.reply(claraWrap(`Leaderboard ${cat.raw}`, `Belum ada data untuk kategori *${cat.key}*.\nMain dulu biar skormu terekam!`))

  const top10 = scored.slice(0, 10)
  const mentions = []

  let text = ''
  top10.forEach((u, i) => {
    const medal = MEDALS[i] || `${i + 1}.`
    const isMe = u.jid === senderJid ? ' *(You)*' : ''
    text += `\n${medal} @${u.jid.split('@')[0]}${isMe}`
    text += `\n${cat.label}: ${formatNumber(u.score)}`
    mentions.push(u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net')
  })

  const myRank = scored.findIndex(u => u.jid === senderJid)
  if (myRank !== -1) text += `\n\nPosisi kamu: *#${myRank + 1}* dari *${formatNumber(scored.length)}* player (${formatNumber(scored[myRank].score)} ${cat.label.toLowerCase()}).`
  else text += `\n\nKamu belum terdaftar di database RPG.`

  await m.reply(claraWrap(`TOP GLOBAL ${cat.raw.toUpperCase()}`, text, { mentions }))
}

// ═══════════════════════════════════════════════════════════
// GROUP ACTIVITY LEADERBOARD
// ═══════════════════════════════════════════════════════════
async function showGroupLeaderboard(m, sock) {
  if (!m.isGroup)
    return m.reply(claraWrap('Leaderboard', 'Hanya bisa digunakan di dalam grup.'))

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
      if (!isAdmin)
        return m.reply(bracketBox('❌', 'Akses Ditolak', ['Fitur ini hanya untuk Admin Grup.']))
      setActivityTracking(m.chat, sub === 'on' || sub === 'enable')
      const status = sub === 'on' || sub === 'enable' ? 'Aktif' : 'Nonaktif'
      return m.reply(bracketBox('⚙️', 'Status Activity Tracker', [`Status: *${status}*`]))
    }

    // me
    if (['me', 'saya', 'my'].includes(sub)) {
      const userRank = getRank(m.chat, m.sender)
      if (!userRank || !userRank.memberStats)
        return m.reply(bracketBox('📊', 'Statistik Keaktifan Anda', ['Belum ada data aktivitas minggu ini.', 'Kirim pesan untuk mulai mengumpulkan poin!']))
      const { rank, totalMembers, memberStats, topPercentage } = userRank
      const lines = [
        `Member: ${memberStats.name || m.sender.split('@')[0]}`,
        `Peringkat: #${rank} dari ${totalMembers} member (Top ${topPercentage}%)`,
        `Total Poin: ${formatNumber(memberStats.points || 0)} pts`,
        `Total Pesan: ${formatNumber(memberStats.messageCount || 0)}`,
        `Command: ${formatNumber(memberStats.commandCount || 0)}x`,
        `Media: ${formatNumber(memberStats.mediaCount || 0)}x`,
      ]
      return m.reply(bracketBox('📊', 'Statistik Keaktifan Anda', lines))
    }

    // reset
    if (['reset', 'clear'].includes(sub)) {
      const isAdmin = await checkAdmin()
      if (!isAdmin)
        return m.reply(bracketBox('❌', 'Akses Ditolak', ['Hanya Admin Grup yang dapat reset.']))
      resetWeekly(m.chat)
      return m.reply(bracketBox('🔄', 'Reset Leaderboard', ['Leaderboard keaktifan direset.', 'Periode mingguan baru dimulai.']))
    }

    // stats
    if (['stats', 'stat', 'info'].includes(sub)) {
      const stats = getWeeklyStats(m.chat)
      const topName = stats.topMember ? stats.topMember.name || stats.topMember.jid.split('@')[0] : '-'
      const topPts = stats.topMember ? formatNumber(stats.topMember.points || 0) : '0'
      const weekStartStr = stats.weekStart ? new Date(stats.weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'
      const lines = [
        `Status: ${stats.trackingEnabled ? 'Aktif' : 'Nonaktif'}`,
        `Awal Periode: ${weekStartStr}`,
        `Total Pesan: ${formatNumber(stats.totalMessages)}`,
        `Total Poin: ${formatNumber(stats.totalPoints)}`,
        `Total Command: ${formatNumber(stats.totalCommands)}`,
        `Total Media: ${formatNumber(stats.totalMedia)}`,
        `Member Aktif: ${formatNumber(stats.activeMembers)} / ${stats.totalMembersTracked}`,
        `Top Member: ${topName} (${topPts} pts)`,
      ]
      return m.reply(bracketBox('📈', 'Statistik Keaktifan Grup', lines))
    }

    // default: top 10
    const status = getActivityStatus(m.chat)
    if (!status.trackingEnabled)
      return m.reply(bracketBox('⚠️', 'Leaderboard Nonaktif', ['Aktifkan dengan .aktifitas on (admin only)']))

    const lb = getLeaderboard(m.chat, 10)
    if (!lb || lb.length === 0)
      return m.reply(bracketBox('🏆', 'Leaderboard Keaktifan Minggu Ini', ['Belum ada data keaktifan member.', 'Mulai kirim pesan untuk mencatatkan poin!']))

    const lines = lb.map((item, i) => {
      const icon = MEDALS[i] || `#${i + 1}`
      const name = item.name || item.jid.split('@')[0]
      return `${icon} ${name} — *${formatNumber(item.points)} pts* (${formatNumber(item.messageCount)} pesan)`
    })
    return m.reply(bracketBox('🏆', 'Leaderboard Keaktifan Minggu Ini', lines))
  } catch (error) {
    return m.reply(bracketBox('❌', 'Error', [`Terjadi kesalahan: ${error.message}`]))
  }
}

// ═══════════════════════════════════════════════════════════
// LEADERBOARD ALL — semua board game jadi 1 pesan (jalur cepat)
// Bagian atas = ringkasan juara tiap board (kelihatan langsung),
// sisanya disembunyikan di balik readmore biar gak wall-of-text.
// ═══════════════════════════════════════════════════════════
const READMORE = String.fromCharCode(8206).repeat(4001)

const ALL_FIELDS = [
  // ── Section 1: MINI GAME & STATS (di atas) ──
  ...GAME_CATEGORIES.map(g => ({
    key: 'game:' + g.key,
    group: 'game',
    title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ' + toSC(String(g.raw).toLowerCase()),
    label: (u) => `${formatNumber(deepValue(u.rpg, g.metric))} ${g.label.toLowerCase()}`,
    raw: g.raw,
    sortBy: (users) => users.map(u => ({ ...u, _s: deepValue(u.rpg, g.metric) })).sort((a, b) => b._s - a._s),
  })),
  // ── Section 2: RPG CORE (di bawah) ──
  { key: 'gold',        group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ɢᴏʟᴅ',     label: (u) => `${formatNumber(u.gold)} gold`,           raw: 'Gold' },
  { key: 'totalExp',    group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ʟᴇᴠᴇʟ',    label: (u) => `Lv.${u.level} (${formatNumber(u.exp)} XP)`, raw: 'Level' },
  { key: 'pvpRating',   group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴘᴠᴘ',       label: (u) => `${u.pvpRating} rating (W:${u.pvpWins} L:${u.pvpLosses})`, raw: 'PvP' },
  { key: 'gems',        group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ɢᴇᴍꜱ',      label: (u) => `${formatNumber(u.gems)} gems`,            raw: 'Gems' },
  { key: 'bossKills',   group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ʙᴏꜱꜱ',      label: (u) => `${u.bossKills} boss kills`,              raw: 'Boss' },
  { key: 'dungeonClears', group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴅᴜɴɢᴇᴏɴ', label: (u) => `${u.dungeonClears} dungeon clears`,      raw: 'Dungeon' },
  { key: 'limit',       group: 'rpg', title: 'ᴛᴏᴘ ɢʟᴏʙᴀʟ ʟɪᴍɪᴛ',     label: (u) => `${formatNumber(u.limit)} limit`,         raw: 'Limit' },
]

// Section header — pembeda kategori di .leaderboard all (mini game di atas, rpg, couple di bawah)
const SECTIONS = [
  { group: 'game',   title: 'ᴍɪɴɪ ɢᴀᴍᴇ & ꜱᴛᴀᴛꜱ' },
  { group: 'rpg',    title: 'ʀᴘɢ ᴄᴏʀᴇ' },
  { group: 'couple', title: 'ʀᴘɢ ᴄɪɴᴛᴀ' },
]

async function showAllLeaderboards(m, sock) {
  const senderJid = m.sender.replace(/@s\.whatsapp\.net/, '')
  const users = collectRpgUsers(senderJid)

  if (users.length === 0)
    return m.reply(claraWrap('Leaderboard All', 'Belum ada data player RPG terdaftar.\nKetik .daftar untuk mulai main RPG.'))

  const mkJid = (u) => u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
  const mentions = []

  // Kumpulin board per section — biar ada pembeda kategori (mini game di atas, rpg di bawah)
  const sections = SECTIONS.map(s => ({ ...s, summaryLines: [], boardBlocks: [] }))

  for (const f of ALL_FIELDS) {
    const sec = sections.find(s => s.group === (f.group || 'rpg')) || sections[sections.length - 1]
    const sorted = f.sortBy ? f.sortBy(users) : [...users].sort((a, b) => (b[f.key] || 0) - (a[f.key] || 0))
    const champ = sorted[0]
    // board mini game yang belum ada datanya sama sekali → skip (gak usah nampilin 0-an)
    if (f.sortBy && !(champ?._s > 0)) continue
    sec.summaryLines.push(`${f.raw}: ${f.label(champ)} (@${champ.jid.split('@')[0]})`)
    mentions.push(mkJid(champ))

    // Bagian READMORE — top 5 per board
    const top5 = sorted.slice(0, 5)
    let block = `▌${f.title}\n`
    top5.forEach((u, i) => {
      const medal = MEDALS[i] || `${i + 1}.`
      block += `${medal} @${u.jid.split('@')[0]}${u.jid === senderJid ? ' *(You)*' : ''}\n   ${f.label(u)}\n`
      mentions.push(mkJid(u))
    })
    const myRank = sorted.findIndex((u) => u.jid === senderJid)
    if (myRank !== -1) block += `Kamu: #${myRank + 1} dari ${formatNumber(sorted.length)}\n`
    sec.boardBlocks.push(block)
  }

  // ── Section RPG CINTA — board cinta khusus yang udah punya pasangan ──
  const cintaUsers = users.filter((u) => u.hasSpouse)
  if (cintaUsers.length > 0) {
    const coupleSec = sections.find(s => s.group === 'couple')

    // helper biar gak ngulang
    const pushCoupleBoard = (title, summaryLabel, sorted, subLabel) => {
      const champ = sorted[0]
      coupleSec.summaryLines.push(`${summaryLabel} (@${champ.jid.split('@')[0]})`)
      mentions.push(mkJid(champ))
      let block = `▌${title}\n`
      sorted.slice(0, 5).forEach((u, i) => {
        const medal = MEDALS[i] || `${i + 1}.`
        block += `${medal} @${u.jid.split('@')[0]}${u.jid === senderJid ? ' *(You)*' : ''}\n   ${subLabel(u)}\n`
        mentions.push(mkJid(u))
      })
      const myRank = sorted.findIndex((u) => u.jid === senderJid)
      if (myRank !== -1) block += `Kamu: #${myRank + 1} dari ${formatNumber(sorted.length)}\n`
      coupleSec.boardBlocks.push(block)
    }

    // Love Power — kekuatan cinta (affection + level + bonus job)
    pushCoupleBoard(
      'ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴄɪɴᴛᴀ',
      `Cinta: ${formatNumber(cintaUsers.slice().sort((a, b) => b.lovePower - a.lovePower)[0].lovePower)} LP`,
      cintaUsers.slice().sort((a, b) => b.lovePower - a.lovePower),
      (u) => `${formatNumber(u.cinta)} affection | ${formatNumber(u.lovePower)} LP`
    )
    // Affection — poin kasih sayang murni
    pushCoupleBoard(
      'ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴀꜰꜰᴇᴄᴛɪᴏɴ',
      `Affection: ${formatNumber(cintaUsers.slice().sort((a, b) => b.cinta - a.cinta)[0].cinta)} pts`,
      cintaUsers.slice().sort((a, b) => b.cinta - a.cinta),
      (u) => `${formatNumber(u.cinta)} affection | ${formatNumber(u.lovePower)} LP`
    )
    // Couple War — kemenangan duel pasangan
    pushCoupleBoard(
      'ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴄᴏᴜᴘʟᴇ ᴡᴀʀ',
      `Couple War: ${cintaUsers.slice().sort((a, b) => b.warWin - a.warWin)[0].warWin} wins`,
      cintaUsers.slice().sort((a, b) => b.warWin - a.warWin),
      (u) => `${u.warWin} couple war wins`
    )
  }

  // ── Assemble: bagian VISIBLE — ringkasan juara #1 tiap board, dikelompokin per kategori ──
  const summary = [`Total Player: *${formatNumber(users.length)}*`, ``]
  const boards = []
  for (const sec of sections) {
    if (sec.summaryLines.length === 0) continue // kategori tanpa data → skip sekalian headernya
    summary.push(`── ${sec.title} ──`)
    summary.push(...sec.summaryLines)
    summary.push(``)
    // Bagian READMORE — section header juga jadi pembeda kategori
    boards.push(`▌── ${sec.title} ──`)
    boards.push(...sec.boardBlocks)
  }

  summary.push(`👇 Buka *Baca selengkapnya* buat liat Top 5 tiap board`)

  const content = summary.join('\n') + `\n` + READMORE + `\n\n` + boards.join(`\n`)
  await m.reply(claraWrap('Leaderboard All', content, { mentions }))
}

// ═══════════════════════════════════════════════════════════
// MENU DISPATCHER
// ═══════════════════════════════════════════════════════════
async function showMenu(m, sock) {
  const thumbPath = path.join(process.cwd(), 'assets', 'images', 'nova.jpg')
  let thumb
  try { thumb = fs.readFileSync(thumbPath) } catch { thumb = Buffer.alloc(0) }

  const text = [
    '⚡ Jalur cepat: .leaderboard all',
    'Semua ranking game jadi 1 pesan (readmore).',
    '',
    'Pilih jenis leaderboard:',
    '',
    'RPG:',
    '  gold    — Top player by gold',
    '  level   — Top player by level/EXP',
    '  pvp     — Top player by PvP rating',
    '  gems    — Top player by gems',
    '  boss    — Top player by boss kills',
    '  dungeon — Top player by dungeon clears',
    '  limit   — Top kuota akses fitur',
    '  cinta   — Top couple by love power',
    '',
    'Mini Game & Stats:',
    '  kerja       — Job level',
    '  kills       — Total kills',
    '  survival    — Hari survival',
    '  mancing     — Total tangkapan',
    '  berburu     — Buruan berhasil',
    '  mining      — Bijih ditambang',
    '  nebang      — Pohon ditebang',
    '  nguli       — Kerja kuli',
    '  ojek        — Antar ojek',
    '  sampah      — Buang sampah',
    '  masak       — Total masakan',
    '  slot        — Kemenangan slot',
    '  gacha       — Pull gacha',
    '',
    'Group:',
    '  group   — Aktivitas member minggu ini',
    '  me      — Statistik aktivitas kamu',
    '',
    'Contoh: .leaderboard all | .leaderboard gold',
  ].join('\n')

  try {
    await sock.sendButton(m.chat, thumb, text, m, {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Semua (All)', id: `${m.prefix}leaderboard all` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'RPG Overview', id: `${m.prefix}leaderboard rpg` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Top Gold', id: `${m.prefix}topgold` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Top PvP', id: `${m.prefix}toppvp` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Top Boss', id: `${m.prefix}topboss` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Mancing', id: `${m.prefix}leaderboard mancing` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Gacha', id: `${m.prefix}leaderboard gacha` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Group', id: `${m.prefix}leaderboard group` }) },
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
  if (mode === 'all') return showAllLeaderboards(m, sock)
  if (mode === 'group') return showGroupLeaderboard(m, sock)
  if (mode === 'limit') return showRpgLeaderboard(m, sock, 'limit')
  if (mode.startsWith('game:')) return showGameLeaderboard(m, sock, mode.slice(5))

  // RPG subtypes
  const rpgSub = mode.split(':')[1] || 'overview'
  return showRpgLeaderboard(m, sock, rpgSub)
}

export { pluginConfig as config, handler }
