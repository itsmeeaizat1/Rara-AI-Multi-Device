// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libadventurerpg.js — LIB ANIMASI khusus Adventure / petualangan (owner 25 Sep 2026)
// Peta kompas: 📍 menyusuri jalur landmark (LANDMARK dari ctx), kompas 🧭 berputar tiap frame.
// KHUSUS adventure (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { eventType, landmarks: [emoji...], arahs: [teks arah...] }
export function petaFrames({ eventType, landmarks, arahs }) {
  const LMAP = 10;
  const trail = "·";
  const LM = (landmarks && landmarks.length ? landmarks : ["🌲", "⛰️", "🏕️"]);
  const AR = (arahs && arahs.length ? arahs : ["TIMUR", "BARAT", "UTARA", "SELATAN"]);
  return Array.from({ length: 6 }, (_, f) => {
    const pos = Math.min(LMAP - 1, f * 2);
    const row = Array.from({ length: LMAP }, (_, i) =>
      i === pos ? "📍" : i === LMAP - 1 ? "🏕️" : i < pos ? trail : LM[(i + f) % LM.length]);
    return "```\n🧭 " + AR[f % AR.length] + " MENUJU " + String(eventType || "PETUALANGAN").toUpperCase() + "\n" + row.join("") + "\n```";
  });
}

export async function playPetaAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, petaFrames(ctx), {}); }
  catch (e) { console.error("[anim-adventure] gagal (dilewati senyap):", e?.message || e); return false; }
}
