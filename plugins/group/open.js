import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "opengc",
    alias: ["opengc", "buka", "bukagc"],
    category: 'group',
    description: 'Membuka grup agar semua member bisa chat',
    usage: '.open',
    example: '.open',
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
        
        if (!groupMeta.announce) {
            await m.reply(
                `⚠️ *ᴠᴀʟɪᴅᴀsɪ ɢᴀɢᴀʟ*\n\n` +
                `> Grup sudah dalam keadaan \`terbuka\`.\n` +
                `> Semua member sudah bisa mengirim pesan.`
            );
            return;
        }
        
        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        
        const senderNum = m.sender.split('@')[0];
        
        const successMsg = `✅ @${senderNum} telah membuka grup ini\n_Sekarang kalian bisa mengirim pesan_`;
        
        { const __navText = (successMsg, { mentions: [m.sender] }); await m.reply(__navText); };
        
    } catch (error) {
        await m.reply(claraWrap("Error", ["Gagal membuka grup.", `_${error.message}_`].join("\n")));
    }
}

export { pluginConfig as config, handler }