// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'readmore',
    alias: ["readmore"],
    category: 'tools',
    description: 'Membuat teks baca selengkapnya (spoiler)',
    usage: '.readmore <text_awal>|<text_akhir>',
    example: '.readmore Hai|Ini adalah pesan rahasia',
    isGroup: false,
    isBotAdmin: false,
    isAdmin: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

function handler(m, { sock }) {
    const text = m.text;
    
    if (!text) {
        return m.reply( claraWrap("readmore", `⚠️ Masukan text!\nContoh: \`${m.prefix}${m.command} Halo|Ini teks tersembunyi\``), "readmore");
    }
    
    let [l, r] = text.split('|');
    if (!l) l = '';
    if (!r) r = '';
    
    const readmore = String.fromCharCode(8206).repeat(4001);
    
    m.reply(claraWrap("readmore", l + readmore + r));
}

export { pluginConfig as config, handler }