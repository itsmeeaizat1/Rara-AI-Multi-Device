// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// truthordarev2.js — Truth or Dare v2 via API + local fallback
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "truthordarev2",
  alias: ["truthordarev2"],
  category: "rpg",
  description: "Truth or Dare v2 — via API dengan rating filter + local fallback",
  usage: ".truthordarev2 <truth/dare> [rating]",
  example: ".truthordarev2 truth\n.truthordarev2 dare pg\n.truthordarev2 truth r",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Ratings: pg (safe), pg13, r (18+)
const VALID_RATINGS = ["pg", "pg13", "r"];

// Local fallback
const LOCAL_TRUTH = [
  "Apa rahasia yang belum pernah kamu ceritakan ke siapapun?",
  "Siapa crush kamu sekarang?",
  "Apa hal paling memalukan yang pernah kamu lakukan?",
  "Kapan terakhir kali kamu bohong dan apa yang kamu bohongi?",
  "Apa ketakutan terbesar kamu?",
  "Siapa orang yang paling kamu ingin hapus dari kontak?",
  "Apa hal yang paling kamu sesali dalam hidup?",
  "Pernah tidak kamu nge-stalk mantan? Berapa lama?",
  "Apa rating penampilan kamu dari 1-10?",
  "Siapa teman kamu yang paling annoying?",
  "Pernah kamu suka sama teman sendiri?",
  "Apa hal bodoh yang pernah kamu lakukan demi cinta?",
  "Kapan terakhir kamu nangis dan kenapa?",
  "Apa hal yang kamu sembunyikan dari orang tua?",
  "Pernah tidak kamu pura-pura sakit buat gak masuk sekolah?",
  "Siapa teman kamu yang paling kamupercaya?",
  "Apa kebiasaan buruk yang kamu sembunyikan?",
  "Pernah kamu zinah? (jika berani)",
  "Apa sifat buruk yang kamu benci dari diri sendiri?",
  "Kapan terakhir kamu bilang 'aku cinta kamu' dan ke siapa?",
];

const LOCAL_DARE = [
  "Kirim voice note nyanyi lagu ke grup ini",
  "Ganti nama display jadi 'Si Ganteng' selama 1 hari",
  "Kirim foto selfie tanpa filter sekarang",
  "Telepon random kontak dan bilang 'aku kangen kamu'",
  "Bilang ke orang terakhir chat: 'maaf aku ganteng/banget'",
  "Post status WA: 'Aku lagi galau, hiburin dong' dan biarkan 1 jam",
  "Voice note bacain surat cinta ke grup",
  "Kirim 5 emoji acak tanpa konteks ke grup",
  "Pura-pura jadi kucing selama 5 pesan ke depan",
  "Bilang 'aku suka kamu' ke crush kamu sekarang (atau ke random kontak)",
  "Kirim gif meme paling lucu yang kamu punya",
  "Tulis paragraf puitis tentang teman di sebelah kamu",
  "Buat story WA dengan caption 'lagi mencari jodoh'",
  "Kirim foto makanan terakhir yang kamu makan",
  "Berbicara formal selama 10 pesan ke depan",
  "Voice note dengan suara anak kecil",
  "Kirim 3 fakta random tentang dirimu yang gak ada yang tahu",
  "Chat random nomor: 'hai, kamu lagi apa?' dan screenshot balasannya",
  "Ganti PP jadi meme selama 1 hari",
  "Bilang ke 3 kontak random: 'maaf, aku salah chat' dan lihat reaksinya",
];

async function fetchTODAPI(type, rating) {
  try {
    const url = `https://api.truthordarebot.xyz/api/v1/${type}?rating=${rating || "pg"}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TOD API ${res.status}`);
    const json = await res.json();
    return json.question || null;
  } catch (e) {
    console.log(`[todv2] API failed for ${type}:`, e.message);
    return null;
  }
}

function getLocal(type) {
  const pool = type === "truth" ? LOCAL_TRUTH : LOCAL_DARE;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { sock, config, db }) {
  try {
    const type = (m.args?.[0] || "").toLowerCase();
    let rating = (m.args?.[1] || "pg").toLowerCase();

    if (!type || type === "help") {
      return m.reply(claraWrap("Truth or Dare v2", [
        "Truth or Dare via API + local fallback",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}truthordarev2 truth — minta truth (safe)`,
        `${m.prefix}truthordarev2 dare — minta dare (safe)`,
        `${m.prefix}truthordarev2 truth pg13 — rating remaja`,
        `${m.prefix}truthordarev2 dare r — rating dewasa`,
        "",
        "Rating: pg (aman), pg13 (remaja), r (18+)",
      ]));
    }

    if (type !== "truth" && type !== "dare") {
      await m.react("🐣");
      return m.reply(claraWrap("Truth or Dare v2", [
        "Tipe tidak valid!",
        `Pilih: ${m.prefix}truthordarev2 truth atau ${m.prefix}truthordarev2 dare`,
      ]));
    }

    if (!VALID_RATINGS.includes(rating)) rating = "pg";

    await m.react("🕒");

    // Try API first
    let question = await fetchTODAPI(type, rating);

    // Fallback to local
    if (!question) {
      question = getLocal(type);
    }

    const typeLabel = type === "truth" ? "🤔 Truth" : "😈 Dare";
    const ratingLabel = rating === "pg" ? "Safe" : rating === "pg13" ? "Remaja" : "18+";

    await m.react("🐣");
    return m.reply(claraWrap("Truth or Dare v2", [
      `${typeLabel} (${ratingLabel})`,
      "",
      question,
    ]));
  } catch (e) {
    console.error("[truthordarev2] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "truthordarev2");
  }
}

export { pluginConfig as config, handler };
