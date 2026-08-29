// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendStoreBackup, SCHEMA_VERSION } from '../../src/lib/nova-store-backup.js'
const pluginConfig = {
    name: "backupdb",
    alias: ["backupdb"],
    category: 'owner',
    description: 'Backup database/store dan kirim ke owner',
    usage: '.backupdb',
    isOwner: true,
    isGroup: false,
    isEnabled: true,
    energi: 0
}

async function handler(m, { sock }) {
    const backupContents = [
        '📁 database/*.json (semua file JSON)',
        '📁 database/cpanel/* (data cPanel)',
        '📄 storage/database.json (main database)',
        '📄 db.json (root database)',
        '📄 database/main/*.json (main database)',
        '📋 backup_metadata.json (info schema)'
    ]
    
    await m.reply(
        `🕕 *Membuat backup database...*\n\n` +
        `╭──「 *Apa Yang Di-Backup* 」\n` +
        backupContents.map(c => `│ ${c}`).join('\n') +
        `\n╰┈┈┈┈┈┈┈┈`
    )
    
    const result = await sendStoreBackup(sock)
    
    if (result.success) {
        await m.reply(
            `✅ *Backup Berhasil!*\n\n` +
            `📦 Size: ${result.size}\n` +
            `📁 Files: ${result.files}\n` +
            `🔖 Schema: v${SCHEMA_VERSION}\n\n` +
            `Type-safe backup, kompatibel dengan update mendatang.\n` +
            `Backup telah dikirim ke owner utama.`
        )
    } else {
        { const __navText = claraWrap("backupdb", `❌ Backup gagal: ${result.error}`); await m.reply(__navText); }
    }
}

export { pluginConfig as config, handler }