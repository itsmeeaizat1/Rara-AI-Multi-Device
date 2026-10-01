// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import { novaWrap, novaLine, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'antilinkgc',
    alias: ["antilinkgc"],
    category: 'group',
    description: 'Anti link WhatsApp (grup, saluran, wa.me)',
    usage: '.antilinkgc <on/off/metode> [kick/remove]',
    example: '.antilinkgc on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}



function handler(m, { sock }) {
    const db = getDatabase()
    const option = m.text?.toLowerCase()?.trim()
    
    if (!option) {
        return m.reply(novaGuide("Anti-Link GC", "Fitur anti link WhatsApp (grup, saluran, wa.me) di grup.", `${m.prefix}antilinkgc on`))
    }
    
    if (option === 'on') {
        db.setGroup(m.chat, { antilinkgc: 'on' })
        return m.reply(novaWrap("Antilinkgc", `Antilink Wa diaktifkan!\n\nLink WA akan dihapus otomatis.`, "success"))
    }
    
    if (option === 'off') {
        db.setGroup(m.chat, { antilinkgc: 'off' })
        return m.reply(novaWrap("Antilinkgc", `Antilink Wa dinonaktifkan!`, "error"))
    }
    
    if (option.startsWith('metode')) {
        const method = m.args?.[1]?.toLowerCase()
        if (method === 'kick') {
            db.setGroup(m.chat, { antilinkgc: 'on', antilinkgcMode: 'kick' })
            return m.reply(novaWrap("Antilinkgc", `Antilink Wa mode KICK diaktifkan!\n\nUser yang kirim link WA akan di-kick.`, "success"))
        } else if (method === 'remove' || method === 'delete') {
            db.setGroup(m.chat, { antilinkgc: 'on', antilinkgcMode: 'remove' })
            return m.reply(novaWrap("Antilinkgc", `Antilink Wa mode DELETE diaktifkan!\n\nPesan dengan link WA akan dihapus.`, "success"))
        } else {
            return m.reply(novaError("Anti-Link GC", `Metode tidak valid! Gunakan: kick atau remove.\nContoh: ${m.prefix}antilinkgc metode kick`))
        }
    }
    
    if (option === 'kick') {
        db.setGroup(m.chat, { antilinkgc: 'on', antilinkgcMode: 'kick' })
        return m.reply(novaWrap("Antilinkgc", `Antilink Wa mode KICK diaktifkan!\n\nUser yang kirim link WA akan di-kick.`, "success"))
    }
    
    if (option === 'remove' || option === 'delete') {
        db.setGroup(m.chat, { antilinkgc: 'on', antilinkgcMode: 'remove' })
        return m.reply(novaWrap("Antilinkgc", `Antilink Wa mode DELETE diaktifkan!\n\nPesan dengan link WA akan dihapus.`, "success"))
    }
    
    return m.reply(novaWrap("Anti linkgc", `Opsi tidak valid! Gunakan: \`on\`, \`off\`, \`metode kick\`, \`metode remove\``, "error"))
}

export { pluginConfig as config, handler }