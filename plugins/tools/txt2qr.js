// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
const pluginConfig = {
    name: "txt2qr",
    alias: ["txt2qr"],
    category: 'tools',
    description: 'Generate QR code dari teks',
    usage: '.txt2qr <text>',
    example: '.txt2qr https://google.com',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    
    if (!text) {
        { const __navText = `📱 *text to qr*\n\nMasukkan teks/URL\n\n\`Contoh: ${m.prefix}txt2qr https://google.com\``; return await m.reply( __navText, "txt2qr"); }
    }
    try {
    await m.react("🕒");
        const url = `https://api-faa.my.id/faa/qr-create?text=${encodeURIComponent(text)}`
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        await m.react("🐣");
        let card = "";
        try {
            const info = await probeBuffer(Buffer.from(res.data));
            card = mediaResultCard({
                header: "txt2qr",
                type: "gambar",
                request: [["Teks", text.substring(0, 80)]],
                size: info.size, mime: info.mime, width: info.width, height: info.height,
            });
        } catch { /* best-effort */ }
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: (card || `📱 *qr code*\n\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`)
        }, { quoted: m })
        
    } catch (error) {
    await m.react("❌");
        m.reply(raraWrap("txt2qr", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }