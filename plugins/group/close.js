// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'close',
    alias: ["close", 'tutup', 'closegroup', 'tutupgroup'],
    category: 'group',
    description: 'Menutup grup agar hanya admin yang bisa chat',
    usage: '.close',
    example: '.close',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
};

async function handler(m, { sock }) {
    try {
        const groupMeta = m.groupMetadata;
        
        if (groupMeta.announce) {
            await m.reply(claraWrap("Validasi Gagal", ["Grup sudah dalam keadaan `tertutup`.", "Hanya admin yang bisa mengirim pesan."].join("\n")));
            return;
        }
        
        await sock.groupSettingUpdate(m.chat, 'announcement');
        
        const senderNum = m.sender.split('@')[0];
        
        const successMsg = `✅ @${senderNum} telah menutup grup ini`;
        
        await m.reply(successMsg, { mentions: [m.sender] });
        
    } catch (error) {
        await m.reply(claraWrap("Error", ["Gagal menutup grup.", `_${error.message}_`].join("\n")));
    }
}

export { pluginConfig as config, handler }