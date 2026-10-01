// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { askFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'berapa',
    alias: ["berapa"],
    category: 'fun',
    description: 'Tanya bot berapa sesuatu',
    usage: '.berapa <pertanyaan>',
    example: '.berapa umur jodohku?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    '1',
    '7',
    '12',
    '21',
    '99',
    '69',
    '100',
    '50',
    '25',
    '1000',
    '5',
    '17',
    '88',
    '33',
    'nothing (jawabannya selalu nothing)',
    'Banyak banget!',
    'Cuma sedikit.',
    'Tak terhitung!',
    'Hmm, sekitar 10-an.',
    'Lebih dari yang kamu kira!',
    'Gak tau ah, males'
];

async function handler(m, { sock, config: botConfig }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(raraWrap("Berapa", [
        `Masukkan pertanyaan!`,
        ``,
        `📌 Format: ${m.prefix}berapa <pertanyaan>`,
        `💡 Contoh: ${m.prefix}berapa umur jodohku?`,
      ]));
    }
    
    const { text: answer, fromAI } = await askFunAI({
        botConfig: botConfig || {},
        question: text,
        persona: "berapa",
        fallbackAnswers: answers,
    });
    
    { const __navText = raraWrap("Berapa", [`${m.body.slice(1)}?`, `*${answer}*`].join("\n")); await m.reply(__navText); }
}

export { pluginConfig as config, handler }