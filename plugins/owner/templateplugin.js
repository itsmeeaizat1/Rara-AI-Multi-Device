// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'templateplugin',
    alias: ["templateplugin"],
    category: 'owner',
    description: 'Generate plugin template (Owner Only)',
    usage: '.templateplugin',
    example: '.templateplugin',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}
function handler(m, { sock }) {
    if (!config.isOwner(m.sender)) {
        return m.reply(raraWrap("Templateplugin", '❌ *Owner Only!*'))
    }
    const template = `
const pluginConfig = {
    name: 'example',
    alias: ["example", 'ex'],
    category: 'general',
    description: 'Example plugin',
    usage: '.example',
    example: '.example',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 1,
    isEnabled: true
}
async function handler(m, { sock }) {
    try {
        { const __navText = 'This is an example plugin!'; await m.reply(__navText); }
    } catch (error) {
        console.error('Example Plugin Error:', error)
        await m.reply('❌ *gagal*\\n\\n' + error.message)
    }
}
export { pluginConfig as config, handler }
`
    m.reply(`\`\`\`${template}\`\`\``)
}
export { pluginConfig as config, handler }