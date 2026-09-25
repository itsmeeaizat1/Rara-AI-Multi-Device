// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmountrpg.js — LIB ANIMASI khusus Mount / tunggangan (owner 25 Sep 2026)
// Kandang: mode jinak 🐎 berjalan dari ujung padang 🌾 ke 🤠 → 💞; mode feed 🥕 → 💛 MAKAN LAHAP.
// KHUSUS tunggangan (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { mode: jinak|feed, mountName, emoji }
export function stableFrames({ mode, mountName, emoji }) {
  const slots = 6;
  const animal = emoji || "🐎";
  const header = (mode === "feed" ? "🥕 MEMBERI MAKAN · " : "🤠 MENJINAKKAN · ") + String(mountName || "TUNGGANGAN").toUpperCase();
  const anchor = mode === "feed" ? "🥕" : "🤠";
  const endTail = mode === "feed" ? "💛 MAKAN LAHAP! HAPPINESS NAIK…" : "💞 JINAK! SIAP DITUNGGANGI…";
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
    frames.push("```\n" + header + "\n" + row.join("") + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playStableAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, stableFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-mount] gagal (dilewati senyap):", e?.message || e); return false; }
}
