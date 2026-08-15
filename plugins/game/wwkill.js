import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { nightActionHandler } from './werewolf.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'wwkill',
    alias: ['wolfkill', 'wk'],
    category: 'game',
    description: 'Werewolf night action - Kill target',
    usage: '.wwkill <nomor>',
    example: '.wwkill 2',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: true,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        return await nightActionHandler(m, { sock })
    } catch (error) {
        console.error('[WWKILL ERROR]', error)
        m.reply(claraWrap("wwkill", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }