// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
//
// rara-sewa-premium.js — Auto-grant Premium untuk nomor penyewa (26 Sep 2026)
// Kebijakan owner: saat sewa SUKSES, nomor yang MENYEWA otomatis dapat Premium
// gratis mengikuti durasi sewa. Premium CUMA untuk nomor penyewa —
// BUKAN semua member grup, BUKAN admin grup.
// Dipakai oleh: plugins/owner/approvesewa.js · plugins/owner/renewsewa.js · plugins/owner/addsewa.js
// Grant gagal TIDAK boleh membatalkan sewa — selalu try/catch, jujur di info.

import { addPremium, getPremiumInfo } from "./rara-premium-db.js";

/**
 * Konversi durasi sewa (string) → hari premium.
 * "30i" menit · "12h" jam · "7d" hari · "1m" bulan (30 hari) · "1y" tahun (365 hari) · "lifetime" permanen.
 * Durasi di bawah 1 hari dibulatkan ke 1 hari (premium minimum).
 */
export function sewaDurationToDays(str) {
  const s = String(str || "").toLowerCase().trim();
  if (["lifetime", "permanent", "forever", "unlimited"].includes(s)) return 36500;
  const m = s.match(/^(\d+)([ihdmy])$/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case "i": return Math.max(1, Math.ceil(n / 1440));
    case "h": return Math.max(1, Math.ceil(n / 24));
    case "d": return n;
    case "m": return n * 30;
    case "y": return n * 365;
    default: return 0;
  }
}

/**
 * Grant/extend Premium untuk penyewa.
 * Kalau nomor sudah premium & belum expired → durasi DITAMBAH di atas sisa waktu (addPremium handles).
 * Return { ok, days, extended, message, expiredAt } — ok:false bukan alasan batal sewa.
 */
export function grantSewaPremium(jid, durationStr, name) {
  try {
    const days = sewaDurationToDays(durationStr);
    if (!jid || !days) return { ok: false, reason: "invalid" };
    const before = getPremiumInfo(jid);
    const res = addPremium(jid, days, name || "Penyewa Bot");
    return {
      ok: true,
      days,
      extended: Boolean(before),
      message: res?.message || `Premium ${days} hari`,
      expiredAt: res?.expiredAt || null,
    };
  } catch (e) {
    console.error("[rara-sewa-premium.js]:", e.message);
    return { ok: false, reason: "error" };
  }
}
