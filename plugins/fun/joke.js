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
        let text = '╭──「 😂 Random Joke 」\n'
        if (data.type === 'twopart') {
            text += '├── ' + data.setup + '\n'
            text += '├── ' + data.delivery + '\n'
        } else {
            text += '├── ' + data.joke + '\n'
        }
        text += '├──\n'
        text += '├── 💡 Semoga bikin ngakak!\n'
        text += '╰──────────❀'
        await m.reply(text)
        await m.react("😂")
    } catch (e) {
        await m.reply('╭──「 😂 Joke 」\n├── ❌ Gagal mengambil joke\n├── API mungkin sedang down\n╰──────────❀')
        await m.react("❌")
    }
}

export { pluginConfig as config, handler }
