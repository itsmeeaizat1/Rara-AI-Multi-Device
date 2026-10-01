// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'npmstalk',
    alias: ["npmstalk"],
    category: 'stalker',
    description: 'Stalk akun NPM (Node Package Manager)',
    usage: '.npmstalk <username>',
    example: '.npmstalk aizat',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function shortNum(num) {
    if (!num) return '0'
    num = parseInt(num)
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
    return num.toString()
}

async function handler(m, { sock }) {
    const username = m.args[0]
    
    if (!username) {
        { const __navText = `📦 *npm stalk*\n\nMasukkan username NPM\n\n\`Contoh: ${m.prefix}npmstalk aizat\``; return await m.reply( __navText, "npmstalk"); }
    }
    try {
        const res = await axios.get(`https://firefly.maiku.my.id/api/stalk-npm?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`, {
            timeout: 30000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(raraWrap("npmstalk", `❌ Username *${username}* tidak ditemukan`))
        }
        
        const d = res.data.data
        const s = d.stats || {}
        
        let caption = `📦 *npm stalk*\n\n` +
            `👤 *username:* ${d.username}\n` +
            `📛 *nama:* ${d.name || '-'}\n` +
            `📧 *email:* ${d.email || '-'}\n\n` +
            `📦 *total packages:* ${s.total_packages || 0}\n` +
            `📉 *monthly downloads:* ${shortNum(s.total_monthly_downloads)}\n\n` +
            `🔗 ${d.profile}\n\n`
            
        if (d.packages && d.packages.length > 0) {
            caption += `*daftar package:*\n`
            d.packages.slice(0, 5).forEach((pkg, i) => {
                caption += `📦 *${pkg.name}* (v${pkg.version})\n`
                caption += `📉 ${shortNum(pkg.downloads_monthly)} dl/month\n`
                caption += `📝 ${pkg.description}\n\n`
            })
        }
        await sock.sendMessage(m.chat, {
            image: { url: d.avatar },
            caption
        }, { quoted: m })
        
    } catch (error) {
        m.reply(raraWrap("npmstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
