import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('tebaklagu', {
    alias: ['tl', 'guesssong'],
    emoji: '🎵',
    title: 'TEBAK LAGU',
    description: 'Tebak judul lagu'
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaklagu')
export { pluginConfig as config, handler, answerHandler }
