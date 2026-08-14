import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { nightActionHandler } from './werewolf.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'wwprotect',
    alias: ['protect', 'guardian', 'wpr'],
    category: 'game',
    description: 'Guardian night action - Protect target',
    usage: '.wwprotect <nomor>',
    example: '.wwprotect 3',
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
        console.error('[WWPROTECT ERROR]', error)
        m.reply(claraWrap("wwprotect", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }