import { raraWrap } from "../../src/lib/rara-menu-style.js";
// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
const pluginConfig = {
    name: 'delppgc',
    alias: ["delppgc"],
    category: 'group',
    description: 'Menghapus foto profil grup',
    usage: '.delppgc',
    example: '.delppgc',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        await sock.removeProfilePicture(m.chat)
        
        await m.reply(raraWrap("Delppgc", `PP Grup sekarang sudah botak`, "success"))
    } catch (error) {
        await m.reply(
            `❌ *gagal*\n\n` +
            `Tidak dapat menghapus foto grup.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }