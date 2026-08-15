import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { pixa } from '../../src/scraper/removebackground.js'
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'removebg',
    alias: ['rmbg', 'nobg', 'hapusbg'],
    category: 'tools',
    description: 'Menghapus background gambar',
    usage: '.removebg (reply gambar)',
    example: '.removebg',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
};

async function handler(m, { sock }) {
    try {
        const isImage = m.isImage || (m.quoted && m.quoted.isImage);
        if (!isImage) {
            return m.reply(claraWrap("Removebg", '❌ *GAMBAR DIBUTUHKAN*\n\n> Reply atau kirim gambar dengan caption .removebg'));
        }
        
        await m.react('🕐')
        
        let mediaBuffer;
        if (m.isImage && m.download) {
            mediaBuffer = await m.download();
        } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
            mediaBuffer = await m.quoted.download();
        } else {
            { const __navText = '❌ Gagal mengunduh gambar'; return await m.reply(__navText); };
        }
        
        if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
            return m.reply(claraWrap("Removebg", '❌ Buffer gambar tidak valid'));
        }
        const pathnya = path.join(process.cwd(), 'temp', `rmbg_${Date.now()}.jpg`);
        fs.writeFileSync(pathnya, mediaBuffer);
        const result = await pixa(pathnya);
        
        await sock.sendMessage(m.chat, {
            image: result,
            caption: `✅ *BACKGROUND DIHAPUs*\n\n> Background gambar berhasil dihapus`
        }, { quoted: m });
        try {
            fs.unlinkSync(pathnya);
        } catch (e) {}
    } catch (error) {
        console.error('[RemoveBG Error]', error);
        m.reply(claraWrap("removebg", te(m.prefix, m.command, m.pushName), "error"));
    }
}

export { pluginConfig as config, handler }