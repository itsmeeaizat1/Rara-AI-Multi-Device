import { games } from '../../src/lib/nova-games.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";

games.register('tebaklirik', {
    alias: [],
    emoji: '🎤',
    title: 'TEBAK LIRIK',
    description: 'Tebak lirik lagu'
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaklirik')
export { pluginConfig as config, handler, answerHandler }
