// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libgachaitemrpg.js — LIB ANIMASI khusus Gacha Item (owner 25 Sep 2026)
// Slot 3-reel: reel ✨🌟💎 berputar → 🔒 terkunci satu per satu → reel berhenti.
// KHUSUS gachaitem (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ikon reel disuplai game lewat ctx (REEL_ICONS milik gachaitem), biar visual tetap milik game
export function slotFrames(reelIcons) {
  const IC = reelIcons && reelIcons.length ? reelIcons : ["✨", "🌟", "💎"];
  const finalIcons = [0, 1, 2].map(() => IC[Math.floor(Math.random() * IC.length)]);
  const frames = [];
  for (let f = 0; f <= 9; f++) {
    const locked = Math.min(3, Math.floor(f / 3)); // reel kunci tiap 3 frame (bug fix: dulu max 2, reel ke-3 gak pernah terkunci)
    const reels = [0, 1, 2].map((r) => (r < locked ? finalIcons[r] : IC[(f + r * 2) % IC.length]));
    const status = [0, 1, 2].map((r) => (r < locked ? "🔒" : "🔄")).join("");
    frames.push("```\n🎰 ━ GACHA SLOT ━\n[ " + reels.join(" ] [ ") + " ]\n" + status + (locked >= 3 ? "\n🎰 REEL BERHENTI! Reveal menyusul…" : "\n") + "```");
  }
  return frames;
}

export async function playSlotAnim(sock, jid, reelIcons, frameMs) {
  try { return await editFramesAnim(sock, jid, slotFrames(reelIcons), { frameMs }); }
  catch (e) { console.error("[anim-gachaitem] gagal (dilewati senyap):", e?.message || e); return false; }
}
