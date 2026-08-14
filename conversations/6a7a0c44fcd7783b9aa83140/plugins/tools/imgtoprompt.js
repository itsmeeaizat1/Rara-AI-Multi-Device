import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
/**
 * @file plugins/tools/imgtoprompt.js
 * @description Plugin untuk mengubah gambar menjadi prompt AI
 */

import imgtoprompt from '../../src/scraper/img2prompt.js'
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'imgtoprompt',
    alias: ['img2prompt', 'imagetoprompt', 'i2p'],
    category: 'tools',
    description: 'Mengubah gambar menjadi prompt AI',
    usage: '.imgtoprompt (reply gambar)',
    example: '.imgtoprompt',
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
            return m.reply(claraWrap("Imgtoprompt", '❌ *GAMBAR DIBUTUHKAN*\n\n> Reply atau kirim gambar dengan caption .imgtoprompt'));
        }
        
        await m.reply(claraWrap("Imgtoprompt", '🕕 *MEMPROsEs GAMBAR...*\n\n> Menganalisis gambar untuk menghasilkan prompt'));
        let mediaBuffer;
        if (m.isImage && m.download) {
            mediaBuffer = await m.download();
        } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
            mediaBuffer = await m.quoted.download();
        } else {
            { const __navText = '❌ Gagal mengunduh gambar'; return await m.reply(__navText); };
        }
        
        if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
            return m.reply(claraWrap("Imgtoprompt", '❌ Buffer gambar tidak valid'));
        }
        const tmpDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const tmpFile = path.join(tmpDir, `img2prompt_${Date.now()}.webp`);
        fs.writeFileSync(tmpFile, mediaBuffer);
        const result = await imgtoprompt(tmpFile);
        try {
            fs.unlinkSync(tmpFile);
        } catch (e) {}
        if (result.status === 'eror' || !result.prompt) {
            return await m.reply(claraWrap("Imgtoprompt", `❌ *GAGAL*\n\n> ${result.msg || 'Tidak dapat menghasilkan prompt dari gambar ini'}`));
        }
        const responseText = `🎨 *IMAGE TO PROMPT*\n\n` +
            `\`\`\`${result.prompt}\`\`\`\n\n` +
            `> _Generated at: ${result.generatedAt || new Date().toISOString()}_`;
        await m.reply(responseText);
    } catch (error) {
        console.error('[ImgToPrompt Error]', error);
        m.reply(claraWrap("imgtoprompt", te(m.prefix, m.command, m.pushName), "error"));
    }
}

export { pluginConfig as config, handler }