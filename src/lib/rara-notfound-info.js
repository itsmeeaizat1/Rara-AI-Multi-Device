// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Simple not-found reply — suggestion only, NO info section
// Info section hanya untuk menu/allmenu/allmenucategory
// REWORK 17 Sep 2026 (owner: "pesan di handler yg pakai drawing box, hapus
// garisnya") — header 「 ✦ 」, body polos tanpa drawing box.
// RINGKAS 5 Okt 2026 (owner: "biar enak dilihat, diringkas/sesuaikan
// kalimatnya") — maks 3 baris inti per level, kalimat natural.

import config from "../../config.js";
import { raraWrap, toSC } from "./rara-menu-style.js";

/**
 * Build not-found reply (line-free, tanpa drawing box)
 */
export async function buildNotFoundReply(m, ctx, command, closest, level, totalHits) {
  const botConfig = ctx?.config || config;
  const prefix = botConfig?.command?.prefix || ".";
  const smartEnabled = botConfig?.features?.commandSuggestionSmart !== false;
  if (!smartEnabled) level = 0;

  // REVISI OWNER 5 Okt 2026: diringkas biar enak dibaca — maks 3 baris inti
  // per level, kalimat natural, teks biasa (bukan smallcaps), "Perintah" biar konsisten Indonesia.
  const lines = [];

  const saran = closest ? `\uD83E\uDD14 Mungkin maksudmu: *${prefix}${closest}*?` : null;
  const tipAI = `\uD83D\uDCA1 Bingung? Tanya AI: *${prefix}tanyaai <apa yang kamu cari>*`;
  const tipMenu = `\uD83D\uDCA1 Cek daftar lengkap: *${prefix}menu*`;

  if (level === 0) {
    lines.push(`Perintah *${prefix}${command}* tidak ditemukan`);
    lines.push("");
    if (saran) { lines.push(saran); lines.push(""); }
    lines.push(tipAI);
  } else if (level === 1) {
    lines.push(`*${prefix}${command}* tidak ditemukan — sudah ${totalHits}x salah ketik dalam 1 menit \uD83D\uDE05`);
    lines.push("");
    if (saran) { lines.push(saran); lines.push(""); }
    lines.push(tipMenu);
  } else if (level === 2) {
    lines.push(`Sudah ${totalHits}x perintah gak ketemu — cek daftar fitur dulu ya: *${prefix}menu*`);
    lines.push("");
    lines.push(`\uD83D\uDCA1 Gak ada di menu? Tanya AI: *${prefix}tanyaai*`);
  } else if (level === 4) {
    lines.push(`\uD83D\uDE35 Udah ${totalHits}x salah terus — daripada nebak, langsung tanya AI:`);
    lines.push("");
    lines.push(`*${prefix}tanyaai <apa yang kamu cari>*`);
    lines.push("");
    lines.push(tipMenu);
  }

  return raraWrap("Tidak Ditemukan", lines);
}
