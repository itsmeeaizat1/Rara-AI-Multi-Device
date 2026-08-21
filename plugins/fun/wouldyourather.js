// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wouldyourather",
  alias: ["wouldyourather", "wyrather", "pilihmana", "lebihpilih"],
  category: "fun",
  description: "Would You Rather — Pilih salah satu dari dua skenario absurd",
  usage: ".wouldyourather — Dapat skenario acak\n.wouldyourather a — Pilih opsi A\n.wouldyourather b — Pilih opsi B",
  example: ".wouldyourather\n.wouldyourather a",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SCENARIOS = [
  { a: "Makan nasi pakai kecap setiap hari", b: "Minum kopi pakai garam setiap hari" },
  { a: "Gak bisa main HP selama sebulan", b: "Gak bisa mandi selama seminggu" },
  { a: "Bisa terbang tapi cuma 10 meter", b: "Bisa ngilang tapi cuma 3 detik" },
  { a: "Selalu ngomong jujur", b: "Selalu dengerin orang ngomong jujur" },
  { a: "Kaya tapi gak punya temen", b: "Miskin tapi punya banyak temen" },
  { a: "Tidur 12 jam tiap hari", b: "Tidur 3 jam tiap hari" },
  { a: "Gak pernah sakit tapi gak pernah bahagia", b: "Sering sakit tapi selalu bahagia" },
  { a: "Bisa kembali ke masa lalu", b: "Bisa lihat masa depan" },
  { a: "Makan gorengan tiap hari gratis", b: "Minum kopi tiap hari gratis" },
  { a: "Jadi gajih 10jt tapi kerja 12 jam", b: "Gajih 5jt tapi kerja 4 jam" },
  { a: "Punya super power tapi gak bisa kelihatan", b: "Biasa aja tapi ganteng/cantik banget" },
  { a: "Tinggal di gunung tanpa WiFi", b: "Tinggal di kota tanpa AC" },
  { a: "Bisa ngerti semua bahasa", b: "Bisa main semua alat musik" },
  { a: "Gak pernah ngantuk", b: "Gak pernah laper" },
  { a: "Mending jomblo selamanya tapi happy", b: "Pacaran toxic tapi gak sendirian" },
  { a: "Hidup 100 tahun di masa lalu", b: "Hidup 50 tahun di masa depan" },
  { a: "Punya rumah mewah tapi di tengah hutan", b: "Punya kamar kecil tapi di tengah kota" },
  { a: "Selalu telat 10 menit", b: "Selalu datang 30 menit lebih awal" },
  { a: "Bisa hapus 1 kenangan buruk", b: "Bisa tambah 1 skill baru instan" },
  { a: "Nonton film yang ujungnya selalu sedih", b: "Nonton film yang ujungnya selalu cliffhanger" },
  { a: "Makan sebanyak apapun gak gemuk", b: "Tidur 2 jam tapi selalu segar" },
  { a: "Jadi orang terkenal tapi gak punya privasi", b: "Biasa aja tapi bebas bikin kesalahan" },
  { a: "Bicara sama hewan", b: "Bicara sama orang yang udah meninggal" },
  { a: "Selalu lupa nama orang", b: "Selalu inget semua hal jelek orang" },
  { a: "Gak bisa ngerasain sakit fisik", b: "Gak bisa ngerasain sedih" },
  { a: "Punya 1 juta tapi gak bisa dihabiskan untuk diri sendiri", b: "Punya 100rb tapi bebas habiskan" },
  { a: "Kerja remote selamanya", b: "Kerja kantor tapi cuma 3 hari seminggu" },
  { a: "Selalu salah baca situasi", b: "Selalu overthinking" },
  { a: "Hilang semua foto di HP", b: "Hilang semua kontak di HP" },
  { a: "Makan pedas tiap hari", b: "Makan manis tiap hari" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const choice = args[0]?.toLowerCase();

    // If user is choosing A or B from a stored scenario
    if (choice === "a" || choice === "b") {
      const stored = global.wyrCurrent;
      if (!stored || stored.userId !== m.sender) {
        return m.reply(claraWrap("Would You Rather", "Belum ada skenario aktif. Ketik " + usedPrefix + "wouldyourather", "warn"));
      }

      const picked = choice === "a" ? stored.scenario.a : stored.scenario.b;
      const pickedText = choice.toUpperCase();

      return m.reply(claraWrap("Would You Rather", [
        "Kamu pilih: " + pickedText,
        picked,
        "",
        "Skenario baru: " + usedPrefix + "wouldyourather",
      ], "info"));
    }

    // Generate new scenario
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

    if (!global.wyrCurrent) global.wyrCurrent = {};
    global.wyrCurrent = { userId: m.sender, scenario };

    return m.reply(claraWrap("Would You Rather", [
      "Pilih satu!",
      "",
      "A. " + scenario.a,
      "B. " + scenario.b,
      "",
      "Ketik: " + usedPrefix + "wouldyourather a",
      "Atau: " + usedPrefix + "wouldyourather b",
    ], "info"));
  } catch (e) {
    return m.reply(claraWrap("Would You Rather", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
