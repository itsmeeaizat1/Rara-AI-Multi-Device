// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "compliment",
  alias: ["compliment"],
  category: "smart",
  description: "Compliment bot - kirim pujian ke seseorang di grup",
  usage: ".compliment <command>",
  example: ".compliment @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const COMPLIMENTS = [
  "Kamu punya aura yang bikin orang nyaman di sekitar kamu.",
  "Setiap kamu ngomong, aku selalu pengen denger lebih banyak.",
  "Kamu lebih kuat dari yang kamu kira, dan aku bangga sama kamu.",
  "Kamu bikin hari yang jelek jadi lumayan.",
  "Kamu punya cara berpikir yang unik dan itu menarik.",
  "Kamu tuh tipe orang yang bikin grup jadi hidup.",
  "Aku suka cara kamu nerima orang apa adanya.",
  "Kamu selalu punya timing yang pas buat bikin orang senyum.",
  "Kamu lebih dewasa dari umur kamu, dan itu bukan hal yang gampang.",
  "Kamu tuh bukti kalau orang baik masih ada.",
  "Kalo kamu masuk grup, suasananya langsung beda.",
  "Kamu punya energi yang bikin orang pengen jadi versi terbaik diri mereka.",
  "Aku salam sama cara kamu tetep diri sendiri walau banyak tekanan.",
  "Kamu tuh orang yang di-undang di mana-mana tapi tetep humble.",
  "Kamu lebih pintar dari yang kamu tunjukin ke orang.",
  "Kamu punya selera yang bagus, dan itu jarang.",
  "Aku suka cara kamu nge-handle situasi sulit, tetep cool.",
  "Kamu bikin orang ngerasa dihargai tanpa kamu sadari.",
  "Kamu tuh alasan kenapa grup ini masih seru.",
  "Kamu punya dampak yang lebih besar dari yang kamu kira.",
  "Setiap kata yang kamu omongin tuh bermutu.",
  "Kamu tuh contoh kalau baik itu masih exist di dunia ini.",
  "Kalo ada lebih banyak orang kayak kamu, dunia bakal lebih baik.",
  "Aku salam sama kesabaran kamu, itu level dewa.",
  "Kamu bikin hal yang biasa jadi luar biasa cuma dengan hadir.",
];

const SWEET = [
  "Kamu tau gak? Kamu itu alasan kenapa aku senyum hari ini.",
  "Kalo cantik/ganteng itu dosa, kamu udah masuk neraka paling atas.",
  "Setiap lihat kamu, aku lupa mau ngomong apa. Itu efek kamu.",
  "Kamu tuh bintang yang jatoh tapi gak mau pulang ke langit.",
  "Kalo kata 'sempurna' itu punya wajah, itu pasti mirip kamu.",
  "Aku gak tau caranya kamu bikin orang ngerasa spesial, tapi kamu berhasil.",
  "Kamu itu kayak WiFi: kuat, cepet, dan bikin orang betah.",
  "Mata kamu tuh lebih dalam dari samudra, aku bisa tenggelam di situ.",
  "Kamu lebih manis dari gula yang di-pajak tinggi.",
  "Kalo kamu senyum, aku lupa semua masalah. Termasuk masalah kamu.",
];

function getConfig(db, gid) {
  const all = db.setting("compliment") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("compliment") || {};
  all[gid] = data;
  db.setting("compliment", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const today = todayDate();

  if (sub === "random" || sub === "acak") {
    const msg = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    await m.reply(raraWrap("Compliment", msg));
    return { handled: true };
  }

  if (sub === "sweet" || sub === "gombal") {
    const msg = SWEET[Math.floor(Math.random() * SWEET.length)];
    await m.reply(raraWrap("Sweet Words", msg));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    if (!cfg[m.sender]) cfg[m.sender] = { sent: 0, received: 0, lastSent: "", dailySent: 0, dailyDate: "" };
    if (cfg[m.sender].dailyDate !== today) {
      cfg[m.sender].dailyDate = today;
      cfg[m.sender].dailySent = 0;
    }
    await m.reply(raraWrap("Compliment", [
      "COMPLIMENT BOT",
      "",
      "Kamu: " + cfg[m.sender].sent + " sent | " + cfg[m.sender].received + " received",
      "Hari ini: " + cfg[m.sender].dailySent + "/5 compliment terkirim",
      "",
      prefix + "compliment @user - kirim pujian",
      prefix + "compliment sweet @user - kirim gombal",
      prefix + "compliment random - pujian acak",
      prefix + "compliment stats - statistik",
      "",
      "Maksimal 5 compliment per hari per orang!",
    ].join("\n")));
    saveConfig(db, gid, cfg);
    return { handled: true };
  }

  // Default: send compliment to mentioned user
  const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null;
  if (!mentioned) {
    await m.reply(raraWrap("Compliment", "Tag orang yang mau di-compliment!\n💡 *Contoh:* " + prefix + "compliment @user\n" + prefix + "compliment sweet @user"));
    return { handled: true };
  }
  if (mentioned === m.sender) {
    await m.reply(raraWrap("Compliment", "Tidak bisa compliment diri sendiri! Tapi kamu memang keren kok."));
    return { handled: true };
  }

  // Check daily limit
  if (!cfg[m.sender]) cfg[m.sender] = { sent: 0, received: 0, lastSent: "", dailySent: 0, dailyDate: "" };
  if (cfg[m.sender].dailyDate !== today) {
    cfg[m.sender].dailyDate = today;
    cfg[m.sender].dailySent = 0;
  }
  if (cfg[m.sender].dailySent >= 5) {
    await m.reply(raraWrap("Compliment", "Limit harian habis! Maksimal 5 compliment per hari.\nBesok lagi ya!"));
    return { handled: true };
  }

  // Pick compliment
  let msg;
  if (sub === "sweet" || sub === "gombal") {
    msg = SWEET[Math.floor(Math.random() * SWEET.length)];
  } else {
    msg = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
  }

  // Update stats
  cfg[m.sender].sent++;
  cfg[m.sender].dailySent++;
  cfg[m.sender].lastSent = today;
  if (!cfg[mentioned]) cfg[mentioned] = { sent: 0, received: 0, dailySent: 0, dailyDate: "" };
  cfg[mentioned].received++;
  saveConfig(db, gid, cfg);

  const title = (sub === "sweet" || sub === "gombal") ? "Sweet Words" : "Compliment";
  await m.reply(raraWrap(title + " dari @" + m.sender.split("@")[0], [
    "@" + mentioned.split("@")[0],
    "",
    msg,
    "",
    "Dari: @" + m.sender.split("@")[0],
  ].join("\n")), { mentions: [m.sender, mentioned] });
  return { handled: true };
}

export { pluginConfig as config, handler };
