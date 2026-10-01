// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { pixa } from '../../src/scraper/removebackground.js'
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'removebg',
    alias: ["removebg"],
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
    await m.react("🕒");
        const isImage = m.isImage || (m.quoted && m.quoted.isImage);
        if (!isImage) {
            return m.reply(raraWrap("Removebg", '❌ *gambar dibutuhkan*\n\nReply atau kirim gambar dengan caption .removebg'));
        }
        let mediaBuffer;
        if (m.isImage && m.download) {
            mediaBuffer = await m.download();
        } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
            mediaBuffer = await m.quoted.download();
        } else {
            { const __navText = '❌ Gagal mengunduh gambar'; return await m.reply(__navText); };
        }
        
        if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
            return m.reply(raraWrap("Removebg", '❌ Buffer gambar tidak valid'));
        }
        const pathnya = path.join(process.cwd(), 'temp', `rmbg_${Date.now()}.jpg`);
        fs.writeFileSync(pathnya, mediaBuffer);
        const result = await pixa(pathnya);
        
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
            image: result,
            caption: `✅ *background dihapus*\n\nBackground gambar berhasil dihapus`
        }, { quoted: m });
        try {
            fs.unlinkSync(pathnya);
        } catch (e) { console.error('[removebg.js]:', e.message); }
    } catch (error) {
    await m.react("❌");
        console.error('[RemoveBG Error]', error);
        m.reply(raraWrap("removebg", te(m.prefix, m.command, m.pushName), "error"));
    }
}

export { pluginConfig as config, handler }