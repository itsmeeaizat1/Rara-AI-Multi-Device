// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libgachawaifurpg.js — LIB ANIMASI khusus Gacha Waifu (owner 25 Sep 2026)
// Kapsul: mesin bergetar → kapsul JATUH → gemetar → retak ✨ → 💥 TERBUKA → 💞 REVEAL.
// KHUSUS gachawaifu (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

export function kapsulFrames() {
  return [
    "```\n🥚🥚🥚🥚🥚\n mesin kapsul bergetar…\n```",
    "```\n🥚🥚🥚🥚🥚\n      ↓\n🥚 kapsul JATUH!\n```",
    "```\n     🥚\n  gemetar… gemetar…\n```",
    "```\n    🥚✨\n cahaya merembes dari celah…\n```",
    "```\n   💥✨💥\n KAPSUL TERBUKA!\n```",
    "```\n    💞\n REVEAL! Waifu menyusul…\n```",
  ];
}

export async function playKapsulAnim(sock, jid) {
  try { return await editFramesAnim(sock, jid, kapsulFrames(), {}); }
  catch (e) { console.error("[anim-gachawaifu] gagal (dilewati senyap):", e?.message || e); return false; }
}
