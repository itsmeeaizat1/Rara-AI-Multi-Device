// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "rate",
    alias: ["rate", "nilai2", "rating"],
    category: 'fun',
    description: 'Minta bot memberi rating sesuatu',
    usage: '.rate <sesuatu>',
    example: '.rate wajahku',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

const ratings = [
    { score: '10/10', comment: 'Sempurna! Nggak ada duanya!' },
    { score: '9/10', comment: 'Hampir sempurna! Keren banget!' },
    { score: '8/10', comment: 'Bagus banget! Mantap!' },
    { score: '7/10', comment: 'Cukup bagus, di atas rata-rata!' },
    { score: '6/10', comment: 'Lumayan, bisa lebih baik lagi.' },
    { score: '5/10', comment: 'Biasa aja sih, standar.' },
    { score: '4/10', comment: 'Hmm, kurang sedikit.' },
    { score: '3/10', comment: 'Perlu banyak perbaikan.' },
    { score: '2/10', comment: 'Aduh, masih jauh dari bagus.' },
    { score: '1/10', comment: 'Maaf, tapi ini parah.' },
    { score: '100/10', comment: 'LEGEND! Beyond perfect!' },
    { score: '11/10', comment: 'Melebihi ekspektasi!' },
    { score: '69/100', comment: 'Nice...' },
    { score: '420/10', comment: 'BLAZING!' },
    { score: '∞/10', comment: 'Gacor kang' },
    { score: '7.5/10', comment: 'Solid! Good job!' },
    { score: '8.5/10', comment: 'Impressive!' },
    { score: '9.5/10', comment: 'Near perfection!' },
    { score: '-1/10', comment: 'Aku nggak tau harus ngomong apa...' },
    { score: '???/10', comment: 'Error 404: Rating not found.' }
];

async function handler(m, { sock }) {
    const text = m.text?.trim();
    
    if (!text) {
        return m.reply( claraWrap("Rate", `⭐ *Rate*\n\nMasukkan sesuatu untuk dinilai!\n\n*Contoh:*\n.rate wajahku`), { commandName: "rate" });
    }
    
    const rating = ratings[Math.floor(Math.random() * ratings.length)];
    
    { const __navText = claraWrap("Rate", [`Rating dari aku: *${rating.score}*`, rating.comment].join("\n")); await m.reply(__navText); };
}

export { pluginConfig as config, handler }