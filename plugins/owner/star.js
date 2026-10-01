import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {
    name: ['star', 'bintang'],
    alias: ["star", "bintang"],
    category: 'owner',
    description: 'Beri/hapus bintang pada pesan',
    usage: '.star (reply pesan) atau .star hapus (reply pesan)',
    example: '.star',
    isOwner: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply('⭐ *sTar Message*\n\n' +
            '> `.star` (reply pesan) — Beri bintang\n' +
            '> `.star hapus` (reply pesan) — Hapus bintang')
    }

    const unstar = m.args[0]?.toLowerCase() === 'hapus' || m.args[0]?.toLowerCase() === 'unstar'
    const key = m.quoted.key

    try {
        await sock.chatModify({
            star: {
                messages: [{ id: key.id, fromMe: key.fromMe }],
                star: !unstar
            }
        }, m.chat)
        return m.reply(unstar
                ? '❌ *Bintang dihapus dari pesan*'
                : '⭐ *Pesan ditandai bintang*')
    } catch (err) {
        return m.reply(novaWrap("star", `❌ Gagal: ${err.message}`))
    }
}

export { pluginConfig as config, handler }
