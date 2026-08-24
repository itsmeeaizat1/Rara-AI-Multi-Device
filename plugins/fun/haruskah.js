// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'haruskah',
    alias: ['harus', 'should'],
    category: 'fun',
    description: 'Tanya bot haruskah sesuatu',
    usage: '.haruskah <pertanyaan>',
    example: '.haruskah aku menyatakan cinta?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    'Ya, harus!',
    'Tidak usah.',
    'Hmm, terserah kamu sih.',
    'Harus banget! Jangan ragu!',
    'Nggak harus juga.',
    'Kalau menurutmu perlu, lakukan!',
    'Pikir dulu baik-baik.',
    'Harus! Sekarang!',
    'Jangan, mending tunggu dulu.',
    'Harus, tapi hati-hati.',
    'Nggak harus, tapi boleh.',
    'Wajib!',
    'Hmm, skip aja deh.',
    'Lakukan kalau sudah yakin.',
    'Harus, demi masa depanmu!',
    'Nggak harus, santai aja.',
    'Go for it!',
    'Jangan buru-buru, pikir lagi.',
    'Tentu harus!',
    'Lihat situasinya dulu.'
];

async function handler(m, { sock }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(claraWrap("Haruskah", `⚖️ *Haruskah*\n\nMasukkan pertanyaan!\n\n*Contoh:*\n.haruskah aku menyatakan cinta?`));
    }
    
    const answer = answers[Math.floor(Math.random() * answers.length)];
    
    { const __navText = claraWrap("Haruskah", [`${m.body.slice(1)}?`, `*${answer}*`].join("\n")); await m.reply(__navText); }
}

export { pluginConfig as config, handler }