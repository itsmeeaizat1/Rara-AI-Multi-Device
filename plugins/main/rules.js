// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'rules',
    alias: ["rules", "peraturan", "ketentuan"],
    category: 'main',
    description: 'Peraturan & ketentuan penggunaan bot (plain text)',
    usage: '.rules',
    example: '.rules',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const DEFAULT_BOT_RULES = [
    'Jangan spam command',
    'Gunakan fitur dengan bijak',
    'Dilarang menyalahgunakan bot',
    'Hormati sesama pengguna',
    'Report bug ke owner',
    'Jangan request fitur aneh',
    'Bot bukan 24/7, ada maintenance'
]

async function handler(m, { sock, config: botConfig }) {
    try {
        const db = getDatabase()
        const customRules = db.setting('botRules')

        let rulesList = DEFAULT_BOT_RULES

        if (customRules) {
            if (Array.isArray(customRules)) {
                rulesList = customRules
            } else if (typeof customRules === 'string') {
                rulesList = customRules
                    .split('\n')
                    .map(v => v.replace(/^[^a-zA-Z0-9]+/, '').trim())
                    .filter(Boolean)
            }
        }

        // Request owner 20 Sep 2026: ganti table/sheet jadi plain text
        // "peraturan ketentuan penggunaan bot" — simpel, gampang dibaca di semua device.
        const botName = botConfig.bot?.name || 'Nova-AI'
        const lines = [
            `📜 *Peraturan & Ketentuan Penggunaan ${botName}*`,
            '',
            ...rulesList.map((rule, i) => `${i + 1}. ${rule}`),
            '',
            '⚠️ Pelanggaran dapat mengakibatkan banned / kick!',
        ]
        await m.reply(claraWrap('Peraturan Penggunaan Bot', lines))
    } catch (e) {
        m.reply(novaError("Rules", "Ada error nih saat ambil rules"))
    }
}

export { pluginConfig as config, handler }