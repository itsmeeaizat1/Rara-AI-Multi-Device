// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'setbio',
    alias: ['setbiobot', 'setstatus', 'setabout'],
    category: 'tools',
    description: 'Mengubah bio/status bot',
    usage: '.setbio <bio baru>',
    example: '.setbio Bot WhatsApp by Lucky Archz',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const newBio = m.text?.trim()
    
    if (!newBio && m.args?.length === 0) {
        await sendReplyWithNav(sock, m, `⚠️ *CARA PAKAI*\n\n` +
            `> \`${m.prefix}setbio Bio bot baru\`\n` +
            `> \`${m.prefix}setbio clear\` - Hapus bio`, "setbio")
        return
    }
    
    const bioToSet = newBio?.toLowerCase() === 'clear' ? '' : (newBio || '')
    
    if (bioToSet.length > 139) {
        await m.reply(claraWrap("setbio", `⚠️ *VALIDAsI*\n\n` +
            `> Bio maksimal 139 karakter.`))
        return
    }
    
    try {
        await sock.updateProfileStatus(bioToSet)
        
        if (bioToSet) {
            await m.reply(claraWrap("setbio", `✅ *BIO BOT DIUBAH*\n\n` +
                `> Bio bot sekarang:\n` +
                `> _${bioToSet}_`))
        } else {
            await m.reply(claraWrap("setbio", `✅ *BIO BOT DIHAPUs*\n\n` +
                `> Bio bot berhasil dihapus!`))
        }
    } catch (error) {
        await m.reply(
            `❌ *GAGAL*\n\n` +
            `> Tidak dapat mengubah bio bot.\n` +
            `> _${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }