// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "voodoodoll",
  alias: ["voodoodoll", "voodoo", "bonekavoodoo", "dukunvoodoo", "pelukvoodoo"],
  category: "fun",
  description: "Voodoo doll virtual — pilih aksi, hasil lucu, pure fun",
  usage: ".voodoodoll @target — Menu aksi voodoo\n.voodoodoll @target <aksi> — Pilih aksi",
  example: ".voodoodoll @target\n.voodoodoll @target tikam",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const AKSI_VOODOO = [
  {
    id: "tikam", nama: "Tikam", emoji: "📌",
    hasil: ["Tusuk jarum, target tiba-tiba sakit perut 3 detik", "Tikam! Target kena gatal di hidung", "Tikam jari kaki, target lompat-lompat 1 menit", "Tikam betis, target jadi capai jalannya"],
  },
  {
    id: "peluk", nama: "Peluk", emoji: "🤗",
    hasil: ["Peluk voodoo, target tiba-tiba nangis terharu", "Peluk! Target jadi good mood 1 jam", "Peluk erat, target jadi super sayang ke kamu (tapi gak bakal tau)", "Peluk, target laper tiba-tiba"],
  },
  {
    id: "cubit", nama: "Cubit", emoji: "🤏",
    hasil: ["Cubit lengan, target gatal-gatal 5 detik", "Cubit pipi, target merah pipinya 10 menit", "Cubit telinga, target pendengaran jadi ga jelas sebentar", "Cubit bahu, target merasa diketuk dari belakang"],
  },
  {
    id: "bentak", nama: "Bentak", emoji: "📢",
    hasil: ["Bentak voodoo, target kaget sendiri", "Bentak! target tiba-tiba inget pacar temennya", "Bentak voodoo, target jadi salfok 30 detik", "Bentak, target lupa mau ngomong apa"],
  },
  {
    id: "jentik", nama: "Jentik", emoji: "👉",
    hasil: ["Jentik kening, target pusing 2 detik", "Jentik hidung, target bersin tiba-tiba", "Jentik telinga, target dengar suara aneh", "Jentik pipi, target merasa dipanggil"],
  },
  {
    id: "cium", nama: "Cium", emoji: "💋",
    hasil: ["Cium voodoo, target merasa hangat dadanya", "Cium! Target senyum sendiri 5 menit", "Cium, target tiba-tiba wanti-wanti bahagia", "Cium pipi voodoo, target merasa di sayang semesta"],
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const target = m.mentionedJid?.[0] || m.quoted?.sender;

    if (!target) {
      const lines = ["VOODOO DOLL", "", "Pilih target dulu, lalu pilih aksi:", ""];
      AKSI_VOODOO.forEach(a => {
        lines.push(a.emoji + " " + a.nama + " (" + a.id + ")");
      });
      lines.push("");
      lines.push("Contoh: " + usedPrefix + "voodoodoll @target tikam");
      return m.reply(claraWrap("Voodoo Doll", lines, "info"));
    }

    const aksiId = args[1]?.toLowerCase();
    const aksi = AKSI_VOODOO.find(a => a.id === aksiId);

    if (!aksi) {
      const lines = [
        "VOODOO DOLL",
        "",
        "Target: @" + target.split("@")[0],
        "Pilih aksi:",
        "",
      ];
      AKSI_VOODOO.forEach(a => {
        lines.push(a.emoji + " " + a.id + " — " + a.nama);
      });
      lines.push("");
      lines.push("Contoh: " + usedPrefix + "voodoodoll @" + target.split("@")[0] + " tikam");
      return m.reply(claraWrap("Voodoo Doll", lines, "info"));
    }

    const hasil = aksi.hasil[Math.floor(Math.random() * aksi.hasil.length)];

    return m.reply(claraWrap("Voodoo Doll", [
      "VOODOO " + aksi.nama.toUpperCase() + "!",
      "",
      "Target: @" + target.split("@")[0],
      "Aksi: " + aksi.emoji + " " + aksi.nama,
      "",
      "Hasil:",
      hasil,
      "",
      usedPrefix + "voodoodoll @" + target.split("@")[0] + " <aksi>",
    ], "info"));
  } catch (e) {
    return m.reply(claraWrap("Voodoo Doll", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
