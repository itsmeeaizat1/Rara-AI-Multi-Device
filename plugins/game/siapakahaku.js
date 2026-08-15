// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('siapakahaku', {
    alias: ['siapa', 'whoami'],
    emoji: '🎭',
    title: 'SIAPAKAH AKU',
    description: 'Tebak dari deskripsi'
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('siapakahaku')
export { pluginConfig as config, handler, answerHandler }
