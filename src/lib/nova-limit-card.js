// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// KARTU LIMIT + COUNTDOWN RESET HARIAN (13 Sep 2026, variasi fitur
// polos batch 4 — ".energi/.mylimit gak ada pelengkap kyk penghitung")
// Limit akses fitur di-reset scheduler dailyLimitReset tiap hari
// jam resetHour:resetMinute WIB — kartu sekarang dikasih meter
// terpakai + ticker live menuju reset (ala .afk/.jadwalsholat).
// ═══════════════════════════════════════════════════════════════════
import moment from "moment-timezone";
import { novaWrap } from "./nova-menu-style.js";
import { formatRemaining } from "./nova-countdown.js";
import { cekMeterBar } from "./nova-cek-anim.js";

/** Epoch reset limit berikutnya (WIB). Hari ini kalau belum lewat, besok kalau udah. */
export function computeNextResetTs(resetHour = 0, resetMinute = 0) {
  const h = Math.max(0, Math.min(23, Number(resetHour) || 0));
  const mm = Math.max(0, Math.min(59, Number(resetMinute) || 0));
  const now = moment.tz("Asia/Jakarta");
  const today = now.clone().hour(h).minute(mm).second(0).millisecond(0);
  if (today.valueOf() > Date.now()) return today.valueOf();
  return today.add(1, "days").valueOf();
}

/**
 * Kartu limit lengkap + baris countdown live (untuk initialCard/tickCard
 * runLiveTicker). remainingMs <= 0 → kartu "reset tiba".
 */
export function buildLimitCard(d) {
  const {
    title = "My Limit",
    name = "",
    status = "",
    sisa = 0,
    terpakai = null,
    total = null,
    resetTime = "00:00",
    remainingMs = 0,
    extra = [],
    footer = "",
    isUnlimited = false,
  } = d || {};

  const lines = [];
  if (name) lines.push(`👤 *${name}*`);
  if (status) lines.push(`🏷️ Status: *${status}*`);
  lines.push(`⚡ Sisa limit: *${isUnlimited ? "∞ Unlimited" : sisa}*`);
  if (!isUnlimited && terpakai !== null && total > 0) {
    lines.push(`📦 Terpakai: *${terpakai}/${total}*`);
    lines.push(`📊 ${cekMeterBar(Math.round((terpakai / total) * 100))}`);
  }
  for (const e of extra) if (e) lines.push(e);

  if (!isUnlimited) {
    if (Number(remainingMs) <= 0) {
      lines.push("");
      lines.push("♻️ *RESET HARIAN TIBA* — limit kamu kembali penuh!");
    } else {
      lines.push("");
      lines.push(`🕒 Limit direset dalam *${formatRemaining(remainingMs)}*`);
    }
    lines.push(`🕘 Reset pukul ${resetTime} WIB tiap hari`);
  }
  if (footer) {
    lines.push("");
    lines.push(footer);
  }
  return novaWrap(title, lines.join("\n"));
}
