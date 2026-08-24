// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import FormData from 'form-data'
import te from '../../src/lib/nova-error.js'
import config from "../../config.js";
const pluginConfig = {
    name: ['qrcustom', 'qrcode', 'qr'],
    alias: [],
    category: 'tools',
    description: 'Generate QR code custom dengan logo',
    usage: '.qrcustom <url>',
    example: '.qrcustom https://wa.me/628xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const BASE_URL = 'https://api.denayrestapi.xyz'

async function uploadTo0x0(buffer) {
    try {
        const form = new FormData()
        form.append('file', buffer, { filename: 'logo.png', contentType: 'image/png' })
        
        const response = await axios.post('https://c.termai.cc/api/upload?key=' + config.APIkey.termai, form, {
            headers: form.getHeaders(),
            timeout: 30000
        })
        
        if (response.data?.status === 'success' && response.data?.files?.[0]?.url) {
            return response.data
        }
        return null
    } catch {
        return null
    }
}

async function handler(m, { sock }) {
    const data = m.text?.trim()
    
    if (!data) {
        return m.reply( `⚠️ *CARA PAKAI*\n\n` +
            `\`${m.prefix}qrcustom <url/text>\`\n\n` +
            `*Contoh:*\n` +
            `\`${m.prefix}qrcustom https://wa.me/628xxx\`\n\n` +
            `💡 Reply gambar untuk custom logo di tengah QR`, "qrcustom")
    }
    
    { const __navText = `🕕 *Generating QR code...*`; await m.reply(__navText); }
    
    try {
        let imageUrl = ''
        
        if (m.isImage) {
            const buffer = await m.download()
            imageUrl = await uploadTo0x0(buffer) || ''
        } else if (m.quoted?.isImage) {
            const buffer = await m.quoted.download()
            imageUrl = await uploadTo0x0(buffer) || ''
        }
        
        const params = new URLSearchParams({
            data: data,
            type: 'png',
            size: '300'
        })
        
        if (imageUrl) {
            params.append('image', imageUrl)
        }
        
        const apiUrl = `${BASE_URL}/api/v1/tools/qrcustom?${params.toString()}`
        
        await sock.sendMessage(m.chat, {
            image: { url: apiUrl },
            caption: `📱 *QR Code*\n${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`
        }, { quoted: m })
        
        m.react('🕐')
        
    } catch (err) {
        return m.reply(claraWrap("logo.png", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }