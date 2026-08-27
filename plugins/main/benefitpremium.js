// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAllPlugins } from '../../src/lib/nova-plugins.js'
import config from '../../config.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'benefitpremium',
    alias: ["benefitpremium"],
    category: 'main',
    description: 'Lihat penjelasan dan daftar fitur khusus Premium',
    usage: '.benefitpremium',
    isOwner: false,
    isGroup: false,
    isEnabled: true
}

async function handler(m, { sock }) {
    const plugins = getAllPlugins()
    const premiumCommands = plugins.filter(p => p.config.isPremium && p.config.isEnabled)
    
    const seen = new Set()
    const commandList = []
    for (const p of premiumCommands) {
        const names = Array.isArray(p.config.name) ? p.config.name : [p.config.name]
        for (const name of names) {
            if (!name || seen.has(name)) continue
            seen.add(name)
            commandList.push(`*${config.command?.prefix || '.'}${name}*`)
        }
    }
    commandList.sort()
    
    const totalCommands = commandList.length
    const defaultLimit = config.limits?.default || 25
    const premiumLimit = config.limits?.premium || 100
    
    const message = 
        `⭐ *Apa Itu Premium?*\n\n` +
        `Premium adalah *ᴜꜱᴇʀ ʙᴇʀʙᴀʏᴀʀ* yang mendapatkan akses ke fitur eksklusif dan keuntungan lebih.\n\n` +
        `╭──「 💎 *ᴋᴇᴜɴᴛᴜɴɢᴀɴ ᴘʀᴇᴍɪᴜᴍ* 」\n` +
        `│ ✦ \`\`\`Limit harian: ${premiumLimit}x (vs ${defaultLimit}x user biasa)\`\`\`\n` +
        `│ ✦ \`\`\`Cooldown lebih rendah\`\`\`\n` +
        `│ ✦ \`\`\`Akses fitur eksklusif\`\`\`\n` +
        `│ ✦ \`\`\`Prioritas response\`\`\`\n` +
        `│ ✦ \`\`\`No watermark di beberapa fitur\`\`\`\n` +
        `│ ✦ \`\`\`Support prioritas\`\`\`\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `╭──「 ⚙️ *ᴄᴀʀᴀ ᴍᴇɴᴅᴀᴘᴀᴛᴋᴀɴ* 」\n` +
        `│ \`Premium didapatkan melalui:\`\n` +
        `│ • Hubungi owner bot\n` +
        `│ • \`\`\`${config.command?.prefix || '.'}addprem <nomor> <durasi>\`\`\`\n` +
        `│ • Contoh: .addprem 628xxx 30d\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `╭──「 📋 *ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ ᴘʀᴇᴍɪᴜᴍ* 」\n` +
        `│ \`Total: ${totalCommands} command\`\n` +
        `┃\n` +
        (totalCommands > 0 
            ? commandList.map(cmd => `│ ${cmd}`).join('\n')
            : `│ Semua command bisa diakses user biasa`) +
        `\n╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `Mau Upgrade? silahkan hubungi owner bot\n${config.owner.number.map(num => `- wa.me/${num}`).join('\n') }`
    
    await m.reply(claraWrap("benefitpremium", message))
}

export { pluginConfig as config, handler }