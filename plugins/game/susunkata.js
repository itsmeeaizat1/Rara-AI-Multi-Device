// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('susunkata', {
    alias: ['susun', 'scramble'],
    emoji: '🔠',
    title: 'SUSUN KATA',
    description: 'Susun kata dari huruf'
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('susunkata')
export { pluginConfig as config, handler, answerHandler }
