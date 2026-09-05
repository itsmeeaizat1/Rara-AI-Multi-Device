// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nyindir",
  alias: ["nyindir"],
  category: "fun",
  description: "Generator kalimat nyindir/savage buat reply",
  usage: ".nyindir — Sindiran acak\n.nyindir <kategori> — Kategori: halus, frontal, sarkas, baper\n.nyindir @target — Kirim sindiran ke target",
  example: ".nyindir\n.nyindir frontal\n.nyindir @target",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SINDIRAN_DB = {
  halus: [
    "Habis ini tolong ya, aku sibuk. Oh tunggu, kamu juga sibuk kan? Sibuk nganggur.",
    "Maaf ya, aku gak bisa ajak ngobrol lama. Kamu kan punya banyak waktu, tapi gak ada isi.",
    "Wah, kamu hebat banget. Bisa bikin aku nunggu tanpa hasil.",
    "Aku kira kamu cuma lewat, ternyata kamu betah bikin pusing.",
    "Kalo kepintaran diukur dari bacot, kamu pasti lulus cum laude.",
    "Aku suka cara kamu berpikir. Kayaknya cuma satu arah aja kan?",
    "Kamu tuh kayak angin, datang bikin gak tenang, pergi gak bikin rindu.",
    "Pintar kamu tuh kayak WiFi gratis, sinyalnya ada tapi gak bisa dipake.",
  ],
  frontal: [
    "Muka kamu tuh kayanya dipake buat nyimpen masalah, bukan buat senyum.",
    "Kalo aku jadi kamu, aku bakal cermin dulu sebelum ngomong. Tapi cermin bakal retak.",
    "Kamu tuh kayak tukang parkir, tiap ada masalah kamu selalu nyari duit.",
    "Gak usah sok sibuk, jelas-jelas kamu cuma buang-buang waktu.",
    "Kalo kepala kamu isinya cuma udara, aku pantes jadi panas.",
    "Kamu tuh lebih berisik dari knalpot motor, tapi lebih gak jelas maksudnya.",
    "Gak papa kok gak pinter, yang penting gak nyusahin. Tapi kamu nyusahin juga.",
    "Kalo kegantengan/kecantikan diukur dari jumlah bacot, kamu bakal jadi juara.",
  ],
  sarkas: [
    "Wah, hebat banget kamu bisa itu. Ajaib banget, orang normal gak bisa kaya gitu.",
    "Oh, kamu nanya gitu? Kirain kamu udah tau semuanya, dong.",
    "Pantes aja kamu single, liat cara kamu mikir aja udah gak lolos.",
    "Wah, makasih banyak ya udah repot-repot ngejelasin yang gak ditanya.",
    "Oh gitu ya? Wah, aku baru tau. Tapi aku juga gak peduli sih.",
    "Apa kamu mau jadi pahlawan? Gawat, jalanan masih berbahaya buat kamu sendiri.",
    "Kalo mau sok pinter, minimal jangan sok pinter dulu. Belajar dulu.",
    "Wah, kamu tuh unik banget. Sayangnya gak semua yang unik itu bagus.",
  ],
  baper: [
    "Kamu bilang sayang, tapi kayaknya kamu cuma sayang sama diri sendiri.",
    "Aku kadang kepikiran, apa kamu pernah mikirin aku juga. Kayaknya gak.",
    "Kamu tuh kayak ayam, aku pelihara tapi aku tetap gak bisa ngerti kamu.",
    "Kalo perasaanmu ke aku kayak cuaca, pantes aku udah move on dari lama.",
    "Dibilang sayang, tapi tiap butuh kamu gak pernah ada. Terus aku harus apa?",
    "Aku udah ikhlas kamu gak perhatiin aku. Tapi kamu perhatiin yang lain, itu yang gak ikhlas.",
    "Kamu tuh kayak jemuran, kalo hujan gak gunung-gantung, nangis.",
    "Dibilang temen, tapi kayaknya aku cuma temen pas kamu butuh aja.",
  ],
};

const KATEGORI = Object.keys(SINDIRAN_DB);

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    let category = null;
    const mentioned = m.mentionedJid?.[0] || m.quoted?.sender;
    const arg = args[0]?.toLowerCase();

    if (arg && SINDIRAN_DB[arg]) {
      category = arg;
    }

    if (arg && !SINDIRAN_DB[arg] && !arg.startsWith("@") && !mentioned) {
      return m.reply(claraWrap("Nyindir", "Kategori tidak ada!\n\nTersedia: " + KATEGORI.join(", "), "warn"));
    }

    const selectedCat = category || KATEGORI[Math.floor(Math.random() * KATEGORI.length)];
    const pool = SINDIRAN_DB[selectedCat];
    const line = pool[Math.floor(Math.random() * pool.length)];

    const lines = [
      "Kategori: " + selectedCat,
      "",
      line,
    ];

    if (mentioned) {
      lines.splice(0, 0, "Untuk: @" + mentioned.split("@")[0]);
    }

    lines.push("");
    lines.push(usedPrefix + "nyindir <kategori> untuk lagi");

    await m.react("🐣");
    return m.reply(claraWrap("Nyindir", lines, "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Nyindir", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
