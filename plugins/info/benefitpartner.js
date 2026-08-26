// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import config from '../../config.js'
const pluginConfig = {
    name: 'benefitpartner',
    alias: ["benefitpartner", 'partnerbenefits', 'keuntunganpartner'],
    category: 'info',
    description: 'Lihat keuntungan menjadi partner bot',
    usage: '.benefitpartner',
    example: '.benefitpartner',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {

    const prefix = m.prefix || '.'

    let txt = `🤝 *ʙᴇɴᴇꜰɪᴛ ᴘᴀʀᴛɴᴇʀ*\n\n`
    txt += `Keuntungan menjadi partner ${config.bot?.name || 'Bot'}:\n\n`

    txt += `🔓 *ᴀᴋꜱᴇꜱ ꜰɪᴛᴜʀ*\n`
    txt += `├ Semua fitur premium terbuka\n`
    txt += `├ Energi & koin unlimited\n`
    txt += `├ Akses command owner tertentu\n`
    txt += `└ Prioritas support\n\n`

    txt += `📦 *ᴘᴀɴᴇʟ ᴘᴛᴇʀᴏᴅᴀᴄᴛʏʟ*\n`
    txt += `├ Bisa create server sendiri\n`
    txt += `├ Akses panel management\n`
    txt += `└ Bisa jualan panel (reseller)\n\n`

    txt += `💎 *ʙᴏɴᴜꜱ*\n`
    txt += `├ +200.000 EXP saat aktivasi\n`
    txt += `├ +20.000 Koin saat aktivasi\n`
    txt += `├ Badge partner di profil\n`
    txt += `└ Akses early feature\n\n`

    txt += `💰 *ᴄᴀʀᴀ ᴊᴀᴅɪ ᴘᴀʀᴛɴᴇʀ*\n`
    txt += `├ Hubungi owner: ${config.owner?.name || 'Owner'}\n`
    txt += `├ Durasi: 30/60/90 hari\n`
    txt += `└ Command: \`${prefix}addpartner\` (owner only)\n\n`

    txt += `📋 *ᴄᴏᴍᴍᴀɴᴅ ᴘᴀʀᴛɴᴇʀ*\n`
    txt += `├ \`${prefix}cekpartner\` — Cek status partner\n`
    txt += `├ \`${prefix}cekprem\` — Cek status premium\n`
    txt += `├ \`${prefix}cekowner\` — Cek role user\n`
    txt += `└ \`${prefix}listpartner\` — Daftar partner\n\n`

    txt += `_Hubungi owner untuk info lebih lanjut_`

    await m.reply(claraWrap("benefitpartner", txt))
}

export { pluginConfig as config, handler }