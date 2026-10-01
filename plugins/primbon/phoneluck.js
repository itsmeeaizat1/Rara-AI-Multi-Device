// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'nomerhoki',
    alias: ["nomerhoki"],
    category: 'primbon',
    description: 'Cek keberuntungan nomor HP',
    usage: '.nomerhoki <nomor>',
    example: '.nomerhoki 6281234567890',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let nomor = m.args.join('').replace(/[^0-9]/g, '')
    if (!nomor) {
        { const __navText = `🍀 *nomor hoki*\n\nMasukkan nomor HP\n\n\`Contoh: ${m.prefix}nomerhoki 6281234567890\``; return await m.reply( __navText, "nomerhoki"); }
    }
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/nomorhoki?phoneNumber=${nomor}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(raraError("NomerHoki", "Gagal analisa nomor nih"))
        }
        
        const r = data.data
        const ep = r.energi_positif.details
        const en = r.energi_negatif.details
        
        const response = `🍀 *nomor hoki*\n\n` +
            `Nomor: *${r.nomor}*\n\n` +
            `📊 *angka bagua:* ${r.angka_bagua_shuzi.value}%\n\n` +
            `✅ *Energi PosItif:* ${r.energi_positif.total}%\n` +
            `├ Kekayaan: ${ep.kekayaan}\n` +
            `├ Kesehatan: ${ep.kesehatan}\n` +
            `├ Cinta: ${ep.cinta}\n` +
            `└ Kestabilan: ${ep.kestabilan}\n\n` +
            `❌ *energi negatif:* ${r.energi_negatif.total}%\n` +
            `├ Perselisihan: ${en.perselisihan}\n` +
            `├ Kehilangan: ${en.kehilangan}\n` +
            `├ Malapetaka: ${en.malapetaka}\n` +
            `└ Kehancuran: ${en.kehancuran}\n\n` +
            `Status: ${r.analisis.status ? '✅ HOKI' : '❌ TIDAK HOKI'}`
        await m.reply(response)
        
    } catch (error) {
        m.reply(raraWrap("nomerhoki", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }