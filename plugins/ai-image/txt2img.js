// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'text2img3',
    alias: ["text2img3", "txt2img"],
    category: 'ai image',
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
        return m.reply(raraWrap("text2img3", [
      "Generate gambar dari teks dengan AI",
      "",
      `💡 Contoh: ${m.prefix}txt2img beautiful sunset | anime`,
      "🎭 styles",
      "",
      `${STYLES.join(', ')}`,
    ]))
    }

    const [prompt, styleInput] = input.split('|').map(s => s.trim())
    const style = STYLES.includes(styleInput) ? styleInput : 'anime'
    try {
    await m.react("🕒");
        const { data } = await f(`https://api.neoxr.eu/api/stablediff?prompt=${encodeURIComponent(prompt)}&model=default&orientation=potrait&apikey=${config.APIkey.neoxr}`)

        await sock.sendMedia(m.chat, data.url, null, m, {
            type: 'image'
        })
    } catch (error) {
        m.reply(raraWrap("text2img3", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }