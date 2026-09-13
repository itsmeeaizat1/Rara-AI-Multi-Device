// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bar meter ala pengukuran: ▓▓▓░░░░░░░ XX% */
function meterBar(pct) {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
  return "▓".repeat(filled) + "░".repeat(10 - filled) + " " + pct + "%";
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

    // 🔹 ANIMASI METER (13 Sep, request owner "fitur polos di-variasi biar
    // menarik"): rating gak lagi muncul dadakan — kartu morphing ala
    // pengukuran: 🔍 mencari → 🛠️ menganalisis → meter naik-turun bikin
    // penasaran → ⚡ finalisasi → reveal skor + komentar. 1 pesan
    // edit-in-place, edit gagal → langsung jatuh ke hasil akhir.
    const subject = text.length > 40 ? text.slice(0, 37) + "..." : text;
    const frames = [
      { label: "🔍 mencari data *" + subject + "*...", pct: null },
      { label: "🛠️ menganalisis...", pct: 12 },
      { label: "🛠️ menganalisis...", pct: 34 },
      { label: "🛠️ menganalisis...", pct: 58 },
      { label: "🛠️ menganalisis...", pct: 41 },
      { label: "🛠️ menganalisis...", pct: 76 },
      { label: "🛠️ menganalisis...", pct: 93 },
      { label: "⚡ finalisasi penilaian...", pct: 88 },
    ];
    const finalCard = claraWrap("Rate", [
      `📊 *${rating.score}*`,
      meterBar(rating.meterPct ?? Math.floor(Math.random() * 41) + 55),
      ``,
      rating.comment,
    ].join("\n"));

    let key = null;
    try {
      const sent = await sock.sendMessage(m.chat, { text: frames[0].label });
      key = sent?.key || null;
    } catch {}
    if (key) {
      for (let i = 1; i < frames.length; i++) {
        await sleep(i < 3 ? 900 : 700);
        try {
          await sock.sendMessage(m.chat, { text: frames[i].label + "\n" + meterBar(frames[i].pct), edit: key });
        } catch { key = null; break; }
      }
      await sleep(800);
      try { await sock.sendMessage(m.chat, { text: finalCard, edit: key }); } catch {}
    }
    if (!key) {
      // edit gak available → langsung kartu hasil (jangan bikin user nunggu)
      await m.reply(finalCard);
      return { handled: true };
    }
    return { handled: true };
}

export { pluginConfig as config, handler }