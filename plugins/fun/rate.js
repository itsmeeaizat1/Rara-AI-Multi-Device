// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

/** Bar meter standar: ▰▰▰▱▱▱▱▱▱▱ XX% */
function meterBar(pct) {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
  return "▰".repeat(filled) + "▱".repeat(10 - filled) + " " + pct + "%";
}
const pluginConfig = {
    name: "rate",
    alias: ["rate"],
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
        return m.reply( claraWrap("Rate", [
        `Masukkan sesuatu untuk dinilai!`,
        ``,
        `📌 Format: ${m.prefix}rate <pertanyaan>`,
        `💡 Contoh: ${m.prefix}rate wajahku`,
      ]), { commandName: "rate" });
    }
    
    const rating = ratings[Math.floor(Math.random() * ratings.length)];

    // 🔹 14 Sep (owner): animasi morphing ▓░ dihapus — loading react emoji
    // udah cukup, hasil langsung keluar. Meter final pakai standar ▰▱.
    const finalCard = claraWrap("Rate", [
      `📊 *${rating.score}*`,
      meterBar(rating.meterPct ?? Math.floor(Math.random() * 41) + 55),
      ``,
      rating.comment,
    ].join("\n"));

    await m.reply(finalCard);
    return { handled: true };
}

export { pluginConfig as config, handler }