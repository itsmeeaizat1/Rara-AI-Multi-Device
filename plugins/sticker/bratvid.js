// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { bratVid } from 'brat-canvas/video'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
    name: 'bratvid',
    alias: ["bratvid"],
    category: 'sticker',
    description: 'Membuat sticker brat animated',
    usage: '.bratvid <text>',
    example: '.bratvid Hai semua',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        { const __navText = `🎬 *brat animated*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}bratvid Hai semua\``; return await m.reply( __navText, "bratvid"); }
    }
    try {
        await m.react("🕒")
        const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.mp4`)
        const url = await bratVid(text, { outputFormat: 'mp4' })
        
        // bratVid returns URL — download the actual video buffer
        let videoBuffer
        if (Buffer.isBuffer(url)) {
            videoBuffer = url
        } else {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
            videoBuffer = Buffer.from(res.data)
        }
        await fs.promises.writeFile(tempFile, videoBuffer)
        await m.react("🐣")
        await sock.sendVideoAsSticker(m.chat, tempFile, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        await fs.promises.unlink(tempFile)
        await m.reply(novaBerhasil("Bratvid"));
    } catch (error) {
        m.reply(novaGangguan("Bratvid"))
    }
}

export { pluginConfig as config, handler }