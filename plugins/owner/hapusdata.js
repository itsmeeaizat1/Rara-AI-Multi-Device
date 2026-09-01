// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'hapusdata',
    alias: ["hapusdata"],
    category: 'owner',
    description: 'Reset semua data database ke default',
    usage: '.hapusdata',
    example: '.hapusdata',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

const pendingReset = new Map()

async function handler(m, { sock }) {
  try {
    const args = m.text

    if (args === 'ya' || args === 'yes' || args === 'confirm') {
        const pending = pendingReset.get(m.sender)
        if (!pending || Date.now() - pending > 60000) {
            pendingReset.delete(m.sender)
            return m.reply( `❌ Tidak ada permintaan reset yang aktif.\n\nKetik \`${m.prefix}hapusdata\` terlebih dahulu`, "hapusdata")
        }

        pendingReset.delete(m.sender)
        const db = getDatabase()
        const result = db.resetToDefaults()
        await sock.sendMessage(m.chat, {
            text:
                `🗑️ *Data Direset*\n\n` +
                `📁 File direset: *${result.resetCount}/${result.total}*\n` +
                `💾 Backup: \`${result.backupFolder}/\`\n\n` +
                `Semua data telah dikembalikan ke default.\n\n` +
                `⚠️ Restart bot untuk memastikan data tersinkronisasi`
        }, { quoted: m })
        return
    }

    const db = getDatabase()
    const dbPath = db.dbPath
    const fileMap = [
        { key: 'users', label: '👥 Users' },
        { key: 'groups', label: '👥 Groups' },
        { key: 'settings', label: '⚙️ Settings' },
        { key: 'stats', label: '📊 Stats' },
        { key: 'sewa', label: '🏪 Sewa' },
        { key: 'premium', label: '⭐ Premium' },
        { key: 'owner', label: '👑 Owner' },
        { key: 'partner', label: '🤝 Partner' },
    ]

    const existing = []
    let totalSize = 0

    for (const { key, label } of fileMap) {
        const data = db.db.data[key]
        if (!data) continue
        const entries = Array.isArray(data) ? data.length : Object.keys(data).length
        const size = Buffer.byteLength(JSON.stringify(data))
        totalSize += size
        existing.push({ label, key, entries, size: `${(size / 1024).toFixed(1)} KB` })
    }

    if (existing.length === 0) {
        return m.reply(claraWrap("Hapusdata", `❌ Tidak ada data database yang ditemukan`))
    }

    pendingReset.set(m.sender, Date.now())

    let txt = `⚠️ *Peringatan — Hapus Data*\n\n`
    txt += `Aksi ini akan menghapus *SEMUA* data berikut:\n\n`

    for (const { label, entries, size } of existing) {
        txt += `${label}: *${entries}* data (${size})\n`
    }

    txt += `\n📦 Total: *${(totalSize / 1024).toFixed(1)} KB*\n`
    txt += `💾 Backup otomatis dibuat sebelum reset\n\n`
    txt += `Ketik \`${m.prefix}hapusdata ya\` dalam 60 detik untuk melanjutkan.`

    await sock.sendMessage(m.chat, {
        text: txt,
        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '✅ Ya, Hapus Semua',
                    id: `${m.prefix}hapusdata ya`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '❌ Batalkan',
                    id: `${m.prefix}menu`
                })
            }
        ,
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "Kembali",
              id: m.prefix + "menu"
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "Tanya AI",
              id: m.prefix + "aihelp"
            })
          }
        ]
    }, { quoted: m })

    setTimeout(() => { pendingReset.delete(m.sender) }, 60000)

  } catch (e) {
    console.error("[hapusdata.js]:", e.message);
    try { await m.reply("❌ Terjadi error: " + (e.message || "unknown")); } catch {}
  }
}

export { pluginConfig as config, handler }
