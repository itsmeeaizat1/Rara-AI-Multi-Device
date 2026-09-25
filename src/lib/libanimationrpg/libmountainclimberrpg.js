// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmountainclimberrpg.js — LIB ANIMASI CINEMATIC khusus Mountainclimber / gunung (owner 25 Sep 2026)
// Gaya cuplikan Nintendo: cutscene multi-babak via EDIT BERULANG satu pesan, durasi OTOMATIS nyesuaikan situasi
// (zona makin tinggi → babak daki makin panjang · event/gua/puncak nambah babak · longsor versi dramatis sendiri).
// Isinya MURNI KODE ANIMASI: pure scene-builder dari ctx (gak import plugin, gak ada logic game di sini).
// Konvensi folder src/lib/libanimationrpg/: file lib<namagame>rpg.js, satu lib per game, animasi BEDA antar game —
// gunung = SIDE-SCROLLING DAKI (2 baris: pemandangan + lintasan, jejak ⬜), warung = antrean pelanggan, palung = selam vertikal.
// Fallback channel gak dukung edit → editSceneAnim return false → playGunungCinematic senyap lanjut.

import { editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.GUNUNG_CINEMATIC_MS !== undefined ? Number(process.env.GUNUNG_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setMountainclimberAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

// pemandangan & lintasan bioma sesuai level (visual murni animasi)
const BIOMA_CLIMB = [
  { tanah: "🟩", adegan: ["🌲", "🌳", "⛰️"], char: "🏃" },
  { tanah: "🟫", adegan: ["🪨", "🏜️", "⛰️"], char: "🏃" },
  { tanah: "⬜", adegan: ["❄️", "🏔️", "☃️"], char: "🧗" },
];
const biomaOf = (level) => BIOMA_CLIMB[level >= 20 ? 2 : level >= 8 ? 1 : 0];

// ── mesin putar: sistem edit berulang (satu pesan, frame demi frame) ──
export async function playGunungCinematic(sock, jid, scenes) {
  try { return await editSceneAnim(sock, jid, scenes, {}); }
  catch (e) { console.error("[anim-gunung] gagal (dilewati senyap):", e); return false; }
}

// ── SCENE 2 signature: lintasan daki side-scrolling (khas gunung — BEDA dari semua game) ──
// durasi nyesuaikan: makin tinggi zona target, makin panjang babaknya (4 + min(zona,6) frame)
function lintasanFrames(ctx) {
  const b = biomaOf(ctx.level || 1);
  const char = ctx.aksi === "panjat" ? "🧗" : b.char;
  const cuacaTxt = (ctx.cuacaIcon || "") + " " + (ctx.cuaca || "");
  const tiles = 12;
  const steps = 3 + Math.min(ctx.zona || 1, 5);
  const frames = [];
  for (let f = 1; f <= steps; f++) {
    const pos = Math.min(tiles - 1, f * 2);
    const trail = "⬜".repeat(Math.max(0, pos - 1));
    const depan = b.tanah.repeat(Math.max(0, tiles - 1 - pos));
    const adegan = Array.from({ length: 6 }, (_, i) => b.adegan[(i + f) % b.adegan.length]).join(" ");
    frames.push("```\n" + cuacaTxt + "  ZONA " + (ctx.zona || 1) + "/8\n" + adegan + "\n" + trail + char + depan + "\n```");
  }
  return frames;
}

// ── cinematic DAKI SUKSES (diputar sebelum kartu hasil zona) ──
// ctx: { level, zona, zonaNama, aksi, cuacaIcon, cuaca, events: [harta|kristal|npc|serangan], gua, gold, rombongan, risiko }
export function dakiCinematic(ctx) {
  const scenes = [];
  // SCENE 1 — basecamp: cek peralatan + jalur
  scenes.push({ frames: [
    "```\n🏕️ BASECAMP\n" + QQ + "Cek tali… cek sepatu… SIAP!\n" + (ctx.cuacaIcon || "☀️") + " Cuaca hari ini: " + (ctx.cuaca || "cerah") + "\n```",
    "```\n🏕️ ➜ " + (ctx.zonaNama || "ZONA BERIKUTNYA") + "\n" + (ctx.risiko ? "⚡ Jalur RISIKO dilirik…" : "🥾 Jalur aman dipilih…") + (ctx.rombongan ? "\n🤝 Rombongan ikut: loot +20%!" : "") + "\n```",
  ], frameMs: fr(1), holdMs: fr(0.7) });
  // SCENE 2 — lintasan daki (durasi ∝ zona)
  scenes.push({ frames: lintasanFrames(ctx), frameMs: fr(0.9), holdMs: fr(0.6) });
  // SCENE 3 — event ekstra (tiap event = babak tambahan, animasi makin panjang)
  for (const ev of (ctx.events || []).slice(0, 2)) {
    if (ev === "harta") scenes.push({ frames: [
      "```\n✨ Sesuatu berkilau di celah batu…\n```",
      "```\n💎 PETI HARTA TERSEMBUNYI DIBUKA!\nGold ekstra melompat ke tas!\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "kristal") scenes.push({ frames: [
      "```\n❄️ Sinar aneh dari tebing es…\n```",
      "```\n💎 KRISTAL PUNCAK ditemukan!\nDimasukkan hati-hati ke kantong.\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "npc") scenes.push({ frames: [
      "```\n🧙 Sosok aneh di tikungan jalur…\n```",
      "```\n🧙 " + QQ + "Diskon besok, pendaki muda!" + QQ + "\nIa menghilang di balik kabut.\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "serangan") scenes.push({ frames: [
      "```\n🦅 Bayangan besar melintas…\n```",
      "```\n🦅 ELANG MENYAMBAR!\nKamu meringkuk — stamina terkuras!\n```",
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
  }
  // SCENE 3b — gua samping rahasia
  if (ctx.gua) scenes.push({ frames: [
    "```\n🕳️ Celah gelap di sisi jalur…\nAngin dari dalam. Bau petualangan.\n```",
    "```\n🤔 MASUK yang ada harta? ATAU LEWAT yang aman?\nKeputusan ada di tanganmu…\n```",
  ], frameMs: fr(0.9), holdMs: fr(0.6) });
  // SCENE 4 — hasil: zona capai + gold berdetak naik
  const g = Math.max(0, ctx.gold || 0);
  scenes.push({ frames: [
    "```\n🏔️ " + (ctx.zonaNama || "ZONA") + " TERCAPAI!\nZona " + (ctx.zona || 1) + "/8\n```",
    "```\n🪙 Gold berdetak…\n+" + Math.floor(g / 3) + "…\n```",
    "```\n🪙 +" + g + " ✅\n" + (ctx.aksi === "panjat" ? "🧗 Panjat berhasil!" : "🥾 Daki selesai!") + "\n```",
  ], frameMs: fr(0.95), holdMs: fr(0.9) });
  return scenes;
}

// ── cinematic PUNCAK (momen paling megah — babak terbanyak & terlama) ──
export function puncakCinematic(ctx) {
  const scenes = [];
  // SCENE 1: daki final — momen paling berat
  scenes.push({ frames: [
    "```\n🥾 Langkah terakhir…\nUdara tipis. Napas pendek.\n```",
    "```\n🧗 Jari membeku di bibir puncak…\nTarik… angkat… !!!\n```",
    "```\n😌 Udara… sunyi… SEBENTAR LAGI.\n```",
    "```\n🧗 Tangan terakhir melampaui bibir tebing…\nKamu MELIHATNYA.\n```",
  ], frameMs: fr(1.1), holdMs: fr(1) });
  // SCENE 2: bendera + matahari terbit (momen paling megah)
  scenes.push({ frames: [
    "```\n🚩 BENDERA TERTANCAP!\nAngin membawa namamu ke seluruh lembah.\n```",
    "```\n🌅 Matahari terbit di bawah kakimu.\nSegalanya kecil, kecuali hatimu.\n```",
    "```\n❄️→🌤️ Awan berarak memberi jalan.\nKamu berdiri di atap dunia.\n```",
    "```\n🏔️ " + (ctx.gunungNama || "PUNCAK") + " DITAKLUKKAN!\n🏆 Puncak ke-" + (ctx.puncak || 1) + "\n```",
  ], frameMs: fr(1.2), holdMs: fr(1.2) });
  // SCENE 3: selebrasi puncak
  scenes.push({ frames: [
    "```\n🎉🎉🎉\nSELURUH LEMBAH BERSORAK (katanya).\n```",
    "```\n📸 FOTO DULU, pendaki!\nBaterai HP beku, tapi kenangan abadi.\n```",
    "```\n😌 Hening puncak.\nKamu menikmatinya sendirian dulu.\n```",
  ], frameMs: fr(1), holdMs: fr(1) });
  // SCENE 4: hadiah puncak berdetak
  const g = Math.max(0, ctx.gold || 0);
  scenes.push({ frames: [
    "```\n🎁 Hadiah puncak berdetak…\n🪙 +" + Math.floor(g / 2) + "…\n```",
    "```\n🎁 🪙 +" + g + " ✅ · 💎 +3 Kristal\n```",
    "```\n♻️ Prestasi menanti:\nGunung baru, cerita baru.\n```",
    "```\n🏔️ LEGENDA BARU BERDIRI.\nPendakian selesai.\n```",
  ], frameMs: fr(1.1), holdMs: fr(1.4) });
  return scenes;
}

// ── cinematic LONSOR (versi dramatis pendek tapi kerasa) ──
export function longsorCinematic(ctx) {
  return [
    { frames: [
      "```\n" + (ctx.cuacaIcon || "⛈️") + " Tanah bergetar pelan…\n…terlalu pelan untuk disalahkan.\n```",
      "```\n⛰️ LONSOR! BATU MENGELINDING!\nKamu lari ke balik tebing!\n```",
      "```\n💨 Debu mereda…\nKamu turun ke zona " + (ctx.zonaKe || 1) + ".\nJalur tetap ada di atas sana.\n```",
    ], frameMs: fr(1.1), holdMs: fr(1.2) },
  ];
}

// ── cinematic PORTIR MENYELAMATKAN ──
export function portirCinematic(ctx) {
  return [
    { frames: [
      "```\n⛰️ LONSOR DATANG DI ZONA " + (ctx.zona || 1) + "!\nSemua terasa terlambat…\n```",
      "```\n🧑‍🌾 DUA TANGAN KOKOH MENEHAN BAHUMU!\nTali portir terkait di pinggangmu!\n```",
      "```\n🫡 Kenanga mengangguk pulang.\nKamu TETAP di posisi. Selamat, pendaki!\n```",
    ], frameMs: fr(1), holdMs: fr(0.8) },
  ];
}

// ── cinematic BASECAMP MULAI (diputar saat user baru terdaftar) ──
export function basecampCinematic(ctx) {
  return [
    { frames: [
      "```\n🥾 Sebuah perjalanan dimulai…\nKaki melangkah ke kaki gunung.\n```",
      "```\n🏕️ BASECAMP TIBA!\n" + (ctx.gunungNama || "Gunung Legenda") + " menanti di atas sana.\n```",
    ], frameMs: fr(1), holdMs: fr(0.5) },
  ];
}
