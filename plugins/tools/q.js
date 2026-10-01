import util from 'util'
import te from '../../src/lib/nova-error.js'
import { novaWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "q",
    alias: ["q"],
    category: 'tools',
    description: 'Ambil JSON message dari pesan yang direply',
    usage: '.q (reply pesan)',
    isOwner: true,
    cooldown: 3,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        { const __navText = '❌ *Reply pesan yang ingin di-inspect*'; return await m.reply(__navText); }
    }

    try {
        const quoted = m.quoted || {}

        await m.reply(JSON.stringify(quoted, null, 2))
    } catch (err) {
        await m.reply(novaWrap("q", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }