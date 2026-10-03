// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";
const pluginConfig = {
    name: "balogo",
    alias: ["balogo"],
    category: "maker",
    description: 'Membuat logo Blue Archive style',
    usage: '.balogo <textL> & <textR>',
    example: '.balogo Blue & Archive',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const input = m.text?.trim() || ''
    const parts = input.split(/[&,]/).map(s => s.trim()).filter(s => s)
    
    if (parts.length < 2) {
        { const __navText = `🎮 *blue archive logo*\n\nMasukkan 2 teks untuk logo\n\n💡 *Contoh:* ${m.prefix}balogo Blue & Archive`; return await m.reply(__navText); }
    }
    
    const textL = parts[0]
    const textR = parts[1]
    try {
        await m.react("🕒")
        const apiUrl = `https://api.nexray.web.id/maker/balogo?text=${encodeURIComponent(textL)} ${encodeURIComponent(textR)}`
        // FIX 14 Sep 2026 (audit canvas): helper bersama f() (rara-http.js, undici
        // request()) TIDAK follow HTTP redirect — endpoint ini 301 redirect ke
        // domain gambar asli, jadinya f() balikin ArrayBuffer 0 byte (gambar blank
        // gagal kirim, tapi try/catch gak nangkep karena gak throw). axios follow
        // redirect default (maxRedirects: 5) → dipakai sebagai gantinya di sini.
        const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 })
        const response = Buffer.from(res.data)
        if (!response || response.length === 0) {
            throw new Error('Response gambar kosong')
        }

        await m.react("🐣")
        await sock.sendMedia(m.chat, response, null, m, {
            type: 'image',
        })
        await m.reply(mediaInfoCaption({ header: "Blue Archive Logo", fields: [
            { label: "Teks kiri", value: textL }, { label: "Teks kanan", value: textR },
            { label: "Hasil", value: "Gambar" }, { label: "Ukuran", value: (response.length / 1024).toFixed(1) + " KB" },
        ] }));
    } catch (error) {
        await m.react("❌")
        m.reply(raraWrap("balogo", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }