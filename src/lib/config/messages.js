// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// messages.js — Template pesan bot (wait, error, ownerOnly, dll) + groupProtection

export const errorTemplate = `╭─「 ✦ ⚠️ Kendala ✦ 」\n│ Perintah \`{prefix}{command}\` lagi bermasalah\n│ Coba lagi nanti ya, {pushName}\n│ Masih error? Hubungi owner bot\n╰────  •  ────`;

export const messages = {
  wait: "╭─「 ✦ 🕕 Sedang Diproses ✦ 」\n│ Sabar ya, lagi dikerjakan\n│ Jangan spam ya bestie\n╰────  •  ────",
  success: "╭─「 ✦ ✅ Berhasil ✦ 」\n│ Permintaan kamu selesai\n│ Ada lagi yang bisa dibantu?\n╰────  •  ────",
  error: "╭─「 ✦ ⚠️ Error ✦ 」\n│ Ada masalah di sistem\n│ Coba lagi beberapa saat\n│ Masih error? Lapor owner\n╰────  •  ────",

  ownerOnly: "╭─「 ✦ 🚫 Akses Ditolak ✦ 」\n│ Fitur ini cuma buat Owner\n│ Jangan maksa ya\n╰────  •  ────",
  premiumOnly:
    "╭─「 ✦ 💎 Premium Only ✦ 」\n│ Fitur ini khusus member Premium\n│ Mau upgrade? Ketik .benefitpremium\n╰────  •  ────",

  groupOnly: "╭─「 ✦ 👥 Group Only ✦ 」\n│ Fitur ini cuma jalan di grup\n│ Pindah ke grup dulu ya\n╰────  •  ────",
  privateOnly:
    "╭─「 ✦ 📱 Private Only ✦ 」\n│ Fitur ini cuma jalan di chat pribadi\n│ Chat bot langsung ya\n╰────  •  ────",

  adminOnly:
    "╭─「 ✦ 👮 Admin Only ✦ 」\n│ Kamu harus jadi Admin grup\n│ buat pakai fitur ini\n╰────  •  ────",
  botAdminOnly:
    "╭─「 ✦ 🤖 Bot Bukan Admin ✦ 」\n│ Jadikan bot Admin dulu\n│ biar bisa ngerjain fitur ini\n╰────  •  ────",

  cooldown:
    "╭─「 ✦ 🕕 Cooldown ✦ 」\n│ Sabar, tunggu %time% detik\n│ sebelum pakai lagi\n╰────  •  ────",
  energiExceeded:
    "╭─「 ✦ ⚡ Energi Habis ✦ 」\n│ Energi kamu habis hari ini\n│ Reset besok atau\n│ upgrade Premium buat unlimited\n╰────  •  ────",
  limitDeducted:
    "╭─「 ✦ 🔋 Limit ✦ 」\n│ Limit berkurang {amount}\n│ Sisa limit: {sisa}\n╰────  •  ────",

  banned:
    "╭─「 ✦ 🚫 Diblokir ✦ 」\n│ Kamu lagi gak bisa pakai bot\n│ karena melanggar aturan\n│ Hubungi owner buat appeal\n╰────  •  ────",

  rejectCall: "╭─「 ✦ 📞 Ditolak ✦ 」\n│ Jangan telepon nomor bot\n│ Chat aja ya\n╰────  •  ────",
};

// Semua pesan groupProtection ini fallback ke GP_DEFAULTS di
// src/lib/nova-group-protection.js kalau key-nya gak diisi di sini.
// Cukup ubah di SINI kalau mau custom teks — jangan ubah di plugin manapun.
export const groupProtection = {
  // Owner rule: pesan anti-* otomatis saat pelanggaran = PLAIN TEXT natural
  // (tanpa box-drawing & tanpa smallcaps) — bukan menu / reply command.
  // Cukup ubah di SINI kalau mau custom teks — jangan ubah di plugin manapun.
  antilink: "Anti Link\n@%user% mengirim link — pesan sudah dihapus",
  antilinkKick: "Anti Link\n@%user% di-kick karena mengirim link",
  antilinkGc: "Anti Link WA\n@%user% mengirim link WA — pesan sudah dihapus",
  antilinkGcKick: "Anti Link WA\n@%user% di-kick karena mengirim link WA",
  antilinkAll: "Anti Link\n@%user% mengirim link — pesan sudah dihapus",
  antilinkAllKick: "Anti Link\n@%user% di-kick karena mengirim link",
  antitagsw: "Anti Tag SW\nTag status dari @%user% sudah dihapus",
  antiswgc: "Anti SW Group\nSW group type %type% dari @%user% sudah dihapus",
  antijudol: "Anti Judol\n@%user% terdeteksi kirim konten judol — pesan sudah dihapus",
  antijudolKick: "Anti Judol\n@%user% di-kick karena kirim konten judol",
  antiphising: "Anti Phising\n@%user% terdeteksi kirim konten phising — pesan sudah dihapus",
  antiphisingKick: "Anti Phising\n@%user% di-kick karena kirim konten phising",
  anticustom: "Anti Custom\n@%user% melanggar rule custom \"%rule%\" — pesan sudah dihapus",
  anticustomKick: "Anti Custom\n@%user% di-kick karena melanggar rule custom \"%rule%\"",
  antiviewonce: "Anti ViewOnce\nMedia sekali lihat dari @%user% dibuka otomatis",
  antiremove: "Anti Delete\n@%user% menghapus pesan",
  antihidetag: "Anti Hidetag\nHidetag dari @%user% sudah dihapus",
  antitoxicWarn: "Anti Toxic\n@%user% berkata kasar — warn %warn%/%max%, selanjutnya di-%method%",
  antitoxicAction: "Anti Toxic\n@%user% di-%method% karena toxic (%warn%/%max%)",
  antidocument: "Anti Document\nDokumen dari @%user% sudah dihapus",
  antisticker: "Anti Sticker\nSticker dari @%user% sudah dihapus",
  antimedia: "Anti Media\nMedia dari @%user% sudah dihapus",
  antifoto: "Anti Foto\nFoto dari @%user% sudah dihapus",
  antivideo: "Anti Video\nVideo dari @%user% sudah dihapus",
  antivn: "Anti VN\nVoice note dari @%user% sudah dihapus",
  antibot: "Anti Bot\n@%user% terdeteksi sebagai bot dan sudah di-kick",
  notAdmin: "Anti Bot\nBot bukan admin — tidak bisa menghapus pesan",
};
