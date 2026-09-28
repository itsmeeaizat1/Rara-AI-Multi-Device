// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libadventurerpg.js — LIB ANIMASI EMOJI-GRID khusus Adventure / petualangan
// (upgrade owner 28 Sep 2026: cutscene 2 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD kompas (arah berputar tiap frame + tujuan event) · jalur landmark (📍 menyusuri,
// jejak ·, 🏕️ tujuan di ujung) · adegan peta grid (🗺️ kompas berputar, landmark dilewati) · status aksi.
// Kontekstual: landmark & arah dari ctx (per run beda), frame akhir dramatis ✨ TIBA DI TUJUAN.
// KHUSUS adventure (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { eventType, landmarks: [emoji...], arahs: [teks arah...] }
export function petaFrames({ eventType, landmarks, arahs }) {
  const LMAP = 10;
  const trail = "·";
  const LM = (landmarks && landmarks.length ? landmarks : ["🌲", "⛰️", "🏕️"]);
  const AR = (arahs && arahs.length ? arahs : ["⬆️", "➡️", "⬇️"]);
  const TUJUAN = String(eventType || "PETUALANGAN").toUpperCase();
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const pos = Math.min(LMAP - 1, f * 2);
    const jalur = Array.from({ length: LMAP }, (_, i) =>
      i === pos ? "📍" : i === LMAP - 1 ? "🏕️" : i < pos ? trail : LM[(i + f) % LM.length]).join("");
    const lewat = Math.max(0, pos); // landmark dilewati = posisi
    const adegan = f === 5
      ? "✨ " + LM[f % LM.length] + " ✨ TIBA DI TUJUAN!"
      : "🗺️ " + AR[f % AR.length] + " 🧭 " + LM[(f + 2) % LM.length] + " " + LM[(f + 4) % LM.length] + " · " + lewat + " langkah";
    const status = f === 5 ? "🏕️ " + TUJUAN + " TERCAPAI! ✨" : "🧭 MENYUSURI JALUR… " + (f + 1) + "/6";
    frames.push("```\n🧭 " + AR[f % AR.length] + " MENUJU " + TUJUAN + "\n" + jalur + "\n" + adegan + "\n" + status + "\n```");
  }
  return frames;
}

export async function playPetaAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, petaFrames(ctx), {}); }
  catch (e) { console.error("[anim-adventure] gagal (dilewati senyap):", e); return false; }
}
