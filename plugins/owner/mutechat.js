// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: ['mutechat', 'mute'],
    alias: ["mutechat", "mute"],
    category: 'owner',
    description: 'Mute/unmute chat',
    usage: '.mutechat <nomor/reply> atau .mutechat buka <nomor>',
    example: '.mutechat 628xxx',
    isOwner: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const action = m.args[0]?.toLowerCase()
    let targetJid = null
    let mute = true

    if (action === 'buka' || action === 'unmute') {
        mute = false
        const num = (m.args[1] || '').replace(/[^0-9]/g, '')
        if (num) targetJid = num + '@s.whatsapp.net'
        else if (m.quoted) targetJid = m.quoted.sender || m.quoted.participant
        else if (!m.isGroup) targetJid = m.chat
    } else {
        if (m.mentionedJid?.length > 0) {
            targetJid = m.mentionedJid[0]
        } else if (m.quoted) {
            targetJid = m.quoted.sender || m.quoted.participant
        } else if (m.args[0]) {
            const num = m.args[0].replace(/[^0-9]/g, '')
            if (num) targetJid = num + '@s.whatsapp.net'
        } else if (!m.isGroup) {
            targetJid = m.chat
        }
    }

    if (!targetJid) {
        return m.reply( '🔇 *Mute Chat*\n\n' +
            '> `.mutechat 628xxx` — Mute chat\n' +
            '> `.mutechat` (di private chat) — Mute chat ini\n' +
            '> `.mutechat buka 628xxx` — Unmute chat', "mutechat")
    }

    try {
        await sock.chatModify({ mute: mute ? 1 : null }, targetJid)
        const target = targetJid.split('@')[0]
        return m.reply(mute
                ? `🔇 *Chat Dimute*\n\nTarget: ${target}`
                : `🔊 *Chat Diunmute*\n\nTarget: ${target}`)
    } catch (err) {
        return m.reply(novaWrap("mutechat", `❌ Gagal: ${err.message}`))
    }
}

export { pluginConfig as config, handler }
