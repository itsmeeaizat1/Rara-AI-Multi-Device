// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { askFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'dimana',
    alias: ["dimana"],
    category: 'fun',
    description: 'Tanya bot dimana sesuatu',
    usage: '.dimana <pertanyaan>',
    example: '.dimana jodohku berada?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    'Di dekatmu!',
    'Jauh di sana.',
    'Di tempat yang tidak kamu duga.',
    'Di hatimu.',
    'Di sekitar sini.',
    'Hmm, coba cari di kamar.',
    'Di luar sana, menunggumu.',
    'Di tempat yang sama denganmu.',
    'Di suatu tempat yang indah.',
    'Di balik pintu.',
    'Di sebelah kirimu.',
    'Di depan matamu!',
    'Jauh banget, di luar negeri mungkin?',
    'Di tempat yang penuh kenangan.',
    'Di mana-mana!',
    'Di dunia maya.',
    'Di alam mimpi.',
    'Di tempat rahasia.',
    'Hmm, susah dijelaskan lokasinya.',
    'Di tempat yang akan membuatmu bahagia.'
];

async function handler(m, { sock, config: botConfig }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(raraWrap("Dimana", [
        `Masukkan pertanyaan!`,
        ``,
        `📌 Format: ${m.prefix}dimana <pertanyaan>`,
        `💡 Contoh: ${m.prefix}dimana jodohku berada?`,
      ]));
    }
    
    const { text: answer, fromAI } = await askFunAI({
        botConfig: botConfig || {},
        question: text,
        persona: "dimana",
        fallbackAnswers: answers,
    });
    
    { const __navText = raraWrap("Dimana", [`${m.body.slice(1)}?`, `*${answer}*`].join("\n")); await m.reply(__navText); }
}

export { pluginConfig as config, handler }