// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Dispatcher: .leaderboard → menu pilihan RPG / Group
import fs from 'fs'
import path from 'path'
import { getPlugin } from '../../src/lib/nova-plugins.js'
import config from '../../config.js'
import { toSC } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "leaderboard",
  alias: ["leaderboard"],
  category: 'main',
  description: 'Pusat leaderboard — pilih RPG atau Group',
  usage: '.leaderboard [rpg|group]',
  example: '.leaderboard rpg',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

async function handler(m, { sock, config: cfg }) {
  const args = m.args || []
  const sub = args[0]?.toLowerCase()

  // ── .leaderboard rpg → langsung ke RPG leaderboard ──
  if (sub === 'rpg' || sub === 'rpg2') {
    const rpgPlugin = getPlugin('leaderboardrpg')
    if (rpgPlugin && rpgPlugin.handler) {
      const origCommand = m.command
      m.command = 'leaderboardrpg'
      try {
        await rpgPlugin.handler(m, { sock, config: cfg || config })
      } finally {
        m.command = origCommand
      }
    } else {
      await m.reply('❌ RPG leaderboard belum tersedia.')
    }
    return
  }

  // ── .leaderboard group → langsung ke Group leaderboard ──
  if (sub === 'group' || sub === 'grup' || sub === 'aktif' || sub === 'aktifitas') {
    const groupPlugin = getPlugin('aktifitas')
    if (groupPlugin && groupPlugin.handler) {
      if (!m.isGroup) {
        await m.reply('❌ Leaderboard grup hanya bisa digunakan di dalam grup.')
        return
      }
      const origCommand = m.command
      m.command = 'aktifitas'
      try {
        await groupPlugin.handler(m, { sock, config: cfg || config })
      } finally {
        m.command = origCommand
      }
    } else {
      await m.reply('❌ Group leaderboard belum tersedia.')
    }
    return
  }

  // ── .leaderboard (tanpa arg) → tampilkan menu pilihan ──
  const thumbPath = path.join(process.cwd(), 'assets', 'images', 'nova.jpg')
  let thumb
  try {
    thumb = fs.readFileSync(thumbPath)
  } catch {
    thumb = Buffer.alloc(0)
  }

  const menuText = `╭──「 *${toSC('Leaderboard')}* 」
├── ${toSC('Pilih jenis leaderboard')}:
│
├── 🎮 *${toSC('RPG')}*
│   ${toSC('Koin, EXP, Energi — global semua user')}
│
├── 👥 *${toSC('Group')}*
│   ${toSC('Aktivitas member grup minggu ini')}
│
╰──❀

${toSC('Ketik')} *${m.prefix}leaderboard rpg* ${toSC('atau')} *${m.prefix}leaderboard group*`

  try {
    await sock.sendButton(m.chat, thumb, menuText, m, {
      buttons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎮 RPG Leaderboard',
            id: `${m.prefix}leaderboardrpg`
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '👥 Group Leaderboard',
            id: `${m.prefix}aktifitas`
          })
        }
      ]
    })
  } catch {
    await m.reply(menuText)
  }
}

export { pluginConfig as config, handler }
