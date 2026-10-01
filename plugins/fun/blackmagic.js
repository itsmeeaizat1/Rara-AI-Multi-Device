// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { persistLoad, persistSave } from "../../src/lib/rara-ram-persist.js";

const pluginConfig = {
  name: "santet",
  alias: ["santet"],
  category: "fun",
  description: "Kirim santet virtual ke temen — efek lucu, bisa dilawan",
  usage: ".santet @target — Kirim santet ke target\n.santet info — Statistik santet\n.tawasantet — Lawan santet yang kamu terima",
  example: ".santet @target\n.tawasantet",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const EFEK_SANTET = [
  { nama: "Gak bisa bangun pagi", emoji: "🛏️", durasi: "3 hari", tingkat: "ringan" },
  { nama: "Laper melulu tiap jam", emoji: "🍜", durasi: "2 hari", tingkat: "ringan" },
  { nama: "Ngantuk terus di jam kerja", emoji: "😴", durasi: "5 jam", tingkat: "sedang" },
  { nama: "Tangan gatel tiap liat belanjaan", emoji: "💸", durasi: "1 hari", tingkat: "sedang" },
  { nama: "Lupa nama diri sendiri 10 menit", emoji: "🤔", durasi: "10 menit", tingkat: "keras" },
  { nama: "Bicara campur bahasa alien", emoji: "👽", durasi: "1 jam", tingkat: "keras" },
  { nama: "Ketawa sendiri tiap 30 detik", emoji: "🤣", durasi: "2 jam", tingkat: "sedang" },
  { nama: "Selalu salah jawab 'iya' ke semua", emoji: "🤪", durasi: "3 jam", tingkat: "keras" },
  { nama: "Bikin jadi kebayan tiba-tiba", emoji: "💋", durasi: "1 hari", tingkat: "keras" },
  { nama: "Liat makanan langsung laper", emoji: "🍔", durasi: "5 jam", tingkat: "ringan" },
  { nama: "Hidung gatel tiap mau ketawa", emoji: "👃", durasi: "1 jam", tingkat: "ringan" },
  { nama: "Tiba-tiba nyanyi dangdut di public", emoji: "🎤", durasi: "30 menit", tingkat: "keras" },
];

const TAWA_RESULT = [
  { text: "Tawa berhasil! Santet ditolak balik ke pengirim!", success: true },
  { text: "Tawa berhasil! Santet hilang tanpa jejak.", success: true },
  { text: "Tawa berhasil! Kamu kebal santet hari ini!", success: true },
  { text: "Tawa gagal! Santet malah jadi 2x lipat kuat!", success: false },
  { text: "Tawa berhasil, tapi efek samping: kamu jadi laper.", success: true },
  { text: "Tawa gagal! Santet resisten, butuh tawa lagi besok.", success: false },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    persistLoad("santetDB"); persistLoad("santetStats"); // anti hilang pas restart
    await m.react("🕒");
    if (command === "tawasantet") {
      // Check if user has santet
      const activeSantet = global.santetDB?.[m.sender];
      if (!activeSantet) {
        return m.reply(raraWrap("Tawa Santet", "Kamu gak kena santet! Aman 👍", "info"));
      }

      const result = TAWA_RESULT[Math.floor(Math.random() * TAWA_RESULT.length)];

      if (result.success) {
        // Reflect back to sender
        delete global.santetDB[m.sender];
        persistSave("santetDB");
        const lines = [
          "TAWA SANTET!",
          result.text,
          "",
          "Kamu bebas dari santet!",
        ];

        if (activeSantet.from) {
          lines.push("");
          lines.push("Santet balik ke @" + activeSantet.from.split("@")[0] + "!");
          if (!global.santetDB) global.santetDB = {};
          global.santetDB[activeSantet.from] = {
            efek: activeSantet.efek,
            from: m.sender,
            time: Date.now(),
          };
          persistSave("santetDB");
        }

        return m.reply(raraWrap("Tawa Santet", lines, "info"));
      } else {
        return m.reply(raraWrap("Tawa Santet", [
          "TAWA SANTET!",
          result.text,
          "",
          "Coba tawa lagi besok: " + usedPrefix + "tawasantet",
        ], "warn"));
      }
    }

    // .santet @target
    if (args[0] === "info") {
      const active = global.santetDB?.[m.sender];
      const stats = global.santetStats?.[m.sender] || { kirim: 0, terima: 0 };
      const lines = [
        "STATISTIK SANTEt",
        "Dikirim: " + stats.kirim,
        "Diterima: " + stats.terima,
      ];

      if (active) {
        lines.push("");
        lines.push("SANTEt AKTIF:");
        lines.push(active.efek.emoji + " " + active.efek.nama);
        lines.push("Tingkat: " + active.efek.tingkat + " | Durasi: " + active.efek.durasi);
        lines.push("");
        lines.push("Lawan: " + usedPrefix + "tawasantet");
      } else {
        lines.push("");
        lines.push("Santet: Bersih, gak kena apa-apa");
      }

      return m.reply(raraWrap("Santet", lines, "info"));
    }

    const target = m.mentionedJid?.[0] || m.quoted?.sender;
    if (!target) {
      return m.reply(raraWrap("Santet", "Tag target yang mau disantet!\n\n💡 *Contoh:* " + usedPrefix + "santet @target", "warn"));
    }

    if (target === m.sender) {
      return m.reply(raraWrap("Santet", "Ngapain santet diri sendiri? 🤨", "warn"));
    }

    const efek = EFEK_SANTET[Math.floor(Math.random() * EFEK_SANTET.length)];

    if (!global.santetDB) global.santetDB = {};
    if (!global.santetStats) global.santetStats = {};
    if (!global.santetStats[m.sender]) global.santetStats[m.sender] = { kirim: 0, terima: 0 };
    if (!global.santetStats[target]) global.santetStats[target] = { kirim: 0, terima: 0 };

    global.santetDB[target] = { efek, from: m.sender, time: Date.now() };
    persistSave("santetDB");
    global.santetStats[m.sender].kirim++;
    persistSave("santetStats");
    global.santetStats[target].terima++;

    await m.react("🐣");
    return m.reply(raraWrap("Santet", [
      "SANTEt TERKIRIM!",
      "",
      "Dari: @" + m.sender.split("@")[0],
      "Ke: @" + target.split("@")[0],
      "",
      efek.emoji + " Efek: " + efek.nama,
      "Tingkat: " + efek.tingkat,
      "Durasi: " + efek.durasi,
      "",
      "Lawan santet: " + usedPrefix + "tawasantet",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Santet", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
