// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAllJadibotSessions, getActiveJadibots } from '../../src/lib/nova-jadibot-manager.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'listjadibot',
    alias: ["listjadibot"],
    category: 'owner',
    description: 'Lihat semua session jadibot yang tersimpan',
    usage: '.listjadibot',
    example: '.listjadibot',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const sessions = getAllJadibotSessions()
    const active = getActiveJadibots()

    if (sessions.length === 0) {
        return m.reply(claraWrap("Listjadibot", `❌ Tidak ada session jadibot tersimpan`))
    }

    let txt = `*Daftar Jadibot*\n\n`
    txt += `Total: *${sessions.length}* session\n`
    txt += `Aktif: *${active.length}*\n`
    txt += `Offline: *${sessions.length - active.length}*\n\n`

    sessions.forEach((s, i) => {
        const status = s.isActive ? 'Aktif' : 'Expired'
        const label = s.isActive ? 'Online' : 'Offline'
        txt += `${status} *${i + 1}.* @${s.id} — _${label}_\n`
    })

    txt += `\n\`${m.prefix}listjadibotaktif\` — Detail aktif\n`
    txt += `\`${m.prefix}stopalljadibot\` — Stop semua\n`
    txt += `\`${m.prefix}stopdandeletejadibot @user\` — Hapus session`

    const mentions = sessions.map(s => s.jid)

    await sock.sendMessage(m.chat, {
        text: txt,
        mentions,
        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: 'Lihat Aktif',
                    id: `${m.prefix}listjadibotaktif`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🛑 Stop Semua',
                    id: `${m.prefix}stopalljadibot`
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
}

export { pluginConfig as config, handler }