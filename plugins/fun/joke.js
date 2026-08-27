// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'

const pluginConfig = {
    name: "joke",
    alias: ["joke"],
    category: 'fun',
    description: 'Random joke dalam Bahasa Inggris',
    usage: '.joke',
    example: '.joke',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any?safe-mode')
        // Format response pakai Modern Box style:
        // ╭──「 Random Joke 」
        // ├── <setup or joke>
        // ├── <delivery if twopart>
        // ╰──────────❀
        let text = ''
        if (data.type === 'twopart') {
            text = '╭──「 Random Joke 」\n├── ' + data.setup + '\n├── ' + data.delivery + '\n╰──────────❀'
        } else {
            text = '╭──「 Random Joke 」\n├── ' + data.joke + '\n╰──────────❀'
        }
        await m.reply(text)
    } catch (e) {
        await m.reply('╭──「 Error 」\n├── Gagal mengambil joke\n╰──────────❀')
    }
}

export { pluginConfig as config, handler }
