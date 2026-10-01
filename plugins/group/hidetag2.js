// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import config from '../../config.js'
import { getParticipantJids } from '../../src/lib/rara-lid.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'hidetag2',
    alias: ["hidetag2", "h2"],
    category: 'group',
    description: 'Hidetag dengan fakeQuoted styling',
    usage: '.h2 <text> atau reply pesan',
    example: '.h2 Pengumuman penting!',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock }) {
    const text = m.fullArgs?.trim()

    if (!text && !m.quoted) {
        return m.reply( `📢 *hidetag 2*\n\n` +
            `\`${m.prefix}h2 <text>\`\n` +
            `Reply pesan + \`${m.prefix}h2\``, "hidetag2")
    }
    try {
        const groupMeta = m.groupMetadata
        const users = getParticipantJids(groupMeta.participants || [])
        const fakeQuoted = {
            key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
            },
            message: {
                conversation: config.bot?.name || 'Rara MD'
            }
        }
        if (m.quoted) {
            const q = m.quoted
            const qMsg = q.message || {}
            const type = Object.keys(qMsg)[0]
            if (type === 'imageMessage') {
                const media = await q.download()
                return sock.sendMessage(
                    m.chat,
                    {
                        image: media,
                        caption: qMsg.imageMessage?.caption || '',
                        mentions: users
                    },
                    { quoted: fakeQuoted }
                )
            }
            if (type === 'videoMessage') {
                const media = await q.download()
                return sock.sendMessage(
                    m.chat,
                    {
                        video: media,
                        caption: qMsg.videoMessage?.caption || '',
                        mentions: users
                    },
                    { quoted: fakeQuoted }
                )
            }
            if (type === 'stickerMessage') {
                const media = await q.download()
                return sock.sendMessage(
                    m.chat,
                    { sticker: media, mentions: users },
                    { quoted: fakeQuoted }
                )
            }
            if (type === 'audioMessage') {
                const media = await q.download()
                return sock.sendMessage(
                    m.chat,
                    {
                        audio: media,
                        mimetype: qMsg.audioMessage?.mimetype,
                        ptt: qMsg.audioMessage?.ptt || false,
                        mentions: users
                    },
                    { quoted: fakeQuoted }
                )
            }
            if (type === 'documentMessage') {
                const media = await q.download()
                return sock.sendMessage(
                    m.chat,
                    {
                        document: media,
                        fileName: qMsg.documentMessage?.fileName || 'file',
                        mimetype: qMsg.documentMessage?.mimetype,
                        mentions: users
                    },
                    { quoted: fakeQuoted }
                )
            }
            const quotedText =
                q.text ||
                qMsg.conversation ||
                qMsg.extendedTextMessage?.text ||
                ''

            return sock.sendMessage(
                m.chat,
                { text: quotedText, mentions: users },
                { quoted: fakeQuoted }
            )
        }

        // ===== TEXT MODE =====
        await sock.sendMessage(
            m.chat,
            {
                text,
                mentions: users
            },
            { quoted: fakeQuoted }
        )
    } catch (err) {
        m.reply(raraWrap("hidetag2", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }