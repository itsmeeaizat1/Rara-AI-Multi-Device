// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libguildwarrpg.js — LIB ANIMASI EMOJI-GRID khusus Guild War
// (upgrade owner 28 Sep 2026: cutscene 3 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// warFrames grid: HUD ⚔️ guild vs guild · baris pasukan (5 emoji masing-masing saling mendekat) · adegan medan
// kontekstual makin tegang (bukit 🏔️ → formasi 🌵 → genderang 🥁 → ⚡ nyaris → 🔥 tegang → 💥🌪️ debu bentrok) ·
// status (PASUKAN BERGERAK… / SIAP BENTROK… / SERANG: .guild attack). victoryFrames grid: trophy naik + adegan
// perayaan kontekstual (sorak 📣 → confetti 🎊 → sorot lampu 🔦 → 🎉✨ juara).
// KHUSUS guild war (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx).
// Dipanggil plugin saat perang dimulai / juara ditentukan. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { nameA, emojiA, nameB, emojiB }
export function warFrames({ nameA, emojiA, nameB, emojiB }) {
  const eA = emojiA || "\u{1F6E1}\uFE0F"; // 🛡️
  const eB = emojiB || "\u{1F409}";       // 🐉
  const a = (eA + "").repeat(5);
  const b = (eB + "").repeat(5);
  const head = "\u2694\uFE0F GUILD WAR: " + String(nameA || "?").toUpperCase() + " vs " + String(nameB || "?").toUpperCase();
  const frames = [];
  const gaps = [24, 18, 12, 6, 2];
  const adegans = [
    "\u{1F3D4}\uFE0F \u{1F305} dua pasukan turun dari bukit", // 🏔️ 🌅
    "\u{1F335} formasi merapat melintasi gurun",             // 🌵
    "\u{1F941} genderang perang bergemuruh",                 // 🥁
    "\u26A1 nyaris bertubrukan!",                            // ⚡
    "\u{1F525} tegang total di garis depan",                 // 🔥
    "\u{1F4A5}\u{1F32A}\uFE0F debu bentrok memenuhi medan",  // 💥🌪️
  ];
  gaps.forEach((g, idx) => {
    frames.push("```\n" + head + "\n" + a + " ".repeat(g) + b + "\n" + adegans[idx] + "\n" +
      (g > 6 ? "PASUKAN BERGERAK\u2026 " + (idx + 1) + "/5" : "SIAP BENTROK\u2026") + "\n```");
  });
  frames.push("```\n" + head + "\n" + eA + "\u2694\uFE0F\uD83D\uDCA5" + eB + "  \uD83D\uDCA5\u2694\uFE0F" + eA +
    "\n" + adegans[5] + "\nBENTROKAN DIMULAI \u2014 SERANG: .guild attack\n```");
  return frames;
}

export async function playWarAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, warFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-guildwar] gagal (dilewati senyap):", e?.message || e); return false; }
}

// ctx: { name, emoji } — juara: lambang naik + confetti
export function victoryFrames({ name, emoji }) {
  const e = (emoji || "\u{1F3C6}") + "";
  const head = "\uD83C\uDFC1 JUARA GUILD WAR \u2014 " + String(name || "?").toUpperCase();
  const grid = [
    ["\u2026\u2026\u2026\u2026\u2026\u2026", "\u{1F4E3} sorakan penonton bergemuruh", "trophy dipersembahkan\u2026"],       // 📣
    ["\u2026\u2026" + e + "\u2026\u2026", "\u{1F38A} confetti mulai berhamburan", "lambang juara naik\u2026"],               // 🎊
    ["\u2026" + e + "\u2728" + e + "\u2026", "\u{1F526} sorot lampu panggung", "hampir sampai puncak\u2026"],                // 🔦
    [e + "\u{1F389}" + e + "\u2728" + "\u{1F389}" + e, "\u{1F389}\u2728\u{1F389} malam kemenangan", "JUARA DITABUH! \u{1F3AF}"], // 🎉✨🎯
  ];
  return grid.map(([vis, adegan, status]) => "```\n" + head + "\n" + vis + "\n" + adegan + "\n" + status + "\n```");
}

export async function playVictoryAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, victoryFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-guildwar] gagal (dilewati senyap):", e?.message || e); return false; }
}
