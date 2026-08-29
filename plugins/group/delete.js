// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'delete',
    alias: ["delete"],
    category: 'group',
    description: 'Hapus pesan dengan reply',
    usage: '.delete (reply pesan)',
    example: '.delete',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply(novaNoInput("Delete", "Balas / reply pesan yang mau dihapus ya!"))
    }

    const quotedSender = m.quoted.sender || m.quoted.key?.participant
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const isOwnMessage = m.quoted.key?.fromMe || quotedSender === m.sender
    const isBotMessage = quotedSender === botJid || m.quoted.key?.fromMe

    if (!isOwnMessage && !isBotMessage) {
        if (!m.isBotAdmin) {
            return m.reply(novaError("Delete", "Bot harus jadi admin grup dulu buat bisa hapus pesan member lain!"))
        }
        if (!m.isAdmin && !m.isOwner) {
            return m.reply(novaError("Delete", "Hanya admin grup yang bisa menghapus pesan member lain!"))
        }
    }

    try {
        const key = {
            remoteJid: m.chat,
            id: m.quoted.key.id,
            fromMe: m.quoted.key.fromMe,
            participant: quotedSender
        }

        await sock.sendMessage(m.chat, { delete: key })
    } catch (err) {
        return m.reply(novaError("Delete", `Gagal hapus pesan nih: ${err.message || "Pesan mungkin sudah terhapus atau terlalu lama."}`))
    }
}

export { pluginConfig as config, handler }