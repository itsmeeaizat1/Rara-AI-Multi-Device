// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// libanimationrpg/libworldeventrpg.js — LIB ANIMASI khusus World Event /
// Time Capsule (26 Sep 2026). Tiap JENIS event punya animasi sendiri
// (aturan "beda game beda animasi"): komet = jatuh melintas langit malam,
// boss dunia = sosok raksasa muncul dari bayangan + HP bar, festival =
// lentera naik ke langit. Pure dari ctx, gak import plugin. Fallback senyap.

import { editFramesAnim } from "../rara-anim-runner.js";

// ctx: { name } — ☄️ melintas langit 🌌 dengan jejak ✨, meledak tertangkap 💥
export function kometFrames({ name }) {
  const head = "\u2604\uFE0F KOMET " + String(name || "?").toUpperCase() + " MELINTAS LANGIT";
  const sky = "\u{1F30C}".repeat(10);
  const pos = [1, 3, 5, 7, 9];
  const frames = pos.map((i) => "```\n" + head + "\n" + sky.slice(0, i) + "\u2604\uFE0F" + "\u2728".repeat(3) + "\n" + (i < 9 ? "cepat! tangkap sebelum lewat\u2026" : "HAMPIR HILANG \u2014 SEKARANG!") + "\n```");
  frames.push("```\n" + head + "\n\n\uD83D\uDCA5\u2604\uFE0F\u2728 TERTANGKAR! \u2728\u2604\uFE0F\uD83D\uDCA5\nPENJARING PERTAMA AKAN DIABADIKAN SEJARAH\n```");
  return frames;
}

// ctx: { name, hp, hpMax } — 🌫️ bayangan menebal → 👾 boss muncul + HP bar
export function bossFrames({ name, hp, hpMax }) {
  const head = "\u{1F47E} BOSS DUNIA: " + String(name || "?").toUpperCase();
  const fog = ["\u{1F32B}\uFE0F", "\u{1F32B}\uFE0F\u{1F32B}\uFE0F", "\u{1F32B}\uFE0F\u{1F32B}\uFE0F\u{1F32B}\uFE0F"];
  const frames = fog.map((f) => "```\n" + head + "\n\n" + f + "\n sesuatu mengintip dari kabut\u2026\n```");
  frames.push("```\n" + head + "\n\n\u{1F47E}\u26A0\uFE0F\u{1F47E}\n" + "\u2620\uFE0F DIA BANGKIT \u2014 SERANG: .bossdunia\n```");
  return frames;
}

// ctx: { name } — 🎏 lentera naik perlahan ke langit
export function festivalFrames({ name }) {
  const head = "\u{1F38F} FESTIVAL " + String(name || "?").toUpperCase() + " DIMULAI";
  const rows = ["\u{1F3D9}\uFE0F\u{1F38F}\u{1F3D9}\uFE0F", "\u{1F38F}\u2002\u{1F38F}", "\u{1F38F}\u2002\u2002\u{1F38F}", "\u2002\u{1F38F}\u2002\u2002\u2002\u{1F38F}\u2002", "\u2728\u{1F38F}\u{1F389}\u{1F38F}\u2728"];
  return rows.map((r) => "```\n" + head + "\n\n" + r + "\n```");
}

export async function playEventAnim(sock, jid, frames, frameMs) {
  try { return await editFramesAnim(sock, jid, frames, { frameMs }); }
  catch (e) { console.error("[anim-worldevent] gagal (dilewati senyap):", e?.message || e); return false; }
}
