// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libguildwarrpg.js — LIB ANIMASI khusus Guild War (26 Sep
// 2026). Dua pasukan emoji berbaris saling mendekat, lantas BENTROK 💥 di
// tengah medan — KHUSUS guild war (aturan "beda game beda animasi").
// Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat perang dimulai. Fallback channel gak dukung edit → senyap.

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
  for (const g of gaps) {
    frames.push("```\n" + head + "\n\n" + a + " ".repeat(g) + b + "\n" + (g > 6 ? "PASUKAN BERGERAK\u2026" : "SIAP BENTROK\u2026") + "\n```");
  }
  frames.push("```\n" + head + "\n\n" + eA + "\u2694\uFE0F\uD83D\uDCA5" + eB + "  \uD83D\uDCA5\u2694\uFE0F" + eA + "\n" + "BENTROKAN DIMULAI \u2014 SERANG: .guild attack\n```");
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
  const rows = [
    "\u2026\u2026\u2026\u2026\u2026\u2026",
    "\u2026\u2026" + e + "\u2026\u2026",
    "\u2026" + e + "\u2728" + e + "\u2026",
    e + "\u{1F389}" + e + "\u2728" + "\u{1F389}" + e,
  ];
  return rows.map((r) => "```\n" + head + "\n\n" + r + "\n```");
}

export async function playVictoryAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, victoryFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-guildwar] gagal (dilewati senyap):", e?.message || e); return false; }
}
