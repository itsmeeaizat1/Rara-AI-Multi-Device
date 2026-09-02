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
  antilink: "╭─「 ✦ Antilink ✦ 」\n│ @%user% mengirim link\n│ Pesan sudah dihapus\n╰────  •  ────",
  antilinkKick: "╭─「 ✦ Antilink ✦ 」\n│ @%user% di-kick\n│ karena mengirim link\n╰────  •  ────",
  antilinkGc: "╭─「 ✦ AntiLink WA ✦ 」\n│ @%user% mengirim link WA\n│ Pesan sudah dihapus\n╰────  •  ────",
  antilinkGcKick: "╭─「 ✦ AntiLink WA ✦ 」\n│ @%user% di-kick\n│ karena mengirim link WA\n╰────  •  ────",
  antilinkAll: "╭─「 ✦ Antilink ✦ 」\n│ @%user% mengirim link\n│ Pesan sudah dihapus\n╰────  •  ────",
  antilinkAllKick: "╭─「 ✦ Antilink ✦ 」\n│ @%user% di-kick\n│ karena mengirim link\n╰────  •  ────",
  antitagsw: "╭─「 ✦ AntiTagSW ✦ 」\n│ Tag status dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antiswgc: "╭─「 ✦ AntiSWGC ✦ 」\n│ SW group type *%type%*\n│ dari @%user% sudah dihapus\n╰────  •  ────",
  antijudol: "╭─「 ✦ AntiJudol ✦ 」\n│ @%user% terdeteksi kirim konten judol\n│ Pesan sudah dihapus\n╰────  •  ────",
  antijudolKick: "╭─「 ✦ AntiJudol ✦ 」\n│ @%user% di-kick\n│ karena kirim konten judol\n╰────  •  ────",
  antiphising: "╭─「 ✦ AntiPhising ✦ 」\n│ @%user% terdeteksi kirim konten phising\n│ Pesan sudah dihapus\n╰────  •  ────",
  antiphisingKick: "╭─「 ✦ AntiPhising ✦ 」\n│ @%user% di-kick\n│ karena kirim konten phising\n╰────  •  ────",
  anticustom: "╭─「 ✦ AntiCustom ✦ 」\n│ @%user% melanggar rule custom *%rule%*\n│ Pesan sudah dihapus\n╰────  •  ────",
  anticustomKick: "╭─「 ✦ AntiCustom ✦ 」\n│ @%user% di-kick\n│ karena melanggar rule custom *%rule%*\n╰────  •  ────",
  antiviewonce: "╭─「 ✦ ViewOnce ✦ 」\n│ Media sekali lihat dari @%user%\n╰────  •  ────",
  antiremove: "╭─「 ✦ AntiDelete ✦ 」\n│ @%user% menghapus pesan\n╰────  •  ────",
  antihidetag: "╭─「 ✦ AntiHidetag ✦ 」\n│ Hidetag dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antitoxicWarn: "╭─「 ✦ Peringatan ✦ 」\n│ @%user% berkata kasar\n│ Warn %warn%/%max%, selanjutnya di-%method%\n╰────  •  ────",
  antitoxicAction: "╭─「 ✦ AntiToxic ✦ 」\n│ @%user% di-%method%\n│ karena toxic (%warn%/%max%)\n╰────  •  ────",
  antidocument: "╭─「 ✦ AntiDocument ✦ 」\n│ Dokumen dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antisticker: "╭─「 ✦ AntiSticker ✦ 」\n│ Sticker dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antimedia: "╭─「 ✦ AntiMedia ✦ 」\n│ Media dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antifoto: "╭─「 ✦ AntiFoto ✦ 」\n│ Foto dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antivideo: "╭─「 ✦ AntiVideo ✦ 」\n│ Video dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antivn: "╭─「 ✦ AntiVN ✦ 」\n│ Voice note dari @%user%\n│ sudah dihapus\n╰────  •  ────",
  antibot: "╭─「 ✦ AntiBot ✦ 」\n│ @%user% terdeteksi sebagai bot\n│ dan sudah di-kick\n╰────  •  ────",
  notAdmin: "╭─「 ✦ Bot Bukan Admin ✦ 」\n│ Bot bukan admin\n│ Tidak bisa menghapus pesan\n╰────  •  ────",
};
