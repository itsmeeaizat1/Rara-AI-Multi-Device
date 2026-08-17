// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import config from '../../config.js'
/**
 * @file plugins/owner/public.js
 * @description Plugin untuk mengaktifkan mode public (semua bisa akses)
 */
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "public",
    alias: ["public", "publik", "botpublik"],
    category: 'owner',
    description: 'Mengaktifkan mode public (semua user bisa akses)',
    usage: '.public',
    example: '.public',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

/**
 * Handler untuk command public
 */
async function handler(m, { sock }) {
    try {
        const isRealOwner = validateOwner(m);
        if (!isRealOwner) {
            return m.reply(claraWrap("Public", '🚫 *Akses Ditolak*\n\n> Hanya owner yang bisa mengubah mode bot!'));
        }
        const currentMode = config.mode;
        if (currentMode === 'public') {
            { const __navText = 'ℹ️ Bot sudah dalam mode *public*'; return await m.reply(__navText); };
        }
        config.mode = 'public';
        const db = getDatabase();
        db.setting('botMode', 'public');
        
        const responseText = `🌐 *Mode Public Aktif*\n\n` +
            `Bot sekarang merespon semua user!\n\n` +
            `_Gunakan .self untuk menutup akses_`;
        await m.reply(responseText);
        console.log(`[Mode] Changed to PUBLIC by ${m.pushName} (${m.sender})`);
    } catch (error) {
        console.error('[Public Command Error]', error);
        await m.reply(claraWrap("public", te(m.prefix, m.command, m.pushName), "error"));
    }
}

/**
 * Validasi owner dengan multiple checks
 */
function validateOwner(m) {
    if (!m.isOwner) return false;
    if (m.fromMe) return true;
    const senderNumber = m.sender?.replace(/[^0-9]/g, '') || '';
    const ownerNumbers = config.owner?.number || [];
    
    const isInOwnerList = ownerNumbers.some(owner => {
        const cleanOwner = owner.replace(/[^0-9]/g, '');
        return senderNumber.includes(cleanOwner) || cleanOwner.includes(senderNumber);
    });
    if (!isInOwnerList) return false;
    if (!m.sender || !m.sender.includes('@')) return false;
    return true;
}

export { pluginConfig as config, handler }