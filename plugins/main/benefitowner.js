// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAllPlugins } from '../../src/lib/nova-plugins.js'
import config from '../../config.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'benefitowner',
    alias: ['ownerbenefits', 'ownerfitur'],
    category: 'main',
    description: 'Lihat penjelasan dan daftar fitur khusus Owner',
    usage: '.benefitowner',
    isOwner: false,
    isGroup: false,
    isEnabled: true
}

async function handler(m, { sock }) {
    const plugins = getAllPlugins()
    const ownerCommands = plugins.filter(p => p.config.isOwner && p.config.isEnabled)
    
    const seen = new Set()
    const commandList = []
    for (const p of ownerCommands) {
        const names = Array.isArray(p.config.name) ? p.config.name : [p.config.name]
        for (const name of names) {
            if (!name || seen.has(name)) continue
            seen.add(name)
            commandList.push(`*${config.command?.prefix || '.'}${name}*`)
        }
    }
    commandList.sort()
    
    const totalCommands = commandList.length
    
    const message = 
        `👑 *Apa Itu Owner?*\n\n` +
        `Owner adalah *ᴘᴇᴍɪʟɪᴋ ʙᴏᴛ* yang memiliki akses penuh ke semua fitur dan kontrol sistem.\n\n` +
        `╭┈┈⬡「 🔐 *KeiꜱTimewaan Owner* 」\n` +
        `┃ ✦ \`\`\`Akses semua command tanpa batasan\`\`\`\n` +
        `┃ ✦ \`\`\`Limit tidak terbatas (-1)\`\`\`\n` +
        `┃ ✦ \`\`\`Bypass semua cooldown\`\`\`\n` +
        `┃ ✦ \`\`\`Kontrol penuh sistem bot\`\`\`\n` +
        `┃ ✦ \`\`\`Manajemen user & group\`\`\`\n` +
        `┃ ✦ \`\`\`Akses panel & server\`\`\`\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `╭┈┈⬡「 ⚙️ *ᴄᴀʀᴀ ᴋᴇʀᴊᴀ* 」\n` +
        `┃ \`Owner ditambahkan melalui:\`\n` +
        `┃ • \`\`\`${config.command?.prefix || '.'}addowner <nomor>\`\`\`\n` +
        `┃ • Atau langsung di config.js\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ ᴏᴡɴᴇʀ* 」\n` +
        `┃ \`Total: ${totalCommands} command\`\n` +
        `┃\n` +
        commandList.map(cmd => `┃ ${cmd}`).join('\n') +
        `\n╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `Hubungi owner untuk mendapatkan akses!`
    
    await m.reply(claraWrap("benefitowner", message))
}

export { pluginConfig as config, handler }