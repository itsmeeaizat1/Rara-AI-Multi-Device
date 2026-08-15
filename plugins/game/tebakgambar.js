// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('tebakgambar', {
    alias: ['tg', 'guessimage'],
    emoji: '🖼️',
    title: 'TEBAK GAMBAR',
    description: 'Tebak kata dari gambar',
    timeout: 90000,
    hasImage: true,
    questionField: null,
    hintCount: 3
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakgambar')
export { pluginConfig as config, handler, answerHandler }
