// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: "inspect",
    alias: ["inspect"],
    category: 'utility',
    description: 'Inspect info grup atau saluran WhatsApp via link',
    usage: '.inspect <link grup/saluran>',
    example: '.inspect https://chat.whatsapp.com/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim()

    if (!text) {
        return m.reply(
            `🔍 *inspect*\n\n` +
            `Cek info grup atau saluran via link\n\n` +
            `*contoh:*\n` +
            `\`${m.prefix}inspect https://chat.whatsapp.com/xxx\`\n` +
            `\`${m.prefix}inspect https://whatsapp.com/channel/xxx\``
        )
    }

    const grupPattern = /chat\.whatsapp\.com\/([\w\d]*)/
    const saluranPattern = /whatsapp\.com\/channel\/([\w\d]*)/
    try {
        if (grupPattern.test(text)) {
            const inviteCode = text.match(grupPattern)[1]
            
            const groupInfo = await sock.groupGetInviteInfo(inviteCode)
            
            let teks = 
                `📋 *information group*\n\n` +
                `📝 Name: *${groupInfo.subject}*\n` +
                `🆔 Id: \`${groupInfo.id}\`\n` +
                `📅 Created: ${new Date(groupInfo.creation * 1000).toLocaleString('id-ID')}\n`

            if (groupInfo.owner) {
                teks += `👑 Creator: @${groupInfo.owner.split('@')[0]}\n`
            }

            teks += 
                `🔗 Linked Parent: ${groupInfo.linkedParent || 'None'}\n` +
                `🔒 Restrict: ${groupInfo.restrict ? '✅' : '❌'}\n` +
                `📢 Announce: ${groupInfo.announce ? '✅' : '❌'}\n` +
                `🏘️ Is Community: ${groupInfo.isCommunity ? '✅' : '❌'}\n` +
                `📣 Community Announce: ${groupInfo.isCommunityAnnounce ? '✅' : '❌'}\n` +
                `✅ Join Approval: ${groupInfo.joinApprovalMode ? '✅' : '❌'}\n` +
                `➕ Member Add Mode: ${groupInfo.memberAddMode ? '✅' : '❌'}\n` +
                `👥 Participants: ${groupInfo.participants?.length || 0}\n` +
                `\n`

            if (groupInfo.desc) {
                teks += `📝 *description:*\n${groupInfo.desc}\n\n`
            }

            if (groupInfo.participants?.length > 0) {
                const admins = groupInfo.participants.filter(p => p.admin)
                if (admins.length > 0) {
                    teks += `👑 *admins:*\n`
                    admins.forEach(a => {
                        teks += `├ @${a.id.split('@')[0]} [${a.admin}]\n`
                    })
                    teks += ""
                }
            }

            const mentions = []
            if (groupInfo.owner) mentions.push(groupInfo.owner)
            if (groupInfo.participants) {
                groupInfo.participants.filter(p => p.admin).forEach(a => mentions.push(a.id))
            }
            return sock.sendMessage(m.chat, { text: teks, mentions }, { quoted: m })

        } else if (saluranPattern.test(text) || text.endsWith('@newsletter') || !isNaN(text)) {
            const channelId = saluranPattern.test(text) ? text.match(saluranPattern)[1] : text
            
            const channelInfo = await sock.newsletterMsg(channelId)
            
            const teks = 
                `📺 *information channel*\n\n` +
                `🆔 Id: \`${channelInfo.id}\`\n` +
                `📌 sTate: ${channelInfo.state?.type || '-'}\n` +
                `📝 Name: *${channelInfo.thread_metadata?.name?.text || '-'}*\n` +
                `📅 Created: ${new Date((channelInfo.thread_metadata?.creation_time || 0) * 1000).toLocaleString('id-ID')}\n` +
                `👥 sUbscribers: ${channelInfo.thread_metadata?.subscribers_count || 0}\n` +
                `✅ Verification: ${channelInfo.thread_metadata?.verification || '-'}\n` +
                `\n` +
                `📝 *description:*\n${channelInfo.thread_metadata?.description?.text || 'No description'}`
            return await m.reply(teks)

        } else {
            return m.reply(raraWrap("Inspect", '❌ Hanya support URL Grup atau Saluran WhatsApp!'))
        }

    } catch (error) {
        
        if (error.data) {
            if ([400, 406].includes(error.data)) {
                return m.reply('❌ Grup/Saluran tidak ditemukan!')
            }
            if (error.data === 401) {
                return m.reply(raraWrap("Inspect", '❌ Bot di-kick dari grup tersebut!'))
            }
            if (error.data === 410) {
                return m.reply(raraWrap("Inspect", '❌ URL grup telah di-reset!'))
            }
        }
        
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }