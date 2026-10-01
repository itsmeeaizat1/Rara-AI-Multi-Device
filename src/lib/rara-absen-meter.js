// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// METER KEHADIRAN ABSEN (13 Sep 2026, variasi fitur polos batch 4)
// ".absen list doang gak ada progress" — kartu .absen & .cekabsen
// sekarang: bar ▰▱ + persen kehadiran (peserta / total anggota grup),
// + perayaan pas 100%.
// ═══════════════════════════════════════════════════════════════════

/**
 * Meter kehadiran sesi absen.
 * @returns {{pct, bar, allDone, lines: string[]}|null} — null kalau total gak valid
 */
export function buildAbsenMeter(hadir, total) {
  const h = Number(hadir) || 0;
  const t = Number(total) || 0;
  if (t <= 0 || h < 0) return null;
  const pct = Math.min(100, Math.round((h / t) * 100));
  const filled = Math.min(10, Math.floor((h / t) * 10));
  const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
  const allDone = h >= t;
  const lines = [
    `📊 Kehadiran: *${h}/${t}* anggota`,
    `${bar} ${pct}%`,
  ];
  if (allDone) lines.push(`🎉 *SEMUA ANGGOTA SUDAH HADIR!*`);
  return { pct, bar, allDone, lines };
}

/** Total anggota grup (fail-safe → null kalau metadata gak kebaca). */
export async function countGroupMembers(sock, chatId) {
  try {
    const meta = await sock.groupMetadata(chatId);
    const n = meta?.participants?.length || 0;
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}
