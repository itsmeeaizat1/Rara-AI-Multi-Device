// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { stopJadibot, getAllJadibotSessions } from '../../src/lib/nova-jadibot-manager.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'stopdandeletejadibot',
    alias: ["stopdandeletejadibot"],
    category: 'owner',
    description: 'Stop dan hapus session jadibot user secara permanen',
    usage: '.stopdandeletejadibot @user',
    example: '.stopdandeletejadibot @628xxx',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let target = null

    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0]
    } else if (m.text?.trim()) {
        const num = m.text.trim().replace(/[^0-9]/g, '')
        if (num) target = num + '@s.whatsapp.net'
    }

    if (!target) {
        const sessions = getAllJadibotSessions()

        if (sessions.length === 0) {
            return m.reply(claraWrap("Stopdandeletejadibot", `❌ Tidak ada session jadibot tersimpan`))
        }

        let txt = ` *sTop & Delete Jadibot*\n\n`
        txt += `Pilih target dengan mention atau reply:\n\n`

        sessions.forEach((s, i) => {
            const status = s.isActive ? '🟢' : '⚫'
            txt += `${status} *${i + 1}.* @${s.id}\n`
        })

        txt += `\n💡 *Contoh:* \`${m.prefix}stopdandeletejadibot @628xxx\``

        return sock.sendMessage(m.chat, {
            text: txt,
            mentions: sessions.map(s => s.jid)
        }, { quoted: m })
    }

    const id = target.replace(/@.+/g, '')
    const sessions = getAllJadibotSessions()
    const session = sessions.find(s => s.id === id)

    if (!session) {
        { const __navText = claraWrap("@${id}", `❌ Session jadibot untuk *@${id}* tidak ditemukan`); return await m.reply(__navText); }
    }
    try {
        await stopJadibot(target, true)
        await sock.sendMessage(m.chat, {
            text: ` *Jadibot Dihapus*\n\n` +
                `📱 Nomor: *@${id}*\n` +
                ` Status: *Deleted*\n\n` +
                `Session telah dihapus secara permanen.\n` +
                `User perlu \`.jadibot\` ulang untuk membuat session baru.`,
            mentions: [target]
        }, { quoted: m })
    } catch (error) {
        await m.reply(claraWrap("stopdandeletejadibot", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }