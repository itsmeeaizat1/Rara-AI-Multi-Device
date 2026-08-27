// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "detektifbohong",
  alias: ["detektifbohong"],
  category: "fun",
  description: "Simulator lie detector dengan analisis dramatis",
  usage: ".detektifbohong <pernyataan>",
  example: ".detektifbohong aku gak pernah nonton drama",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

const VERDICTS = [
  { min: 0, max: 15, label: "BOHONG TOTAL", emoji: "🔴", desc: "Detektor mendeteksi 47 kali kedipan mata mencurigakan, keringat dingin, dan nada suara bergetar. Ini 100% bohong." },
  { min: 15, max: 30, label: "BOHONG BESAR", emoji: "🔴", desc: "Nadi berdetak 120bpm, tekanan darah naik, dan jempol gemetar. Hampir pasti bohong." },
  { min: 30, max: 45, label: "RAGU-RAGU", emoji: "🟡", desc: "Ada tanda-tanda kebohongan tapi tidak konsisten. Mungkin setengah bohong setengah jujur." },
  { min: 45, max: 60, label: "GAK YAKIN", emoji: "🟡", desc: "Sinyal campuran. Bisa jadi jujur tapi grogi, bisa juga bohong tapi pintar bersikap." },
  { min: 60, max: 80, label: "CUKUP JUJUR", emoji: "🟢", desc: "Detektor menunjukkan tanda kejujuran dengan sedikit keraguan. Kemungkinan besar jujur." },
  { min: 80, max: 95, label: "JUJUR BANGET", emoji: "🟢", desc: "Nadi stabil, mata fokus, nada suara tenang. Hampir pasti jujur." },
  { min: 95, max: 101, label: "SANGAT JUJUR", emoji: "🟢", desc: "Tidak ada tanda kebohongan sama sekali. Poligraf mendatar. Ini kejujuran level dewa." },
];

const ANALYSIS_STEPS = [
  "Memindai frekuensi suara...",
  "Analisis pola kedipan mata...",
  "Cek detak jantung virtual...",
  "Menghitung mikro-ekspresi...",
  "Evaluasi tingkat kebohongan...",
];

function randomPercent() {
  return Math.floor(Math.random() * 100);
}

function getVerdict(percent) {
  return VERDICTS.find(v => percent >= v.min && percent < v.max) || VERDICTS[0];
}

function randomReason() {
  const reasons = [
    "Kata 'gak' diucapkan dengan nada lebih tinggi dari biasanya.",
    "Subjek terdiam 0.3 detik sebelum menjawab.",
    "Pola ketukan jari menunjukkan kecemasan.",
    "Kata kunci dalam kalimat memiliki korelasi rendah dengan kejujuran.",
    "Suhu virtual naik 0.7 derajat saat pernyataan diucapkan.",
    "Intonasi datar, khas orang yang menghafal alibi.",
    "Mata bergerak ke kiri atas, indikasi konstruksi imajinasi.",
    "Jeda napas terlalu panjang sebelum kata kunci.",
    "Tidak ada tanda kebohongan yang berarti, nada stabil.",
    "Volume suara turun di akhir kalimat, tanda ketidakpastian.",
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  let statement = args;
  if (!statement && m.quoted) {
    statement = m.quoted.text || "";
  }

  if (!statement || statement.trim().length < 3) {
    const help = claraWrap("DetektifBohong", [
      `│ Simulator lie detector dramatis`,
      ``,
      `│ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  ${prefix}detektifbohong <pernyataan>`,
      `  Atau reply pesan: ${prefix}detektifbohong`,
      ``,
      `│ *ᴄᴏɴᴛᴏʜ:*`,
      `  ${prefix}detektifbohong aku gak pernah skak animes`,
      ``,
      `│ Hasil: persentase kebohongan + alasan lucu`,
      `│ Hasilnya random, jangan dipercaya ya :v`,
    ].join("\n"));
    return m.reply(help, "detektifbohong");
  }

  await m.react("🕒");

  const percent = randomPercent();
  const verdict = getVerdict(percent);

  let scanText = "";
  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    scanText += `${ANALYSIS_STEPS[i]}\n`;
  }

  const result = [
    `Target: ${m.pushName || "Anon"}`,
    `Pernyataan: "${statement.trim()}"`,
    ``,
    `${verdict.emoji} HASIL: ${verdict.label}`,
    `Tingkat Kebohongan: ${percent}%`,
    ``,
    `Analisis: ${verdict.desc}`,
    ``,
    `Detail: ${randomReason()}`,
    ``,
    `_Hasil random, bukan kebenaran absolut ya_`,
  ].join("\n");

  await m.reply(claraWrap("DetektifBohong", result));
  await m.react("🐣");

  return { handled: true };
}

export { pluginConfig as config, handler };
