// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { askFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'bagaimana',
    alias: ["bagaimana"],
    category: 'fun',
    description: 'Tanya bot bagaimana sesuatu',
    usage: '.bagaimana <pertanyaan>',
    example: '.bagaimana cara jadi sukses?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    'Caranya gampang, ya tinggal dilakuin aja!',
    'Hmm, susah dijelasin sih. Coba aja dulu!',
    'Dengan usaha dan doa pastinya.',
    'Ya begitulah caranya.',
    'Aku kurang tau sih, coba cari referensi lain.',
    'Pelan-pelan aja, nanti juga bisa.',
    'Dengan kerja keras dan pantang menyerah!',
    'Pertama, percaya sama diri sendiri dulu.',
    'Hmm, tiap orang beda-beda sih caranya.',
    'Ikutin kata hatimu aja.',
    'Belajar dari yang sudah berpengalaman.',
    'Step by step, jangan terburu-buru.',
    'Dengan tekad yang kuat!',
    'Mulai dari yang kecil dulu.',
    'Konsisten aja, nanti juga bisa.',
    'Jangan overthinking, langsung action!',
    'Gampang! Tinggal mulai aja!',
    'Caranya? Ya dicoba dulu!',
    'Dengan strategi yang tepat.',
    'Hmm, aku juga masih belajar sih.'
];

async function handler(m, { sock, config: botConfig }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(claraWrap("Bagaimana", [
        `Masukkan pertanyaan!`,
        ``,
        `📌 Format: ${m.prefix}bagaimana <pertanyaan>`,
        `💡 Contoh: ${m.prefix}bagaimana cara jadi sukses?`,
      ]));
    }
    
    const { text: answer, fromAI } = await askFunAI({
        botConfig: botConfig || {},
        question: text,
        persona: "bagaimana",
        fallbackAnswers: answers,
    });
    
    { const __navText = claraWrap("Bagaimana", [`${m.body.slice(1)}?`, `*${answer}*`].join("\n")); await m.reply(__navText); }
}

export { pluginConfig as config, handler }