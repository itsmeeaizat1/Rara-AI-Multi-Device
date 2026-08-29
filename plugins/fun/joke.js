// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { bracketBox, novaError } from "../../src/lib/nova-menu-style.js";

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
        const jokeLines = data.type === 'twopart'
            ? [data.setup, data.delivery]
            : [data.joke];
        jokeLines.push("", "💡 Semoga bikin ngakak!");
        
        const text = bracketBox('😂', 'Random Joke', jokeLines);
        await m.reply(text)
        await m.react("😂")
    } catch (e) {
        await m.reply(novaError('Joke', 'Gagal mengambil joke, API mungkin sedang down'))
    }
}

export { pluginConfig as config, handler }
