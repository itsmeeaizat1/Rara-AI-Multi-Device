// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "gombal",
  alias: ["gombal"],
  category: "fun",
  description: "Generator gombal/random pickup line buat nembak crush",
  usage: ".gombal — Gombal acak\n.gombal <kategori> — Kategori: halus, gaul, cringe, gokil\n.gombal @target — Kirim gombal ke target",
  example: ".gombal\n.gombal cringe\n.gombal @target",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const GOMBAL_DB = {
  halus: [
    "Kamu tahu beda kamu sama matahari? Matahari cuma muncul siang, kamu muncul di pikiranku 24 jam.",
    "Kalau aku jadi planet, aku mau jadi Bumi. Soalnya cuma di Bumi ada kamu.",
    "Aku gak butuh Google Maps, soalnya aku udah nemu jalan ke hatimu.",
    "Kamu itu kayak bintang, jauh tapi selalu bikin aku penasaran.",
    "Kalau kamu jadi lagu, aku mau replay sampai hafal liriknya.",
    "Aku mau jadi pelangi bukan cuma satu warna, biar bisa bikin kamu senyum dalam banyak cara.",
    "Setiap kali aku ngelihat kamu, aku lupa kata-kata. Kamu bikin otakku hang.",
    "Kamu itu kayak WiFi, sinyalmu bikin aku selalu konek ke kamu.",
  ],
  gaul: [
    "Eh, lu tau beda lu sama bensin? Bensin bisa habis, tapi rasa aku ke lu gak akan pernah.",
    "Kalo lu lagi sedih, aku siap jadi tisu. Pakai, buang, ambil lagi, gak papa.",
    "Lu itu kayak sepatu baru. Bikin aku deg-degan tiap liat.",
    "Jangan sering-sering liat aku, nanti aku kira lu suka. Eh, beneran suka kan?",
    "Aku bukan jodoh lu, tapi aku mau jadi jalan ke jodoh lu (kalau jodohnya aku sih lebih bagus).",
    "Lu kayak tiket konser, susah didapat tapi begitu dapet, aku gak mau lepas.",
    "Aku bukan ojek online, tapi aku siap anter kamu ke mana pun (asal jangan ke hati orang lain).",
    "Kalo lu lagi susah tidur, inget aja aku. Gak jaminan lu bisa tidur, tapi aku seneng lu inget aku.",
  ],
  cringe: [
    "Kamu itu kayak nasi, tiap hari aku butuh. Tanpa kamu aku gak kuat hidup (dan gak kuat lapar).",
    "Aku mau jadi kucing peliharaanmu, aku mau dielus-elus setiap hari.",
    "Kalau aku sedih aku nangis, kalau liat kamu aku nangis lagi (karena terlalu ganteng/cantik).",
    "Aku bukan dokter, tapi aku bisa buat jantungmu berdebar tanpa obat.",
    "Kamu itu kayak sambal, tanpa kamu hidupku hambar (tapi kamu bikin aku kepedesan).",
    "Aku mau jadi jaket mu biar aku bisa peluk kamu setiap waktu.",
    "Kalau kamu hilang satu hari, aku cari sampai ketemu (kayak Remote TV yang hilang).",
    "Kamu itu lebih manis dari gula. Tapi gula bikin diabetes, kamu bikin love-sick.",
  ],
  gokil: [
    "Eh kamu tau gak, aku baru aja lapor polisi. Katanya kamu curi hati aku.",
    "Kamu itu kayak sate, aku mau tusuk-tusuk tapi bukan sate.",
    "Aku bukan dukun, tapi aku bisa ramal: kita bakal bareng (atau gak, terserah).",
    "Kamu itu kayak kendaraan, aku naikin tapi gak ada bensin (bisa kabur).",
    "Kalo aku jadi pohon, aku mau jadi pohon di depan rumahmu biar aku bisa tiup daun ke kamu.",
    "Aku bukan tukang parkir, tapi aku bisa parkirin hati kamu di hati aku.",
    "Kamu itu kayak notifikasi HP, selalu bikin aku langsung cek padahal gak penting (tapi tetap aku cek).",
    "Kalau aku jadi mikroba, aku mau hidup di hatimu biar aku bisa bikin kamu demam (cinta).",
  ],
};

const CATEGORIES = Object.keys(GOMBAL_DB);

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    let category = null;
    let target = null;

    // Check for @mention
    const mentioned = m.mentionedJid?.[0] || m.quoted?.sender;
    if (mentioned) {
      target = mentioned;
    }

    // Parse category from args
    const arg = args[0]?.toLowerCase();
    if (arg && GOMBAL_DB[arg]) {
      category = arg;
    } else if (arg && arg.startsWith("@")) {
      // @target, no category
    }

    if (arg && !GOMBAL_DB[arg] && !arg.startsWith("@") && mentioned) {
      // category not found but has mention
      category = null;
    }

    if (arg && !GOMBAL_DB[arg] && !arg.startsWith("@") && !mentioned) {
      return m.reply(claraWrap("Gombal", "Kategori tidak ditemukan!\n\nTersedia: " + CATEGORIES.join(", "), "warn"));
    }

    const selectedCat = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const pool = GOMBAL_DB[selectedCat];
    const line = pool[Math.floor(Math.random() * pool.length)];

    const rows = [
      `│ • 🎯 Kategori : ${selectedCat}`,
    ];

    if (target) {
      rows.unshift(`│ • 💌 Untuk : @${target.split("@")[0]}`);
    }
    rows.push("│", `│ • ${line}`);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "gombal", icon: "💘",
      flavor: "💘 *GOMBALAN BUAT KAMU!*",
      body: rows.join("\n"),
      cta: gameCTA("gombal"),
    }));
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Gombal", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
