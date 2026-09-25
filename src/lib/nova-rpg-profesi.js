// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-rpg-profesi.js — Animasi KERJA per-profesi (8 Sep 2026,
// request owner: "tiap game punya animasi sendiri beda-beda, ubah
// animasi game .kerja seperti ini" + contoh PROFESI_ANIMATIONS).
//
// 11 PROFESI (verbatim dari contoh owner) + 8 JOB RPG lama yang juga
// dikasih frame bertema sendiri — biar TIAP pilihan kerja punya
// animasi unik, gak ada yang generik.
//
// Dipakai: plugins/rpg/working.js via animProfesi() → rpgScene
// (morphing message: edit-in-place antar scene, fallback pesan baru).

import { rpgScene } from "./nova-rpg-anim.js";

export const PROFESI_ANIMATIONS = {
  // ══════════ PROFESI (contoh owner) ══════════

  // ===== PROFESI: PENEBANG =====
  penebang: {
    kerja: [
      "🪓 [=====] Menebang pohon...",
      "🪓 [=====-] 25%",
      "🪓 [===---] 50%",
      "🪓 [=-----] 75%",
      "🪓 [------] 🌳 Pohon Tumbang!",
    ],
    hasil: ["🪵 Mendapatkan Kayu Jati!", "🪵 +10 Kayu"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🪓 Ahli Penebang!", "🔥 Kecepatan menebang +20%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 500.000", "📦 Bonus: Kayu Premium x5"],
    status: "🪓 Penebang",
  },

  // ===== PROFESI: PETANI =====
  petani: {
    kerja: [
      "🌾 [=====] Menanam padi...",
      "🌾 [=====-] 25%",
      "🌾 [===---] 50%",
      "🌾 [=-----] 75%",
      "🌾 [------] 🌱 Padi Tumbuh!",
    ],
    hasil: ["🌾 Panen Padi Berhasil!", "🌾 +20 Gabah"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🌾 Petani Handal!", "🌿 Hasil panen +30%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 400.000", "📦 Bonus: Beras Organik x10"],
    status: "🌾 Petani",
  },

  // ===== PROFESI: PENAMBANG =====
  penambang: {
    kerja: [
      "⛏️ [=====] Menggali batu...",
      "⛏️ [=====-] 25%",
      "⛏️ [===---] 50%",
      "⛏️ [=-----] 75%",
      "⛏️ [------] 💎 Batu Mulia Ditemukan!",
    ],
    hasil: ["💎 Mendapatkan Berlian!", "💎 +5 Berlian"],
    naikLevel: ["⬆️ *LEVEL UP!*", "⛏️ Penambang Ahli!", "💎 Kesempatan temukan emas +10%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 600.000", "📦 Bonus: Batu Mulia x3"],
    status: "⛏️ Penambang",
  },

  // ===== PROFESI: NELAYAN =====
  nelayan: {
    kerja: [
      "🎣 [=====] Melempar jala...",
      "🎣 [=====-] 25%",
      "🎣 [===---] 50%",
      "🎣 [=-----] 75%",
      "🎣 [------] 🐟 Ikan Tangkap!",
    ],
    hasil: ["🐟 Mendapatkan Ikan Tuna!", "🐟 +15 Ikan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🎣 Nelayan Hebat!", "🐠 Jangkauan jala +50%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 450.000", "📦 Bonus: Ikan Salmon x8"],
    status: "🎣 Nelayan",
  },

  // ===== PROFESI: KANTOR (Office Worker) =====
  kantor: {
    kerja: [
      "💻 [=====] Mengetik laporan...",
      "💻 [=====-] 25%",
      "💻 [===---] 50%",
      "💻 [=-----] 75%",
      "💻 [------] 📄 Laporan Selesai!",
    ],
    hasil: ["📄 Laporan Tahunan Selesai!", "📄 +5 Dokumen"],
    naikLevel: ["⬆️ *LEVEL UP!*", "💼 Manager!", "📊 Gaji naik 50%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 8.000.000", "📦 Bonus: THR x1"],
    status: "💻 Office Worker",
  },

  // ===== PROFESI: DOKTER =====
  dokter: {
    kerja: [
      "🏥 [=====] Memeriksa pasien...",
      "🏥 [=====-] 25%",
      "🏥 [===---] 50%",
      "🏥 [=-----] 75%",
      "🏥 [------] 💊 Pasien Sembuh!",
    ],
    hasil: ["💊 Pasien sembuh total!", "💊 +10 Kesehatan Masyarakat"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🩺 Spesialis!", "💉 Akurasi diagnosa +20%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 12.000.000", "📦 Bonus: Alat Medis canggih"],
    status: "🩺 Dokter",
  },

  // ===== PROFESI: GURU =====
  guru: {
    kerja: [
      "📚 [=====] Mengajar...",
      "📚 [=====-] 25%",
      "📚 [===---] 50%",
      "📚 [=-----] 75%",
      "📚 [------] 🎓 Murid Paham!",
    ],
    hasil: ["🎓 10 Murid Lulus!", "📚 +50 Ilmu Pengetahuan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "👨‍🏫 Kepala Sekolah!", "📝 Metode mengajar baru"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 5.000.000", "📦 Bonus: Buku Pelajaran x20"],
    status: "👨‍🏫 Guru",
  },

  // ===== PROFESI: POLISI =====
  polisi: {
    kerja: [
      "👮 [=====] Patroli...",
      "👮 [=====-] 25%",
      "👮 [===---] 50%",
      "👮 [=-----] 75%",
      "👮 [------] 🚨 Penjahat Tertangkap!",
    ],
    hasil: ["🚨 +10 Keamanan Kota", "👮 Penjahat ditangkap"],
    naikLevel: ["⬆️ *LEVEL UP!*", "👮‍♂️ Kapolsek!", "⭐ Prestasi +100"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 7.000.000", "📦 Bonus: Penghargaan Presiden"],
    status: "👮‍♂️ Polisi",
  },

  // ===== PROFESI: PILOT =====
  pilot: {
    kerja: [
      "✈️ [=====] Menerbangkan...",
      "✈️ [=====-] 25%",
      "✈️ [===---] 50%",
      "✈️ [=-----] 75%",
      "✈️ [------] 🛬 Mendarat Mulus!",
    ],
    hasil: ["🛬 Penerbangan berhasil!", "✈️ +500 Km Jarak Tempuh"],
    naikLevel: ["⬆️ *LEVEL UP!*", "👨‍✈️ Kapten Pilot!", "🌍 Rute internasional terbuka"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 25.000.000", "📦 Bonus: Tiket pesawat x5"],
    status: "👨‍✈️ Pilot",
  },

  // ===== PROFESI: CHEF =====
  chef: {
    kerja: [
      "🍳 [=====] Memasak...",
      "🍳 [=====-] 25%",
      "🍳 [===---] 50%",
      "🍳 [=-----] 75%",
      "🍳 [------] 🍝 Hidangan Siap!",
    ],
    hasil: ["🍝 5 Porsi Hidangan", "⭐ Rating: 5 Bintang"],
    naikLevel: ["⬆️ *LEVEL UP!*", "👨‍🍳 Head Chef!", "🔥 Resep baru terbuka"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 10.000.000", "📦 Bonus: Peralatan Masak Premium"],
    status: "👨‍🍳 Chef",
  },

  // ===== PROFESI: PROGRAMMER =====
  programmer: {
    kerja: [
      "💻 [=====] Coding...",
      "💻 [=====-] 25%",
      "💻 [===---] 50%",
      "💻 [=-----] 75%",
      "💻 [------] 🐛 Bug Fix!",
    ],
    hasil: ["🐛 20 Bug terfix!", "📦 Deploy sukses"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🧑‍💻 Senior Developer!", "☕ Kopi + stamina 100%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 15.000.000", "📦 Bonus: Laptop baru"],
    status: "🧑‍💻 Programmer",
  },

  // ══════════ JOB RPG LAMA — frame bertema sendiri ══════════

  // ===== JOB: PEMULA =====
  novice: {
    kerja: [
      "🧹 [=====] Membersihkan halaman...",
      "🧹 [=====-] 25%",
      "🧹 [===---] 50%",
      "🧹 [=-----] 75%",
      "🧹 [------] ✨ Halaman Berkilau!",
    ],
    hasil: ["✨ Halaman bersih total!", "🧹 +3 Poin Kerajinan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🧹 Pekerja Teladan!", "🌟 Gaji osis +10%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 150.000", "📦 Bonus: Sarung Tangan x1"],
    status: "🧹 Pemula",
  },

  // ===== JOB: PETARUNG =====
  warrior: {
    kerja: [
      "⚔️ [=====] Berpatroli desa...",
      "⚔️ [=====-] 25%",
      "⚔️ [===---] 50%",
      "⚔️ [=-----] 75%",
      "⚔️ [------] 🛡️ Desa Aman!",
    ],
    hasil: ["🛡️ Desa aman terkendali!", "⚔️ +5 Poin Keamanan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "⚔️ Panglima Perang!", "💪 Kekuatan serang +15%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 700.000", "📦 Bonus: Pedas Latihan x1"],
    status: "⚔️ Petarung",
  },

  // ===== JOB: PENYIHIR =====
  mage: {
    kerja: [
      "🔮 [=====] Meneliti mantra...",
      "🔮 [=====-] 25%",
      "🔮 [===---] 50%",
      "🔮 [=-----] 75%",
      "🔮 [------] ✨ Mantra Baru Dikuasai!",
    ],
    hasil: ["📜 Mantra dicatat di grimoire!", "🔮 +5 Biji Mana"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🔮 Penyihir Agung!", "⚡ Kekuatan mantra +25%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 900.000", "📦 Bonus: Kristal Mana x3"],
    status: "🔮 Penyihir",
  },

  // ===== JOB: PEMANAH =====
  archer: {
    kerja: [
      "🏹 [=====] Berburu hama...",
      "🏹 [=====-] 25%",
      "🏹 [===---] 50%",
      "🏹 [=-----] 75%",
      "🏹 [------] 🎯 Sasar Tepat!",
    ],
    hasil: ["🎯 Semua hama terusir!", "🏹 +5 Anak Panah"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🏹 Penembak Jalur!", "🎯 Akurasi +20%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 650.000", "📦 Bonus: Panah Perak x10"],
    status: "🏹 Pemanah",
  },

  // ===== JOB: PEMBUNUH =====
  assassin: {
    kerja: [
      "🗡️ [=====] Misi penyamaran...",
      "🗡️ [=====-] 25%",
      "🗡️ [===---] 50%",
      "🗡️ [=-----] 75%",
      "🗡️ [------] 🌙 Target Selesai!",
    ],
    hasil: ["🌙 Target beres tanpa jejak!", "🗡️ +3 Poin Intel"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🗡️ Assassin Legend!", "🌑 Mode senyap +30%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 2.000.000", "📦 Bonus: Jubah Bayangan x1"],
    status: "🗡️ Pembunuh",
  },

  // ===== JOB: TANK =====
  tank: {
    kerja: [
      "🛡️ [=====] Menjaga gerbang...",
      "🛡️ [=====-] 25%",
      "🛡️ [===---] 50%",
      "🛡️ [=-----] 75%",
      "🛡️ [------] 🏰 Gerbang Terkunci Rapat!",
    ],
    hasil: ["🏰 Gerbang kota aman!", "🛡️ +8 Poin Pertahanan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🛡️ Benteng Berjalan!", "💪 HP +10%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 800.000", "📦 Bonus: Perisai Baja x1"],
    status: "🛡️ Tank",
  },

  // ===== JOB: TABIB =====
  healer: {
    kerja: [
      "💊 [=====] Mengobati penduduk...",
      "💊 [=====-] 25%",
      "💊 [===---] 50%",
      "💊 [=-----] 75%",
      "💊 [------] 🌿 Semua Pasien Pulih!",
    ],
    hasil: ["🌿 Ramuan habis terjual!", "💊 +10 Poin Kebaikan"],
    naikLevel: ["⬆️ *LEVEL UP!*", "💊 Tabib Kehormatan!", "🌿 Efek ramuan +35%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 850.000", "📦 Bonus: Herba Langka x5"],
    status: "💊 Tabib",
  },

  // ===== JOB: BERSERKER =====
  berserker: {
    kerja: [
      "🪓 [=====] Bertarung arena...",
      "🪓 [=====-] 25%",
      "🪓 [===---] 50%",
      "🪓 [=-----] 75%",
      "🪓 [------] 🏆 Arena Dikuasai!",
    ],
    hasil: ["🏆 Juara arena hari ini!", "🪓 +6 Poin Brutal"],
    naikLevel: ["⬆️ *LEVEL UP!*", "🪓 Raksasa Arena!", "🔥 Damage kritikal +20%"],
    gajian: ["💰 *GAJIAN!*", "💵 Rp 1.500.000", "📦 Bonus: Kapak Runcing x1"],
    status: "🪓 Berserker",
  },
};

/**
 * Ambil nominal gajian Rp dari flavor gajian profesi.
 * "💵 Rp 500.000" → 500000. Dipakai .kerja buat bayar UANG ASLI (cash).
 */
export function gajianCash(key) {
  const prof = PROFESI_ANIMATIONS[key];
  if (!prof?.gajian?.[1]) return 0;
  const m = String(prof.gajian[1]).match(/Rp\s*([\d.,]+)/);
  if (!m) return 0;
  return Math.floor(Number(m[1].replace(/\./g, "").replace(/,/g, "")) || 0);
}

/**
 * Animasi kerja per-profesi — tiap pilihan punya frame sendiri.
 * Frame pertama bisa diisi aktivitas dinamis (dipakai job RPG lama
 * biar variasi tiap kali kerja) — kalau activity kosong, frame asli
 * profesi dipakai utuh.
 */
export async function animProfesi(m, sock, key, { activity = "", delay = 3000 } = {}) {
  const prof = PROFESI_ANIMATIONS[key] || PROFESI_ANIMATIONS.novice;
  let frames = [...prof.kerja];
  if (activity) {
    const emoji = frames[0].split(" ")[0];
    frames[0] = `${emoji} [=====] ${activity}...`;
  }
  const title = (prof.status || "").replace(/^[^ ]+ /, "").toLowerCase() || "kerja";
  await rpgScene(m, sock, frames, delay, title);
}
