// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// messages.js — Template pesan bot (wait, error, ownerOnly, dll) + groupProtection

export const errorTemplate = `「 ✦ ⚠️ Kendala ✦ 」\nPerintah \`{prefix}{command}\` lagi bermasalah\nCoba lagi nanti ya, {pushName}\nMasih error? Hubungi owner bot`;

export const messages = {
  wait: "「 ✦ 🕕 Sedang Diproses ✦ 」\nSabar ya, lagi dikerjakan\nJangan spam ya bestie",
  success: "「 ✦ ✅ Berhasil ✦ 」\nPermintaan kamu selesai\nAda lagi yang bisa dibantu?",
  error: "「 ✦ ⚠️ Error ✦ 」\nAda masalah di sistem\nCoba lagi beberapa saat\nMasih error? Lapor owner",

  ownerOnly: "「 ✦ 🚫 Akses Ditolak ✦ 」\nFitur ini cuma buat Owner\nJangan maksa ya",
  premiumOnly:
    "「 ✦ 💎 Premium Only ✦ 」\nFitur ini khusus member Premium\nMau upgrade? Ketik .benefitpremium",

  groupOnly: "「 ✦ 👥 Group Only ✦ 」\nFitur ini cuma jalan di grup\nPindah ke grup dulu ya",
  privateOnly:
    "「 ✦ 📱 Private Only ✦ 」\nFitur ini cuma jalan di chat pribadi\nChat bot langsung ya",

  adminOnly:
    "「 ✦ 👮 Admin Only ✦ 」\nKamu harus jadi Admin grup\nbuat pakai fitur ini",
  botAdminOnly:
    "「 ✦ 🤖 Bot Bukan Admin ✦ 」\nJadikan bot Admin dulu\nbiar bisa ngerjain fitur ini",

  cooldown:
    "「 ✦ 🕕 Cooldown ✦ 」\nSabar, tunggu %time% detik\nsebelum pakai lagi",
  energiExceeded:
    "「 ✦ ⚡ Energi Habis ✦ 」\nEnergi kamu habis hari ini\nReset besok atau\nupgrade Premium buat unlimited",
  limitDeducted:
    "「 ✦ 🔋 Limit ✦ 」\nLimit berkurang {amount}\nSisa limit: {sisa}",

  banned:
    "「 ✦ 🚫 Diblokir ✦ 」\nKamu lagi gak bisa pakai bot\nkarena melanggar aturan\nHubungi owner buat appeal",

  rejectCall: "「 ✦ 📞 Ditolak ✦ 」\nJangan telepon nomor bot\nChat aja ya",
  callInfo: "「 ✦ 📞 Panggilan Diterima ✦ 」\nMaaf, saya bot dan belum bisa mengangkat telepon.\nTapi kita bisa ngobrol! Kirim pesan suara (voice note), nanti saya jawab pakai suara juga.",
};

