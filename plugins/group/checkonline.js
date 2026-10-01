// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'cekonline',
    alias: ["cekonline"],
    category: 'group',
    description: 'Cek member yang online di grup',
    usage: '.cekonline',
    example: '.cekonline',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const groupMetadata = m.groupMetadata
        const participants = m.groupMembers
        
        if (participants.length === 0) {
            return m.reply(claraWrap("cekonline", `gagal\n\nTidak bisa mendapatkan data member grup`, "error"))
        }
        await m.reply(claraWrap("Cekonline", `🔍 mencari member online...\n\nMenunggu response dari ${participants.length} member\nEstimasi: 5-10 detik`, "info"))
        
        const presences = {}
        
        const presenceHandler = (update) => {
            if (update.id === m.chat && update.presences) {
                for (const [jid, presence] of Object.entries(update.presences)) {
                    if (presence.lastKnownPresence === 'available' || 
                        presence.lastKnownPresence === 'composing' || 
                        presence.lastKnownPresence === 'recording') {
                        presences[jid] = presence.lastKnownPresence
                    }
                }
            }
        }
        
        sock.ev.on('presence.update', presenceHandler)
        
        const batchSize = 10
        for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize)
            await Promise.all(batch.map(p => 
                sock.presenceSubscribe(p.id).catch((e) => { console.error('[checkonline.js]:', e.message); })
            ))
            await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        sock.ev.off('presence.update', presenceHandler)
        
        const onlineMembers = Object.keys(presences)
        const mentions = onlineMembers
        
        let text = `📊 *cek online*\n\n`
        text += ""
        text += `👥 Nama: *${groupMetadata.subject}*\n`
        text += `👤 Total: \`${participants.length}\` member\n`
        text += `🟢 Online: \`${onlineMembers.length}\` member\n`
        text += `\n`
        
        if (onlineMembers.length === 0) {
            text += `_Tidak ada member yang terdeteksi online_\n`
            text += `_Pastikan member telah membuka WA_`
        } else {
            text += ""
            
            let count = 0
            for (const jid of onlineMembers) {
                if (count >= 50) {
                    text += `... dan ${onlineMembers.length - 50} member lainnya\n`
                    break
                }
                const number = jid.split('@')[0]
                const participant = participants.find(p => p.id === jid)
                const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin'
                const adminBadge = isAdmin ? ' 👑' : ''
                
                let statusIcon = '🟢'
                if (presences[jid] === 'composing') statusIcon = '⌨️'
                if (presences[jid] === 'recording') statusIcon = '🎤'
                
                text += `${statusIcon} @${number}${adminBadge}\n`
                count++
            }
            
            text += `\n`
            text += `🟢 Online | ⌨️ Mengetik | 🎤 Rekam Audio`
        }
        await m.reply(text, { mentions });
        
    } catch (error) {
        m.reply(claraWrap("cekonline", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }