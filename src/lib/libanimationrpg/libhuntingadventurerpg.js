// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libhuntingadventurerpg.js — LIB ANIMASI EMOJI-GRID khusus Hunting Adventure / berburu
// (upgrade owner 28 Sep 2026: cutscene 2 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD (BURU <sasaran> · terkunci di frame akhir) · baris crosshair (🎯 merayap ke jejak 🐾,
// frame terkunci 🎯 nempel 🐾) · adegan rimba (🌲🌿 + siluet fauna, makin dekat makin intens) · status aksi.
// Kontekstual: nama sasaran dari ctx (per hewan beda), jejak makin jelas, frame akhir impact 💥 TERKUNCI.
// KHUSUS berburu (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { monsterName }
export function scopeFrames({ monsterName }) {
  const SCW = 10;
  const target = 3 + Math.floor(Math.random() * 4);
  const NAMA = String(monsterName || "SASARAN").toUpperCase();
  const frames = [];
  for (let f = 0; f < 5; f++) {
    const lock = f === 4;
    const pos = lock ? target - 1 : Math.round((target * f) / 4);
    const row = Array.from({ length: SCW }, (_, i) =>
      i === target ? "🐾" : i === pos ? "🎯" : "🟩").join("");
    // adegan rimba: makin dekat makin intens, frame terkunci = impact 💥
    const adegan = lock
      ? "💥 🎯🐾 💥 JEJAK DITEMUKAN!"
      : f <= 1 ? "🌲 🌿 🌲 🦌 🌿"
      : f === 2 ? "🌲 🌿 👀 🦅 🌿"
      : "🌲 🫣 🐅 🌿 🌿";
    const status = lock ? "🎯 SASARAN TERKUNCI! 💥" : "RAYAP MENGURANGI JARAK… " + (f + 1) + "/4";
    frames.push("```\n🔍 BURU " + NAMA + (lock ? " — 🎯 TERKUNCI!" : "") + "\n" + row + "\n" + adegan + "\n" + status + "\n```");
  }
  return frames;
}

export async function playScopeAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, scopeFrames(ctx), {}); }
  catch (e) { console.error("[anim-berburu] gagal (dilewati senyap):", e?.message || e); return false; }
}