// Semua pesan groupProtection ini fallback ke GP_DEFAULTS di
// src/lib/rara-group-protection.js kalau key-nya gak diisi di sini.
// Cukup ubah di SINI kalau mau custom teks — jangan ubah di plugin manapun.
export const groupProtection = {
  // Owner rule: pesan anti-* OTOMATIS saat pelanggaran = plain text natural
  // tapi MENDAETAIL ala auto-broadcast: judul bold + Label: value + waktu WIB.
  // %time% auto-isi oleh gpMsg(). Cukup ubah di SINI — jangan di plugin.
  antilink: "*ANTI LINK — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link terlarang\nTindakan: Pesan dihapus\nWaktu: %time%\n\nLink tidak diperbolehkan di grup ini.",
  antilinkKick: "*ANTI LINK — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link terlarang\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nLink tidak diperbolehkan di grup ini.",
  antilinkGc: "*ANTI LINK WA — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link grup WhatsApp\nTindakan: Pesan dihapus\nWaktu: %time%\n\nLink grup WhatsApp tidak diperbolehkan di grup ini.",
  antilinkGcKick: "*ANTI LINK WA — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link grup WhatsApp\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nLink grup WhatsApp tidak diperbolehkan di grup ini.",
  antilinkAll: "*ANTI LINK — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link\nTindakan: Pesan dihapus\nWaktu: %time%\n\nSemua jenis link tidak diperbolehkan di grup ini.",
  antilinkAllKick: "*ANTI LINK — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim link\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nSemua jenis link tidak diperbolehkan di grup ini.",
  antitagsw: "*ANTI TAG SW — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Menandai status (tag SW)\nTindakan: Pesan dihapus\nWaktu: %time%\n\nTag status tidak diperbolehkan di grup ini.",
  antiswgc: "*ANTI SW GROUP — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim status grup (%type%)\nTindakan: Pesan dihapus\nWaktu: %time%\n\nStatus grup tidak diperbolehkan di grup ini.",
  antijudol: "*ANTI JUDOL — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim konten perjudian online\nTindakan: Pesan dihapus\nWaktu: %time%\n\nKonten judol dilarang keras di grup ini.",
  antijudolKick: "*ANTI JUDOL — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim konten perjudian online\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nKonten judol dilarang keras di grup ini.",
  antiphising: "*ANTI PHISING — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim konten phising / penipuan\nTindakan: Pesan dihapus\nWaktu: %time%\n\nKonten phising dilarang keras di grup ini.",
  antiphisingKick: "*ANTI PHISING — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim konten phising / penipuan\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nKonten phising dilarang keras di grup ini.",
  anticustom: "*ANTI CUSTOM — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Melanggar aturan \"%rule%\"\nTindakan: Pesan dihapus\nWaktu: %time%\n\nPatuhi aturan yang berlaku di grup ini.",
  anticustomKick: "*ANTI CUSTOM — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Melanggar aturan \"%rule%\"\nTindakan: Pesan dihapus + dikeluarkan dari grup\nWaktu: %time%\n\nPatuhi aturan yang berlaku di grup ini.",
  antiviewonce: "*ANTI VIEW ONCE — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim media sekali lihat (view once)\nTindakan: Media dibuka otomatis\nWaktu: %time%\n\nMedia sekali lihat tidak diperbolehkan di grup ini.",
  antiremove: "*ANTI DELETE — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Menghapus pesan\nTindakan: Isi pesan dipulihkan di bawah\nWaktu: %time%\n\nMenghapus pesan tidak mencegah isi terlihat di grup ini.",
  antihidetag: "*ANTI HIDETAG — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim hidetag (mention tersembunyi)\nTindakan: Pesan dihapus\nWaktu: %time%\n\nHidetag tidak diperbolehkan di grup ini.",
  antitoxicWarn: "*ANTI TOXIC — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Berkata kasar (toxic)\nTindakan: Pesan dihapus\nPeringatan: %warn% dari %max%\nWaktu: %time%\n\nPeringatan %warn% dari %max%. Setelah habis kamu akan di-%method% dari grup.",
  antitoxicAction: "*ANTI TOXIC — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Berkata kasar (toxic)\nTindakan: Di-%method% dari grup\nTotal: %max% peringatan\nWaktu: %time%\n\nKamu di-%method% karena toxic sebanyak %max% kali.",
  antidocument: "*ANTI DOCUMENT — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim dokumen\nTindakan: Pesan dihapus\nWaktu: %time%\n\nDokumen tidak diperbolehkan di grup ini.",
  antisticker: "*ANTI STICKER — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim stiker\nTindakan: Pesan dihapus\nWaktu: %time%\n\nStiker tidak diperbolehkan di grup ini.",
  antimedia: "*ANTI MEDIA — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim media\nTindakan: Pesan dihapus\nWaktu: %time%\n\nMedia tidak diperbolehkan di grup ini.",
  antifoto: "*ANTI FOTO — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim foto\nTindakan: Pesan dihapus\nWaktu: %time%\n\nFoto tidak diperbolehkan di grup ini.",
  antivideo: "*ANTI VIDEO — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim video\nTindakan: Pesan dihapus\nWaktu: %time%\n\nVideo tidak diperbolehkan di grup ini.",
  antivn: "*ANTI VN — PERINGATAN*\n\nPengirim: @%user%\nPelanggaran: Mengirim voice note\nTindakan: Pesan dihapus\nWaktu: %time%\n\nVoice note tidak diperbolehkan di grup ini.",
  antibot: "*ANTI BOT — TINDAKAN*\n\nPengirim: @%user%\nPelanggaran: Terdeteksi sebagai akun bot\nTindakan: Dikeluarkan dari grup\nWaktu: %time%\n\nHanya manusia yang diperbolehkan chat di grup ini.",
  notAdmin: "*ANTI BOT — INFO*\n\nPengirim: @%user%\nPelanggaran: Akun bot terdeteksi\nTindakan: Tidak dieksekusi — bot bukan admin\nWaktu: %time%\n\nJadikan bot admin agar tindakan bisa dijalankan.",
};