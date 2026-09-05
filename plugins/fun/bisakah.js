// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { askFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'bisakah',
    alias: ["bisakah"],
    category: 'fun',
    description: 'Tanya bot bisakah sesuatu',
    usage: '.bisakah <pertanyaan>',
    example: '.bisakah aku lulus ujian?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    'Bisa banget! Percaya diri aja!',
    'Hmm, kayaknya susah deh.',
    'Tentu bisa! Semangat!',
    'Nggak bisa, maaf.',
    'Mungkin bisa, kalau usaha keras.',
    'Pasti bisa! Jangan menyerah!',
    'Agak susah sih, tapi bisa dicoba.',
    'Bisa kok! Yakin deh!',
    'Kayaknya nggak deh.',
    'Bisa! Ayo buktikan!',
    'Hmm... aku ragu.',
    'Bisa banget! Gas terus!',
    'Nggak bisa, coba yang lain.',
    'Bisa! Percaya sama diri sendiri!',
    'Susah, tapi bukan berarti nggak mungkin.',
    'Absolutely! Kamu pasti bisa!',
    'Kayaknya perlu usaha ekstra nih.',
    'Bisa! Jangan ragukan dirimu!',
    'Hmm, coba lagi nanti deh.',
    'Bisa! Aku percaya kamu!'
];

async function handler(m, { sock, config: botConfig }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(claraWrap("Bisakah", [
        `Masukkan pertanyaan!`,
        ``,
        `📌 Format: ${m.prefix}bisakah <pertanyaan>`,
        `💡 Contoh: ${m.prefix}bisakah aku lulus ujian?`,
      ]));
    }
    
    const { text: answer, fromAI } = await askFunAI({
        botConfig: botConfig || {},
        question: text,
        persona: "bisakah",
        fallbackAnswers: answers,
    });
    
    { const __navText = `${m.body.slice(1)}?
*${answer}*`; await m.reply(__navText); };
}

export { pluginConfig as config, handler }