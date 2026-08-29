// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// wouldyourather.js — Would You Rather questions (API + local fallback)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "wouldyourather",
  alias: ["wouldyourather"],
  category: "fun",
  description: "Dilema Would You Rather — pilih A atau B",
  usage: ".wouldyourather",
  example: ".wouldyourather",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Local fallback questions
const LOCAL_WYR = [
  { a: "Hidup 100 tahun masa lalu", b: "Hidup 100 tahun masa depan" },
  { a: "Selalu bilang apa yang dipikir", b: "Tidak pernah bisa bicara lagi" },
  { a: "Miskin tapi bahagia", b: "Kaya tapi kesepian" },
  { a: "Bisa terbang", b: "Bisa menghilang" },
  { a: "Tidur selama 1 tahun", b: "Tidak tidur selamanya" },
  { a: "Makan nasi setiap hari", b: "Makan pizza setiap hari" },
  { a: "Jadi genius yang tidak diakui", b: "Jadi bodoh yang terkenal" },
  { a: "Hilang semua memori lama", b: "Tidak bisa bikin memori baru" },
  { a: "Tinggal di gunung seumur hidup", b: "Tinggal di pulau terpencil seumur hidup" },
  { a: "Bisa membaca pikiran", b: "Bisa melihat masa depan" },
  { a: "Tidak punya internet selamanya", b: "Tidak punya AC selamanya" },
  { a: "Kerja 4 hari 10 jam/hari", b: "Kerja 5 hari 8 jam/hari" },
  { a: "Gratis makan seumur hidup", b: "Gratis liburan seumur hidup" },
  { a: "Jadi artis terkenal", b: "Jadi ilmuwan terkenal" },
  { a: "Bisa teleport", b: "Bisa time travel" },
  { a: "Selalu hujan", b: "Selalu panas terik" },
  { a: "Punya 100 teman dekat", b: "Punya 1 sahabat sejati" },
  { a: "Gak punya HP", b: "Gak punya musik" },
  { a: "Kenyang tapi gak enak", b: "Lapar tapi enak" },
  { a: "Jadi ketua kelas", b: "Jadi ketua OSIS" },
];

async function fetchWYR() {
  try {
    const res = await fetch("https://api.truthordarebot.xyz/api/v1/wyr");
    if (!res.ok) throw new Error(`WYR API ${res.status}`);
    const json = await res.json();
    if (json.question) {
      // Parse "Would you rather X or Y?" format
      const match = json.question.match(/(?:would you rather\s*)?(.+) or (.+)\??$/i);
      if (match) {
        return { a: match[1].trim(), b: match[2].trim() };
      }
      return { a: json.question, b: "..." };
    }
  } catch (e) {
    console.log("[wyr] API failed, using local:", e.message);
  }
  // Fallback to local
  return LOCAL_WYR[Math.floor(Math.random() * LOCAL_WYR.length)];
}

async function handler(m, { sock, config, db }) {
  try {
    await m.react("🕒");

    const wyr = await fetchWYR();

    await m.react("🐣");

    const text = `Mau pilih yang mana?\n\n🅰️ ${wyr.a}\n\n🅱️ ${wyr.b}\n\nBalas A atau B untuk jawab!`;

    return m.reply(claraWrap("Would You Rather", text));
  } catch (e) {
    console.error("[wouldyourather] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "wouldyourather");
  }
}

export { pluginConfig as config, handler };
