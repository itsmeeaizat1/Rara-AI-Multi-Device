// RARA COMMAND SUGGEST (16 Sep 2026) — saran "maksudnya .X?" pas command typo.
// Gabungan DUA strategi biar makin akurat:
//   1. levenshtein (jarak edit <= 3) — typo ketik biasa (harlibur -> harlibur)
//   2. didyoumean (skor kemiripan relatif >= 70%) — nangkep typo yang lebih
//      jauh jaraknya tapi strukturnya masih mirip (haribsar -> haribesar).
// Murni & deterministik — aman di-import di mana aja (handler.js + e2e).

import didyoumean from "didyoumean";
import { levenshtein } from "./rara-middleware.js";

/**
 * Cari command yang paling mirip dengan input user.
 * @param {string} command - command typo (tanpa prefix, lowercase)
 * @param {string[]} allCommands - daftar semua command yang dikenal
 * @returns {string|null} command terdekat atau null kalau gak ada yang mirip
 */
export function suggestCommand(command, allCommands) {
  if (!command || !Array.isArray(allCommands) || !allCommands.length) return null;
  const cmd = String(command).toLowerCase();

  // strategi 1: levenshtein <= 3 (typo ketik biasa)
  let closest = null;
  let minDist = Infinity;
  for (const c of allCommands) {
    const dist = levenshtein(cmd, String(c).toLowerCase());
    if (dist < minDist && dist <= 3) {
      minDist = dist;
      closest = String(c);
    }
  }

  // strategi 2: didyoumean — skor kemiripan relatif >= 70%
  if (!closest) {
    try {
      const dym = didyoumean(cmd, allCommands.map((c) => String(c).toLowerCase()), {
        threshold: 0.7,
        thresholdType: "relative",
      });
      if (dym) closest = dym;
    } catch {}
  }

  return closest;
}
