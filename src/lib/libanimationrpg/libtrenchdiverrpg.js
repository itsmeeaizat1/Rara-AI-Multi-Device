// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libtrenchdiverrpg.js — LIB ANIMASI CINEMATIC khusus Trenchdiver / palung (owner 25 Sep 2026)
// Gaya cuplikan Nintendo: cutscene multi-babak via EDIT BERULANG satu pesan, durasi OTOMATIS nyesuaikan situasi
// (makin dalam zona → babak selam makin panjang · jalur risiko ngebut · bahaya/pelampung/event/boss nambah babak).
// Isinya MURNI KODE ANIMASI: pure scene-builder dari ctx (gak import plugin, gak ada logic game di sini).
// Konvensi folder src/lib/libanimationrpg/: file lib<namagame>rpg.js, satu lib per game, animasi BEDA antar game —
// palung = SELAM VERTIKAL (kolom kedalaman, penyelam 🤿 turun, jejak gelembung 🫧, sonar ◎◉○),
// gunung = side-scrolling daki, warung = antrean pelanggan. Fallback gak dukung edit → senyap.

import { editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.PALUNG_CINEMATIC_MS !== undefined ? Number(process.env.PALUNG_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setTrenchdiverAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

// ── mesin putar: sistem edit berulang (satu pesan, frame demi frame) ──
export async function playTrenchdiverCinematic(sock, jid, scenes) {
  try { return await editSceneAnim(sock, jid, scenes, {}); }
  catch (e) { console.error("[anim-palung] gagal (dilewati senyap):", e); return false; }
}

// ── SCENE signature: selam vertikal — penyelam turun kolom kedalaman (khas palung — BEDA dari semua game) ──
// durasi nyesuaikan: makin dalam zona makin panjang babaknya (3 + zona frame)
function selamFrames(ctx) {
  const zTile = ctx.zonaTile || "🌊";
  const zNama = (ctx.zonaNama || "ZONA").toUpperCase();
  const sonar = ["◎", "◉", "◎", "○"];
  const steps = 3 + Math.min(ctx.zona || 1, 4);
  const frames = [];
  for (let f = 1; f <= steps; f++) {
    const pos = Math.min(10, f * 2);
    const col = [];
    for (let i = 0; i < 10; i++) col.push(i === pos ? "🤿" : i < pos ? "🫧" : i === 9 ? "💎" : zTile);
    frames.push("```\\n" + sonar[f % sonar.length] + " SONAR · " + zNama + " · " + (pos * 250) + "m\\n" + col.join("") + "\\n```");
  }
  return frames;
}

// ── cinematic SELAM (diputar sebelum kartu hasil) ──
// ctx: { zona, zonaNama, zonaTile, jalur: aman|risiko, bahaya, selamat (pelampung), event, loot, boss }
export function selamCinematic(ctx) {
  const scenes = [];
  // SCENE 1 — perahu: cek oksigen + siap selam
  scenes.push({ frames: [
    "```\\n🫁 Cek tabung oksigen… OK!\\n🤿 Suit selam dicek… rapat!\\n```",
    "```\\n" + (ctx.jalur === "risiko" ? "⚡ JALUR RISIKO dipilih.\\nLoot ×2… bahaya 35%." : "🛟 Jalur aman dipilih.\\nTenang, pelan-pelan.") + "\\n```",
  ], frameMs: fr(1), holdMs: fr(0.7) });
  // SCENE 2 — selam vertikal (durasi ∝ zona; risiko ngebut)
  scenes.push({ frames: selamFrames(ctx), frameMs: ctx.jalur === "risiko" ? fr(0.7) : fr(0.95), holdMs: fr(0.6) });
  // SCENE 3 — bahaya (versi pelampung selamat / kena)
  if (ctx.bahaya) {
    scenes.push(ctx.selamat ? { frames: [
      "```\\n🌀 Arus pusaran MENYERET!\\nSemua terasa terlambat…\\n```",
      "```\\n🛟 PELAMPUNG DARURAT MENGEMBANG!\\nKamu diselamatkan — hasil tetap utuh!\\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) } : { frames: [
      "```\\n🦈 GIGITAN DARI KEgelapan!\\nKamu buru-buru naik sambil menjatuhkan loot…\\n```",
      "```\\n💨 Sampai di perahu, napas ngos-ngosan.\\nSebagian harta hilang di kedalaman…\\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  }
  // SCENE 4 — event kedalaman (babak ekstra per event)
  if (ctx.event === "mutiara") scenes.push({ frames: [
    "```\\n✨ Sesuatu BERSINAR di celah karang…\\n```",
    "```\\n🦪 MUTIARA RAKSASA sebesar kepalan!\\nDiangkat dengan hati-hati.\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "arus") scenes.push({ frames: [
    "```\\n🌊 ARUS KUAT menabrak badan…\\n```",
    "```\\n🌀 Kamu bertahan di balik karang…\\nOksigen terkuras, tapi berhasil!\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "ubur") scenes.push({ frames: [
    "```\\n⚡ Derau listrik di air…\\n```",
    "```\\n⚡ UBUR-UBUR LISTRIK MENYENGAT!\\nKamu menggigil — oksigen terkuras!\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "hiu") scenes.push({ frames: [
    "```\\n🦈 PUNGGUNG ABU-ABU MELINTAS…\\n```",
    "```\\n🏃 Kamu kabur sambil menjatuhkan sebagian harta.\\nNyawa lebih mahal!\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "kapal") scenes.push({ frames: [
    "```\\n⚓ LAMPU SOROT MENEMUKAN LAMBUNG TUA…\\n```",
    "```\\n⚓ KAPAL KARAM berusia ratusan tahun!\\nArtifak diangkat satu per satu.\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "bio") scenes.push({ frames: [
    "```\\n✨ Cahaya-cahaya kecil MENARI…\\n```",
    "```\\n✨ BIOLUMINESISI!\\nSosok raksasa lewat di kejauhan… matanya menatapmu sedetik.\\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  // SCENE 5 — BOSS: Sesuatu di Dasar Palung (momen paling megah)
  if (ctx.boss) scenes.push({ frames: [
    "```\\n🌊 Kedalaman maksimal tercapai…\\nSonar mendeteksi… SESUATU.\\n```",
    "```\\n🦑 BAYANGAN RAKSASA MUNCUL!\\nAir membeku. Waktu berhenti.\\n```",
    "```\\n🦑 Ia menatapmu lama…\\n…lalu MENYINGKIR, seolah mengizinkan.\\n```",
    "```\\n🏆 TITIK TERDALAM TERJANGKAU!\\nKamu mengangkat kristal dengan hormat.\\n```",
  ], frameMs: fr(1.2), holdMs: fr(1.2) });
  // SCENE 6 — loot naik berdetak
  const g = Math.max(0, ctx.loot || 0);
  scenes.push({ frames: [
    "```\\n💰 Loot dibuka…\\n+" + Math.floor(g / 3) + " uang…\\n```",
    "```\\n💰 +" + Math.floor((g * 2) / 3) + "… berdetak naik…\\n```",
    "```\\n💰 +" + g + " ✅\\n" + (ctx.jalur === "risiko" ? "⚡ Risiko terbayar!" : "🛟 Aman sampai atas!") + "\\n```",
  ], frameMs: fr(0.95), holdMs: fr(0.9) });
  return scenes;
}

// ── cinematic NAIK PERMUKAAN (istirahat/naik — pendek) ──
export function naikCinematic(ctx) {
  return [
    { frames: [
      "```\\n🤿 Muka ke atas…\\nCahaya makin terang…\\n```",
      "```\\n☀️ PERAHU TIBA.\\nOksigen penuh kembali. Laut menunggumu kembali.\\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.5) },
  ];
}
