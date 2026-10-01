// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmountrpg.js — LIB ANIMASI EMOJI-GRID khusus Mount / tunggangan
// (upgrade owner 28 Sep 2026: cutscene 3 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD (MENJINAKKAN/MBERI MAKAN + nama tunggangan) · baris padang (🤠/🥕 jangkar + hewan
// mendekat melalui 🌾, jejak ✨, emoji hewan dari ctx) · adegan kontekstual per mode & fase (padang terbuka →
// makin penurut → 💞 / kandang hangat → mengunyah → 💛) · status aksi. Baris padang TETAP di line index 2
// (kontrak e2e posisi hewan bergerak). KHUSUS tunggangan (aturan "beda game beda animasi"). Isi MURNI KODE
// ANIMASI (pure dari ctx, gak import plugin). Dipanggil plugin saat user main game. Fallback → senyap.

import { editFramesAnim } from "../rara-anim-runner.js";

// ctx: { mode: jinak|feed, mountName, emoji }
export function stableFrames({ mode, mountName, emoji }) {
  const slots = 6;
  const animal = emoji || "🐎";
  const header = (mode === "feed" ? "🥕 MEMBERI MAKAN · " : "🤠 MENJINAKKAN · ") + String(mountName || "TUNGGANGAN").toUpperCase();
  const anchor = mode === "feed" ? "🥕" : "🤠";
  const endTail = mode === "feed" ? "💛 MAKAN LAHAP! HAPPINESS NAIK…" : "💞 JINAK! SIAP DITUNGGANGI…";
  const adegan = (f) => mode === "feed"
    ? (f === 0 ? "🏠 🌾 kandang hangat" : f < slots ? "🐴 mengunyah dengan lahap" : "💛 kenyang & senang!")
    : (f === 0 ? "🏞️ ☀️ padang terbuka" : f < slots ? "💨 makin penurut mendekat" : "💞 kepercayaan terjalin!");
  const frames = [];
  for (let f = 0; f <= slots; f++) {
    const animalAt = Math.min(slots - 1, Math.max(1, slots - f));
    const row = [];
    for (let i = 0; i < slots; i++) {
      if (i === 0) row.push(anchor);
      else if (i === animalAt) row.push(animal);
      else if (i > animalAt) row.push("✨");
      else row.push("🌾");
    }
    const tail = f === 0 ? "MEMANGGIL DARI KANDANG…" : f < slots ? "MENDEKATI… " + f + "/" + slots : endTail;
    frames.push("```\n" + header + "\n" + row.join("") + "\n" + adegan(f) + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playStableAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, stableFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-mount] gagal (dilewati senyap):", e?.message || e); return false; }
}
