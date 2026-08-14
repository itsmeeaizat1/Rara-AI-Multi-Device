import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('tebaklogo', {
    alias: ['tlogo', 'guesslogo', 'gl'],
    emoji: '🏷️',
    title: 'TEBAK LOGO',
    category: 'rpg',
    description: 'Tebak brand dari logonya',
    dataFile: 'tebaklogo.json',
    answerField: 'name',
    hasImage: true,
    usePreview: true,
    timeout: 60000,
    hintCount: 3
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaklogo', { category: 'rpg' })
export { pluginConfig as config, handler, answerHandler }
