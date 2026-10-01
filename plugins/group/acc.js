// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'acc',
    alias: ["acc"],
    category: 'group',
    description: 'Kelola permintaan masuk grup (accept/reject)',
    usage: '.acc <list|approve|reject> [all|nomor]',
    example: '.acc approve all',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function formatDate(timestamp) {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp * 1000))
}

async function handler(m, { sock }) {
    const args = m.args || []
    const sub = args[0]?.toLowerCase()
    const option = args.slice(1).join(' ')?.trim()

    if (!sub || !['list', 'approve', 'reject'].includes(sub)) {
        return m.reply(novaGuide('Join Request Manager', 'Kelola permintaan bergabung di grup ini.', `${m.prefix}acc list`))
    }
    try {
        const pendingList = await sock.groupRequestParticipantsList(m.chat)

        if (!pendingList?.length) {
            return m.reply(novaEmpty('Acc', 'Tidak ada permintaan masuk yang tertunda saat ini.'))
        }

        if (sub === 'list') {
            let text = `📋 *daftar permintaan masuk*\n\n`
            text += `Total: ${pendingList.length} permintaan\n\n`

            for (let i = 0; i < pendingList.length; i++) {
                const req = pendingList[i]
                const number = req.jid?.split('@')[0] || 'Unknown'
                const method = req.request_method || '-'
                const time = req.request_time ? formatDate(req.request_time) : '-'

                text += `*${i + 1}.* @${number}\n`
                text += `   📱 ${number}\n`
                text += `   📨 ${method}\n`
                text += `   🕐 ${time}\n\n`
            }

            text += `Gunakan \`${m.prefix}acc approve all\` atau \`${m.prefix}acc reject all\``

            const mentions = pendingList.map(r => r.jid)
            return m.reply(claraWrap("acc", text))
        }

        const action = sub

        if (option === 'all') {
            const jids = pendingList.map(r => r.jid)

            const results = await sock.groupRequestParticipantsUpdate(m.chat, jids, action)

            const success = results.filter(r => r.status === '200' || !r.status || r.status === 200).length
            const failed = results.length - success

            const label = action === 'approve' ? 'Diterima' : 'Ditolak'
            return m.reply(claraWrap(`${label.toUpperCase()} SEMUA`, 
                `✅ Berhasil: ${success}\n` +
                `❌ Gagal: ${failed}\n` +
                `📊 Total: ${results.length}`))
        }

        const indices = option.split('|').map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < pendingList.length)

        if (!indices.length) {
            return m.reply(novaGuide('Acc', 'Nomor urut tidak valid. Silakan cek nomor dari list terlebih dahulu.', `${m.prefix}acc ${action} 1`))
        }

        const targets = indices.map(i => pendingList[i])
        let text = ''
        const label = action === 'approve' ? 'Diterima' : 'Ditolak'
        let successCount = 0

        for (const target of targets) {
            try {
                const result = await sock.groupRequestParticipantsUpdate(m.chat, [target.jid], action)
                const status = result[0]?.status
                const ok = status === '200' || !status || status === 200

                const number = target.jid.split('@')[0]
                text += `${ok ? '✅' : '❌'} ${number} — ${ok ? label : 'Gagal'}\n`
                if (ok) successCount++
            } catch {
                const number = target.jid.split('@')[0]
                text += `❌ ${number} — Error\n`
            }
        }
        return m.reply(
            `📋 *Hasil ${label.toUpperCase()}*\n\n` +
            text + `\n` +
            `✅ ${successCount}/${targets.length} berhasil`
        )
    } catch (error) {
        m.reply(novaError('Acc', `Gagal memproses permintaan masuk: ${error.message || 'Terjadi kesalahan'}`))
    }
}

export { pluginConfig as config, handler }
