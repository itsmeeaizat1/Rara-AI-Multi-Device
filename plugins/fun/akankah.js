// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { askFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'akankah',
    alias: ["akankah"],
    category: 'fun',
    description: 'Tanya bot akankah sesuatu terjadi',
    usage: '.akankah <pertanyaan>',
    example: '.akankah aku sukses?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const answers = [
    'Ya, pasti akan terjadi!',
    'Tidak, sepertinya tidak akan.',
    'Mungkin akan, mungkin tidak.',
    'InsyaAllah akan terjadi!',
    'Hmm, sulit diprediksi.',
    'Pasti! Yakin saja!',
    'Kayaknya nggak deh.',
    'Akan terjadi kalau kamu mau berusaha.',
    'Suatu saat nanti, pasti.',
    'Nggak akan, maaf.',
    'Tentu akan! Tunggu saja!',
    'Hmm, aku ragu.',
    'Akan! Percaya sama proses!',
    'Kemungkinannya kecil.',
    'Pasti akan, aku yakin!',
    'Nggak akan, cari yang lain aja.',
    'Akan, tapi butuh waktu.',
    'InsyaAllah!',
    'Kalau jodoh, pasti akan.',
    'Akan terjadi di saat yang tepat!'
];

async function handler(m, { sock, config: botConfig }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply(claraWrap("Akankah", [
        `Masukkan pertanyaan!`,
        ``,
        `📌 Format: ${m.prefix}akankah <pertanyaan>`,
        `💡 Contoh: ${m.prefix}akankah aku sukses?`,
      ]));
    }
    
    const { text: answer, fromAI } = await askFunAI({
        botConfig: botConfig || {},
        question: text,
        persona: "akankah",
        fallbackAnswers: answers,
    });
    
    { const __navText = claraWrap("Akankah", [`${m.body.slice(1)}?`, `*${answer}*`].join("\n")); await m.reply(__navText); }
}

export { pluginConfig as config, handler }