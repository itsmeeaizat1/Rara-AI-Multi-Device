// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libthousanddoortowerrpg.js — LIB ANIMASI EMOJI-GRID khusus Thousand Door Tower / menara
// (upgrade owner 28 Sep 2026: cutscene 3 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD tema+lantai · adegan tema (emoji tema + menara 🏰) · gerbang (gembok + slot kepingan 🧩) · status aksi.
// Kontekstual: tema lantai tampil di adegan grid, boss lantai kelipatan 10 = gerbang ganda 🔒🔒 + adegan 🧙⚡,
// kepingan dirakit 1 per 1 (0→6), gembok 🔒→🔓→🚪✨ terbuka dengan sparkle di akhir.
// KHUSUS menara (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { floor, themeName, themeEmoji }
export function doorFrames({ floor, themeName, themeEmoji }) {
  floor = floor || 1;
  const boss = floor % 10 === 0;
  const emoji = themeEmoji || "🏰";
  const header = boss
    ? "🧙 GERBANG SANG BIJAK · LANTAI " + floor
    : "🧩 " + String(themeName || "TEMA").toUpperCase() + " " + emoji + " · LANTAI " + floor;
  const SLOTS = 6;
  const frames = [];
  for (let f = 0; f <= SLOTS; f++) {
    const pieces = "🧩".repeat(f) + "⬜".repeat(SLOTS - f);
    let lock, tail, adegan;
    if (f === 0) {
      lock = boss ? "🔒🔒" : "🔒";
      tail = boss ? "GERBANG BOSS TERKUNCI GANDA…" : "PINTU TERKUNCI…";
      adegan = boss ? "🧙 🏰 ⚡" : emoji + " 🏰 " + emoji;
    } else if (f < SLOTS) {
      lock = "🔓";
      tail = "MERAKIT KUNCI… " + f + "/" + SLOTS;
      adegan = boss ? "🧙 🏰 ⚡" : emoji + " 🏰 " + emoji;
    } else {
      lock = "🚪✨";
      tail = "TERBUKA! Teka-tekinya menanti…";
      adegan = boss ? "🧙 🏰 ✨" : emoji + " 🏰✨";
    }
    frames.push("```\n" + header + "\n" + adegan + "\n" + lock + " " + pieces + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playDoorAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, doorFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-menara] gagal (dilewati senyap):", e?.message || e); return false; }
}
