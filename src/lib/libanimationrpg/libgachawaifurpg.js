// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libgachawaifurpg.js — LIB ANIMASI EMOJI-GRID khusus Gacha Waifu
// (upgrade owner 28 Sep 2026: cutscene 2 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD mesin · baris mesin/kapsul (🥚 bergetar → jatuh → retak → 💥 → 💞) · baris adegan
// kontekstual (knop mesin 🎛️ → gravitasi ⬇️ → ketegangan 💦 → cahaya ✨ → ledakan 💥 → hati 💞) · status aksi.
// Fase asli DIPERTAHANIN semua: mesin bergetar → kapsul JATUH → gemetar → retak ✨ → 💥 TERBUKA → 💞 REVEAL.
// KHUSUS gachawaifu (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

export function kapsulFrames() {
  const HUD = "🥚 ━ MESIN KAPSUL ━";
  const grid = [
    // [baris mesin/kapsul, adegan kontekstual, status]
    ["🥚🥚🥚🥚🥚", "🎛️ 💫 mesin bergetar", "mesin kapsul bergetar…"],
    ["🥚🥚🥚🥚 🥚", "⬇️ 💨 jatuh melayang", "      ↓\n🥚 kapsul JATUH!"],
    ["     🥚", "💦 😰 gemetar ketegangan", "  gemetar… gemetar…"],
    ["    🥚✨", "✨ 🌟 cahaya merembes", " cahaya merembes dari celah…"],
    ["   💥✨💥", "🎆 🌸 ledakan kapsul", " KAPSUL TERBUKA!"],
    ["    💞", "💗 ✨ waifu terungkap", " REVEAL! Waifu menyusul…"],
  ];
  return grid.map(([vis, adegan, status]) =>
    "```\n" + HUD + "\n" + vis + "\n" + adegan + "\n" + status + "\n```");
}

export async function playKapsulAnim(sock, jid) {
  try { return await editFramesAnim(sock, jid, kapsulFrames(), {}); }
  catch (e) { console.error("[anim-gachawaifu] gagal (dilewati senyap):", e?.message || e); return false; }
}
