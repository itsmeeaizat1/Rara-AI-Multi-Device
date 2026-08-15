// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('tebakgambarv2', {
    alias: ['tg2', 'guesspic', 'tebakpic'],
    emoji: '📸',
    title: 'TEBAK GAMBAR',
    category: 'rpg',
    description: 'Tebak gambar dari foto (hewan, benda, tempat, makanan)',
    dataFile: 'tebakgambarv2.json',
    answerField: 'name',
    hasImage: true,
    usePreview: true,
    timeout: 60000,
    hintCount: 3
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakgambarv2', { category: 'rpg' })
export { pluginConfig as config, handler, answerHandler }
