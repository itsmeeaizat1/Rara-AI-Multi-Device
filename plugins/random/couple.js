// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { downloadMediaMessage } from 'nova'
import fs from 'fs'
import { default as axios } from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "couplepp",
    alias: ["couplepp", "ppcouple3", "couplepic"],
    category: 'random',
    description: 'Random gambar pp couple',
    usage: '.ppcouple',
    isGroup: true,
    isBotAdmin: false,
    isAdmin: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock }) {
   try {
        const res = await axios.get(`https://api.deline.web.id/random/ppcouple`)
        const data = res.data.result
        const cowo = data.cowo
        const cewe = data.cewe
        await sock.sendMessage(m.chat, {
            albumMessage: [
                {
                    image: { url: cowo },
                },
                {
                    image: { url: cewe },
                }
            ]
        }, { quoted: m })
   } catch (error) {
    m.reply(claraWrap("ppcouple", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }