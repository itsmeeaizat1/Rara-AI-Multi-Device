// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { getParticipantJid, resolveAnyLidToJid } from '../../src/lib/nova-lid.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "groupinfo",
    alias: ["groupinfo"],
    category: 'group',
    description: 'Menampilkan informasi lengkap grup',
    usage: '.groupinfo',
    example: '.groupinfo',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: false,
    isBotAdmin: false
}

function featureStatus(val) {
    if (val === true || val === 'on') return '✅'
    return '❌'
}

async function handler(m, { sock, db }) {
    try {
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        const admins = participants.filter(p => p.admin)

        let ownerJid = null
        if (groupMeta.owner) ownerJid = resolveAnyLidToJid(groupMeta.owner, participants)
        if (!ownerJid || ownerJid.includes('@lid')) {
            const superAdmin = participants.find(p => p.admin === 'superadmin')
            if (superAdmin) ownerJid = getParticipantJid(superAdmin)
        }
        if (!ownerJid || ownerJid.includes('@lid')) {
            const firstAdmin = admins[0]
            if (firstAdmin) ownerJid = getParticipantJid(firstAdmin)
        }

        const group = db.getGroup(m.chat) || {}

        const createdDate = groupMeta.creation
            ? timeHelper.fromTimestamp(groupMeta.creation * 1000, 'D MMMM YYYY')
            : 'Tidak diketahui'

        const ownerNumber = ownerJid ? ownerJid.split('@')[0] : null
        const ownerDisplay = ownerNumber && !ownerNumber.includes(':')
            ? `@${ownerNumber}`
            : 'Tidak diketahui'

        let ppUrl = null
        try {
            ppUrl = await sock.profilePictureUrl(m.chat)
        } catch (e) { console.error('[groupinfo.js]:', e.message); }

        const isOpen = groupMeta.announce === false || !groupMeta.announce

        let text = claraWrap("Info Grup", [`Nama: *${groupMeta.subject}*`, `ID: ${m.chat}`, `Owner: ${ownerDisplay}`, `Dibuat: ${createdDate}`, `Status: ${isOpen ? '🔓 Terbuka' : '🔒 Tertutup'}`, ``, `📊 *ᴍᴇᴍʙᴇʀ*`, `Total: ${participants.length}`, `Admin: ${admins.length}`, `Member: ${participants.length - admins.length}`, ``, `🔧 *ꜰɪᴛᴜʀ ᴀᴋᴛɪꜰ*`, `Welcome: ${featureStatus(group.welcome)}`, `Goodbye: ${featureStatus(group.goodbye)}`, `Autoreply: ${featureStatus(group.autoreply)}`, `AutoAI: ${featureStatus(group.autoai)}`, `AutoDL: ${featureStatus(group.autodl)}`, `AutoSticker: ${featureStatus(group.autosticker)}`, `AutoMedia: ${featureStatus(group.automedia)}`, ``, `🛡️ *ᴘʀᴏᴛᴇᴋꜱɪ*`, `AntiLink: ${featureStatus(group.antilink)}`, `AntiBot: ${featureStatus(group.antibot)}`, `AntiToxic: ${featureStatus(group.antitoxic)}`, `AntiRemove: ${featureStatus(group.antiremove)}`, `AntiHidetag: ${featureStatus(group.antihidetag)}`, `AntiSticker: ${featureStatus(group.antisticker)}`, `AntiMedia: ${featureStatus(group.antimedia)}`, `AntiDocument: ${featureStatus(group.antidocument)}` + (groupMeta.desc ? `\n\n📝 *ᴅᴇꜱᴋʀɪᴘꜱɪ*\n${groupMeta.desc}` : "")].join("\n"));

        const mentions = ownerJid && !ownerJid.includes(':') ? [ownerJid] : []

        if (ppUrl) {

            try {
                const ppBuffer = Buffer.from((await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 })).data)
                await sock.sendMessage(m.chat, {
                    image: ppBuffer,
                    caption: text,
                    mentions
                }, { quoted: m })
            } catch {
                await m.reply( text, "groupinfo")
            }
        } else {
            await m.reply(claraWrap("groupinfo", text))
        }
    } catch (error) {
        m.reply(claraWrap("groupinfo", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }