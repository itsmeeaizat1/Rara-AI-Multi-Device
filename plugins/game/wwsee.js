// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { nightActionHandler } from './werewolf.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "wwsee",
    alias: ["wwsee", "vision2", "wwvision"],
    category: 'game',
    description: 'Seer night action - See target role',
    usage: '.wwsee <nomor>',
    example: '.wwsee 1',
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
        console.error('[WWSEE ERROR]', error)
        m.reply(claraWrap("wwsee", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }