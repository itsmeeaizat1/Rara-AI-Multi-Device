// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libthousanddoortowerrpg.js — LIB ANIMASI khusus Thousand Door Tower / menara (owner 25 Sep 2026)
// Kepingan puzzle 🧩 terpasang satu per satu ke gerbang, gembok 🔒 runtuh jadi 🔓, pintu terbuka 🚪✨.
// KHUSUS menara (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { floor, themeName, themeEmoji }
export function doorFrames({ floor, themeName, themeEmoji }) {
  floor = floor || 1;
  const boss = floor % 10 === 0;
  const header = boss
    ? "🧙 GERBANG SANG BIJAK · LANTAI " + floor
    : "🧩 " + String(themeName || "TEMA").toUpperCase() + " " + (themeEmoji || "") + " · LANTAI " + floor;
  const SLOTS = 6;
  const frames = [];
  for (let f = 0; f <= SLOTS; f++) {
    const pieces = "🧩".repeat(f) + "⬜".repeat(SLOTS - f);
    let lock, tail;
    if (f === 0) { lock = boss ? "🔒🔒" : "🔒"; tail = boss ? "GERBANG BOSS TERKUNCI GANDA…" : "PINTU TERKUNCI…"; }
    else if (f < SLOTS) { lock = "🔓"; tail = "MERAKIT KUNCI… " + f + "/" + SLOTS; }
    else { lock = "🚪✨"; tail = "TERBUKA! Teka-tekinya menanti…"; }
    frames.push("```\n" + header + "\n" + lock + " " + pieces + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playDoorAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, doorFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-menara] gagal (dilewati senyap):", e?.message || e); return false; }
}
