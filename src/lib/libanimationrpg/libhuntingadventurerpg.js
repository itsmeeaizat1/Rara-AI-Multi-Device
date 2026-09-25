// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libhuntingadventurerpg.js — LIB ANIMASI khusus Hunting Adventure / berburu (owner 25 Sep 2026)
// Crosshair: 🎯 merayap ke jejak 🐾 lalu TERKUNCI.
// KHUSUS berburu (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { monsterName }
export function scopeFrames({ monsterName }) {
  const SCW = 10;
  const target = 3 + Math.floor(Math.random() * 4);
  return Array.from({ length: 5 }, (_, f) => {
    const pos = Math.round((target * f) / 4);
    const row = Array.from({ length: SCW }, (_, i) =>
      i === target ? "🐾" : i === pos ? "🎯" : "🟩");
    const lock = f === 4;
    return "```\n🔍 BURU " + String(monsterName || "SASARAN").toUpperCase() + (lock ? " — 🎯 SASARAN TERKUNCI!" : "") + "\n" + row.join("") + "\n```";
  });
}

export async function playScopeAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, scopeFrames(ctx), {}); }
  catch (e) { console.error("[anim-berburu] gagal (dilewati senyap):", e?.message || e); return false; }
}
