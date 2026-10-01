// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// libanimationrpg/libhuntingadventurerpg.js — LIB ANIMASI EMOJI-GRID khusus Hunting Adventure / berburu
// (upgrade owner 28 Sep 2026 #2: cutscene 2 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD (BURU <sasaran> · terkunci di frame akhir) · baris crosshair (🎯 merayap ke jejak 🐾,
// frame terkunci 🎯 nempel 🐾) · adegan rimba (🌲🌿 + siluet fauna, makin dekat makin intens) · status aksi.
// SITUASI MENENTUKAN LEVEL (owner 28 Sep): buruan RARE 💎 = lintasan lebih panjang (7 frame vs common 5),
// tempo lebih PELAN (840ms vs 630ms — nafas ditahan 🤫, langkah makin hati-hati) + adegan menyusup beda
// (siluet samar 🫥, jejak makin jelas) — beda situasi beda adegan, khas berburu.
// KHUSUS berburu (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../rara-anim-runner.js";

// tempo rayap per situasi (ms per frame) — rare = pelan & hati-hati
export const scopeTempoMs = (rare) => rare ? 840 : 630;

// ctx: { monsterName, rare: true|false }
export function scopeFrames({ monsterName, rare }) {
  const RARE = rare === true;
  const SCW = RARE ? 12 : 10; // buruan langka = jarak lebih jauh
  const N = RARE ? 7 : 5; // langka = rayap lebih lama (level ∝ situasi)
  const target = 3 + Math.floor(Math.random() * (SCW - 5));
  const NAMA = String(monsterName || "SASARAN").toUpperCase();
  const badge = RARE ? " 💎 LANGKA" : "";
  const frames = [];
  for (let f = 0; f < N; f++) {
    const lock = f === N - 1;
    const pos = lock ? target - 1 : Math.round((target * f) / (N - 1));
    const row = Array.from({ length: SCW }, (_, i) =>
      i === target ? "🐾" : i === pos ? "🎯" : "🟩").join("");
    // adegan: beda situasi beda suasana — common = rimba biasa; rare = menyusup senyap
    const adegan = lock
      ? (RARE ? "💥 🎯🐾 💥 JEJAK LANGKA DITEMUKAN!" : "💥 🎯🐾 💥 JEJAK DITEMUKAN!")
      : !RARE
        ? (f <= 1 ? "🌲 🌿 🌲 🦌 🌿" : f === 2 ? "🌲 🌿 👀 🦅 🌿" : "🌲 🫣 🐅 🌿 🌿")
        : (f <= 1 ? "🌲 🌿 🫥 🌿 🌿" : f < N - 3 ? "🌲 🤫 🌿 👣 🌿" : "🌲 🫥 👀 🐾 🌿");
    const status = lock
      ? (RARE ? "💎 SASARAN LANGKA TERKUNCI! 💥" : "🎯 SASARAN TERKUNCI! 💥")
      : (RARE ? "RAYAP PELAN… NAPAS DITAHAN " + (f + 1) + "/" + (N - 1) : "RAYAP MENGURANGI JARAK… " + (f + 1) + "/" + (N - 1));
    frames.push("```\n🔍 BURU " + NAMA + badge + (lock ? " — 🎯 TERKUNCI!" : "") + "\n" + row + "\n" + adegan + "\n" + status + "\n```");
  }
  return frames;
}

export async function playScopeAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, scopeFrames(ctx), { frameMs: scopeTempoMs(ctx?.rare === true) }); }
  catch (e) { console.error("[anim-berburu] gagal (dilewati senyap):", e?.message || e); return false; }
}
