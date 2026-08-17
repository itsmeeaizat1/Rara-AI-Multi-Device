// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'

const pluginConfig = {
    name: 'tqto',
    alias: ['thanksto', 'credits', 'kredit'],
    category: 'main',
    description: 'Menampilkan daftar kontributor bot',
    usage: '.tqto',
    example: '.tqto',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const credits = [
        { name: 'Aizat', role: 'Pembuat Bot', icon: '👑' },
        { name: 'Claude Sonnet 5', role: 'Coding Assistant', icon: '〽' },
        { name: 'OpenAI Luna', role: 'AI Coding', icon: '〽' },
        { name: 'GLM (Terbaru)', role: 'AI Coding', icon: '〽' },
    ]

    const navText = `🍟 *Terima kasih kepada yang sudah berkontribusi di ${config.bot.name}*

${credits.map((c, i) => `*${i + 1}*. *${c.name}* [ ${c.icon} ${c.role} ]`).join('\n')}`

    await m.reply(claraWrap("tqto", navText))
}

export { pluginConfig as config, handler }
