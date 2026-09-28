// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libtrenchdiverrpg.js — LIB ANIMASI EMOJI-GRID khusus Trenchdiver / palung
// (upgrade owner 28 Sep 2026: cutscene teks → GRID EMOJI FRAME-BY-FRAME ala "scene situasional")
// Tiap frame = grid 4 baris: HUD (sonar · zona · kedalaman) · kolom selam vertikal (gelembung 🫧 di atas
// penyelam 🤿) · baris gelap kedalaman (makin turun makin ⬛ — situasional) · status aksi.
// Animasi KONTEKSTUAL: babak makin panjang di zona dalam, jalur risiko ngebut (frameMs lebih cepat),
// bahaya/pelampung/event/boss nambah babak, impact 💥✨ di momen kritis, status dramatis (🏆/🛟/⚡).
// Isinya MURNI KODE ANIMASI: pure scene-builder dari ctx (gak import plugin, gak ada logic game di sini).
// Konvensi folder src/lib/libanimationrpg/: file lib<namagame>rpg.js per game, animasi BEDA antar game —
// palung = SELAM VERTIKAL (kolom kedalaman, jejak gelembung 🫧, sonar ◎◉○), gunung = side-scrolling daki.
// Fallback gak dukung edit → editSceneAnim return false → pemanggil senyap lanjut.

import { editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.PALUNG_CINEMATIC_MS !== undefined ? Number(process.env.PALUNG_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setTrenchdiverAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

const grid = (lines) => "```\n" + lines.join("\n") + "\n```";

// ── mesin putar: sistem edit berulang (satu pesan, frame demi frame) ──
export async function playTrenchdiverCinematic(sock, jid, scenes) {
  try { return await editSceneAnim(sock, jid, scenes, {}); }
  catch (e) { console.error("[anim-palung] gagal (dilewati senyap):", e); return false; }
}

// ── SCENE signature: SELAM VERTIKAL grid — penyelam turun kolom kedalaman (khas palung — BEDA dari semua game) ──
// DURASI ∝ SITUASI (owner 28 Sep: "jangan buru-buru, situasi menentukan level"): level animasi =
//   zona + jalur risiko(+1) + bahaya(+1) → steps = 3 + min(situasi, 6). Zona 1 aman = 4 frame,
//   Hadal risiko + bahaya = 9 frame. Tempo: aman pelan fr(1.0) · risiko NEBUT fr(0.7) (khas palung).
//   Beda kondisi beda HUD: zona 3+ wajib lampu 🔦 · zona 4 (Hadal) tambah tabung ganda 🫁🫁.
// Grid 4 baris: HUD sonar+kedalaman · kolom (🫧 di atas 🤿) · baris gelap makin tebal · status.
function selamFrames(ctx) {
  const zTile = ctx.zonaTile || "🌊";
  const zNama = (ctx.zonaNama || "ZONA").toUpperCase();
  const sonar = ["◎", "◉", "◎", "○"];
  const zona = ctx.zona || 1;
  // SITUASI MENENTUKAN LEVEL ANIMASI: zona + risiko + bahaya (bukan zona doang)
  const situasi = zona + (ctx.jalur === "risiko" ? 1 : 0) + (ctx.bahaya ? 1 : 0);
  const steps = 3 + Math.min(situasi, 6);
  // beda kondisi beda HUD: zona 3+ wajib lampu, Hadal tambah tabung ganda
  const peralatan = (zona >= 3 ? " · 🔦" : "") + (zona >= 4 ? " 🫁🫁" : "");
  const frames = [];
  for (let f = 1; f <= steps; f++) {
    const pos = Math.min(10, f * 2);
    const col = [];
    for (let i = 0; i < 10; i++) col.push(i === pos ? "🤿" : i < pos ? "🫧" : i === 9 ? "💎" : zTile);
    const gelap = Math.min(8, Math.floor(pos / 2)); // makin dalam makin gelap (situasional)
    const dark = "⬛".repeat(gelap) + zTile.repeat(Math.max(0, 10 - gelap));
    const status = pos >= 8 ? "💎 Dasar kedalaman terlihat…" : (ctx.jalur === "risiko" ? "⚡ Ngebut menuruni kolom…" : "🫁 Pelan-pelan turun…");
    frames.push(grid([sonar[f % sonar.length] + " SONAR · " + zNama + " · " + (pos * 250) + "m" + peralatan, col.join(""), dark, status]));
  }
  return frames;
}

// ── cinematic SELAM (diputar sebelum kartu hasil) ──
// ctx: { zona, zonaNama, zonaTile, jalur: aman|risiko, bahaya, selamat (pelampung), event, loot, boss }
export function selamCinematic(ctx) {
  const scenes = [];
  // SCENE 1 — perahu grid: cek oksigen + siap selam
  scenes.push({ frames: [
    grid(["⛵ PERAHU — PERSIAPAN SELAM", "🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊", "🫁 ✓   🤿 ✓", QQ + "Cek tabung oksigen… OK! Suit selam… rapat!" + QQ]),
    grid([(ctx.jalur === "risiko" ? "⚡ JALUR RISIKO DIPILIH" : "🛟 JALUR AMAN DIPILIH"), "🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊", "🤿 ➡️ 🌊", ctx.jalur === "risiko" ? "Loot ×2… bahaya 35% menanti." : "Tenang, pelan-pelan saja."]),
  ], frameMs: fr(1), holdMs: fr(0.7) });
  // SCENE 2 — selam vertikal grid (durasi ∝ zona; risiko ngebut)
  scenes.push({ frames: selamFrames(ctx), frameMs: ctx.jalur === "risiko" ? fr(0.7) : fr(1.0), holdMs: fr(0.7) });
  // SCENE 3 — bahaya (versi pelampung selamat / kena) — grid impact
  if (ctx.bahaya) {
    scenes.push(ctx.selamat ? { frames: [
      grid(["🌀 ARUS PUSATAN MENYERET!", "🌀 🌀 🌀", "🤿 ⬇️ ⁉️", "Semua terasa terlambat…"]),
      grid(["🛟 PELAMPUNG DARURAT MENGEMBANG!", "💥 🛟 ✨", "🤿 😮‍💨", "Kamu diselamatkan — hasil tetap utuh!"]),
    ], frameMs: fr(0.9), holdMs: fr(0.6) } : { frames: [
      grid(["🦈 GIGITAN DARI KEGELAPAN!", "⬛ 🦈 ⬛", "🤿 💥 😱", "Buru-buru naik sambil menjatuhkan loot…"]),
      grid(["💨 SAMPAI DI PERAHU…", "⛵ 💨", "😮‍💨 🤿", "Napas ngos-ngosan. Sebagian harta hilang di kedalaman…"]),
    ], frameMs: fr(0.9), holdMs: fr(0.6) });
  }
  // SCENE 4 — event kedalaman (babak grid ekstra per event)
  if (ctx.event === "mutiara") scenes.push({ frames: [
    grid(["✨ SESUATU BERSINAR DI CELAH KARANG…", "🪸 ✨ 🪸", "🤿 👀", "Mendekat pelan-pelan…"]),
    grid(["🦪 MUTIARA RAKSASA!", "🪸 💥 🦪 ✨", "🤿 🤩", "Sebesar kepalan! Diangkat dengan hati-hati."]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "arus") scenes.push({ frames: [
    grid(["🌊 ARUS KUAT MENABRAK BADAN…", "🌊 ➡️ 🤿", "Aduh!"]),
    grid(["🌀 BERTAHAN DI BALIK KARANG…", "🪸 🤿 🪸", "Oksigen terkuras, tapi berhasil!"]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "ubur") scenes.push({ frames: [
    grid(["⚡ DERAU LISTRIK DI AIR…", "⬛ ⚡ ⬛", "🤿 ⁉️", "Rambutmu berdiri sendiri…"]),
    grid(["⚡ UBUR-UBUR LISTRIK MENYENGAT!", "💥 ⚡ 🪼 💥", "🤿 🥶", "Kamu menggigil — oksigen terkuras!"]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "hiu") scenes.push({ frames: [
    grid(["🦈 PUNGGUNG ABU-ABU MELINTAS…", "⬛ 🦈 ⬛", "🤿 😨", "Jangan gerak… jangan gerak…"]),
    grid(["🏃 KABUR! NYAWA LEBIH MAHAL!", "🦈 ➡️ 🤿💨", "💥 Sebagian harta dijatuhkan."]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "kapal") scenes.push({ frames: [
    grid(["⚓ LAMPU SOROT MENEMUKAN LAMBUNG TUA…", "⬛ 🏴‍☠️ ⬛", "🤿 🔦", "Kayunya hitam pekat…"]),
    grid(["⚓ KAPAL KARAM RATUSAN TAHUN!", "💥 ⚓ ✨", "🤿 🤩", "Artifak diangkat satu per satu."]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  else if (ctx.event === "bio") scenes.push({ frames: [
    grid(["✨ CAHAYA-CAHAYA KECIL MENARI…", "✨ ✨ ✨", "🤿 😮", "Sulit dipercaya…"]),
    grid(["✨ BIOLUMINESISI!", "🐙 ✨ 👀", "Sosok raksasa lewat di kejauhan… matanya menatapmu sedetik."]),
  ], frameMs: fr(0.9), holdMs: fr(0.5) });
  // SCENE 5 — BOSS: Sesuatu di Dasar Palung (momen paling megah, grid dramatis)
  if (ctx.boss) scenes.push({ frames: [
    grid(["🌊 KE DALAMAN MAKSIMAL…", "◎ ◉ ◎", "⬛⬛⬛⬛⬛", "Sonar mendeteksi… SESUATU."]),
    grid(["🦑 BAYANGAN RAKSASA MUNCUL!", "💥 🦑 💥", "⬛⬛⬛⬛⬛", "Air membeku. Waktu berhenti."]),
    grid(["🦑 IA MENATAPMU LAMA…", "🦑 … 🤿", "…lalu MENYINGKIR, seolah mengizinkan."]),
    grid(["🏆 TITIK TERDALAM TERJANGKAU!", "💎 ✨ 🏆", "🤿 🫡", "Kamu mengangkat kristal dengan hormat."]),
  ], frameMs: fr(1.2), holdMs: fr(1.2) });
  // SCENE 6 — loot naik berdetak
  const g = Math.max(0, ctx.loot || 0);
  scenes.push({ frames: [
    grid(["💰 LOOT DIBUKA…", "+" + Math.floor(g / 3) + " uang…", "…"]),
    grid(["💰 BERDETAK NAIK…", "+" + Math.floor((g * 2) / 3) + "…", "…"]),
    grid(["💰 +" + g + " ✅", ctx.jalur === "risiko" ? "⚡ Risiko terbayar!" : "🛟 Aman sampai atas!"]),
  ], frameMs: fr(0.95), holdMs: fr(0.9) });
  return scenes;
}

// ── cinematic NAIK PERMUKAAN (istirahat/naik — pendek, grid naik) ──
export function naikCinematic(ctx) {
  return [
    { frames: [
      grid(["⬆️ NAIK KE PERMUKAAN…", "🌊 ⬛ ⬛ 🤿", "🫧🫧", "Cahaya makin terang…"]),
      grid(["☀️ PERAHU TIBA!", "☀️ 🌊 🌊", "🤿 😌 ⛵", "Oksigen penuh kembali. Laut menunggumu kembali 🌊"]),
    ], frameMs: fr(0.9), holdMs: fr(0.5) },
  ];
}
