// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'githubstalk',
    alias: ["githubstalk"],
    category: 'stalker',
    description: 'Stalk akun GitHub',
    usage: '.githubstalk <username>',
    example: '.githubstalk torvalds',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const username = m.args[0]
    
    if (!username) {
        { const __navText = `🐙 *github stalk*\n\nMasukkan username GitHub\n\n\`Contoh: ${m.prefix}githubstalk torvalds\``; return await m.reply( __navText, "githubstalk"); }
    }
    try {
        const res = await axios.get(`https://firefly.maiku.my.id/api/stalk-github?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`, {
            timeout: 30000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(novaWrap("githubstalk", `❌ Username *${username}* tidak ditemukan`))
        }
        
        const d = res.data.data
        
        const caption = `🐙 *github stalk*\n\n` +
            `👤 *username:* ${d.username}\n` +
            `📛 *nama:* ${d.name || '-'}\n` +
            `🏢 *company:* ${d.company || '-'}\n` +
            `📍 *location:* ${d.location || '-'}\n\n` +
            `📦 *public repos:* ${d.public_repos}\n` +
            `👥 *followers:* ${d.followers}\n` +
            `👤 *following:* ${d.following}\n\n` +
            `📝 *bio:*\n${d.bio || '-'}\n\n` +
            `🔗 ${d.url}`
        await sock.sendMessage(m.chat, {
            image: { url: d.avatar },
            caption
        }, { quoted: m })
        
    } catch (error) {
        m.reply(novaWrap("githubstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }