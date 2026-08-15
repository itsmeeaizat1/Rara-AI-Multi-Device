// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "asahotak", alias: ["brainquiz", "logicquiz"], category: "fun",
  description: "Kuis asah otak", usage: ".asahotak",
  example: ".asahotak", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

const QUESTIONS = [
  { q: "Apa yang ada di depan 'TAPI' dan di belakang 'TAPI'?", a: "Huruf T" },
  { q: "Jika 1=5, 2=10, 3=15, 4=20, maka 5=?", a: "1" },
  { q: "Apa yang bisa kamu berikan tapi tidak bisa kamu pegang?", a: "Janji" },
  { q: "Jumlah semua sudut segitiga adalah?", a: "180 derajat" },
  { q: "Hewan apa yang tidak bisa melompat?", a: "Gajah" },
  { q: "Planet terdekat dengan matahari?", a: "Merkurius" },
  { q: "Apa yang lebih ringan dari bulu tapi tidak bisa ditahan lama?", a: "Napasku" },
  { q: "Berapa banyak sisi pada heksagon?", a: "6" },
  { q: "Ikan apa yang matinya paling mahal?", a: "Ikan Hiu (fin)" },
  { q: "Apa yang naik tapi tidak pernah turun?", a: "Umur" },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    { const __navText = (claraWrap("Asah Otak", [`◦ ${q.q}`].join("\n")) + "\n" + tipText("Balas dengan jawabanmu!")); await m.reply(__navText); };
    // Simpan jawaban untuk verifikasi
    if (!global.asahotakAnswer) global.asahotakAnswer = {};
    global.asahotakAnswer[m.sender] = q.a.toLowerCase();
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };