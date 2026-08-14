import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

const pluginConfig = {
    name: 'senja',
    alias: ['katacinta', 'romanticquotes'],
    category: 'fun',
    description: 'Random kata-kata senja/romantis',
    usage: '.senja',
    example: '.senja',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    m.react('🕐')
    try {
        const res = await f(`https://api.neoxr.eu/api/senja?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.text) {
            return m.reply(claraWrap("senja", `❌ Gagal mengambil kata senja`))
        }
        await m.reply(res.data.text)
        m.react('✅')
    } catch (err) {
        return m.reply(claraWrap("senja", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }