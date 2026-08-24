// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'text2img3',
    alias: [],
    category: 'ai',
    description: 'Generate gambar dari teks dengan AI',
    usage: '.txt2img <prompt> | <style>',
    example: '.txt2img beautiful sunset | anime',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 1,
    isEnabled: true
}

const STYLES = ['photorealistic', 'digital-art', 'impressionist', 'anime', 'fantasy', 'sci-fi', 'vintage']

async function handler(m, { sock }) {
    const input = m.args.join(' ')
    if (!input) {
        return m.reply( `🎨 *ᴛᴇxᴛ ᴛᴏ ɪᴍᴀɢᴇ*\n\n` +
            `Generate gambar dari teks dengan AI\n\n` +
            `\`Contoh: ${m.prefix}txt2img beautiful sunset | anime\`\n\n` +
            `🎭 *ꜱᴛʏʟᴇꜱ*\n` +
            `\`${STYLES.join(', ')}\``, "text2img3")
    }

    const [prompt, styleInput] = input.split('|').map(s => s.trim())
    const style = STYLES.includes(styleInput) ? styleInput : 'anime'

    m.react('🕐')

    try {
        const { data } = await f(`https://api.neoxr.eu/api/stablediff?prompt=${encodeURIComponent(prompt)}&model=default&orientation=potrait&apikey=${config.APIkey.neoxr}`)

        await sock.sendMedia(m.chat, data.url, null, m, {
            type: 'image'
        })
        m.react('✅')

    } catch (error) {
        m.reply(claraWrap("text2img3", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }