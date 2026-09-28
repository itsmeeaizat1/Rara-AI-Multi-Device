// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmountainclimberrpg.js — LIB ANIMASI EMOJI-GRID khusus Mountainclimber / gunung
// (upgrade owner 28 Sep 2026: cutscene teks → GRID EMOJI FRAME-BY-FRAME ala "scene situasional")
// Tiap frame = grid 3-4 baris: HUD (zona/cuaca/jalur) · pemandangan bioma · lintasan daki (jejak ⬜) · status aksi.
// Animasi KONTEKSTUAL: babak makin panjang di zona tinggi, rintangan 🪨 + lompat ⬆️ (zona 4+),
// panjat 🧗 + HUD 🫁 oksigen (zona 6+), impact 💥✨🔥 di momen kritis, frame status dramatis (🏆/⬇️/🫡).
// Isinya MURNI KODE ANIMASI: pure scene-builder dari ctx (gak import plugin, gak ada logic game di sini).
// Konvensi folder src/lib/libanimationrpg/: file lib<namagame>rpg.js per game, animasi BEDA antar game —
// gunung = SIDE-SCROLLING DAKI (jejak ⬜, char melintas tile). Fallback: editSceneAnim false → senyap lanjut.

import { editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.GUNUNG_CINEMATIC_MS !== undefined ? Number(process.env.GUNUNG_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setMountainclimberAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

// pemandangan & lintasan bioma sesuai level (visual murni animasi)
const BIOMA_CLIMB = [
  { tanah: "🟩", adegan: ["🌲", "🌳", "⛰️"], char: "🥾" },
  { tanah: "🟫", adegan: ["🪨", "🏜️", "⛰️"], char: "🥾" },
  { tanah: "⬜", adegan: ["❄️", "🏔️", "☃️"], char: "🧗" },
];
const biomaOf = (level) => BIOMA_CLIMB[level >= 20 ? 2 : level >= 8 ? 1 : 0];
const CUACA_FX = { cerah: "☀️", mendung: "☁️", hujan: "🌧️", badai: "⚡", "badai-es": "❄️" };

const grid = (lines) => "```\n" + lines.join("\n") + "\n```";

// ── mesin putar: sistem edit berulang (satu pesan, frame demi frame) ──
export async function playGunungCinematic(sock, jid, scenes) {
  try { return await editSceneAnim(sock, jid, scenes, {}); }
  catch (e) { console.error("[anim-gunung] gagal (dilewati senyap):", e); return false; }
}

// ── SCENE 2 signature: GRID DAKI side-scrolling (khas gunung — BEDA dari semua game) ──
// 3 baris grid: HUD · pemandangan · lintasan(+status). Rintangan 🪨 zona 4+ dengan lompatan ⬆️,
// panjat 🧗 + HUD oksigen zona 6+, cuaca tampil di HUD + langit. Durasi ∝ zona (3 + min(zona,5) frame).
function lintasanFrames(ctx) {
  const b = biomaOf(ctx.level || 1);
  const zona = ctx.zona || 1;
  const panjat = ctx.aksi === "panjat" || zona >= 6;
  const char = panjat ? "🧗" : b.char;
  const tiles = 12;
  const steps = 3 + Math.min(zona, 5);
  const fx = CUACA_FX[ctx.cuaca] || "☀️";
  const hud = (ctx.cuacaIcon || fx) + " ZONA " + zona + "/8 · " + (ctx.risiko ? "⚡ RISIKO" : "🛡️ AMAN") + (panjat ? " · 🫁 OKS" : "");
  const hasRock = zona >= 4;
  const frames = [];
  let pos = 0;
  while (frames.length < steps) {
    const at = Math.min(pos, tiles - 1);
    const sky = Array.from({ length: 4 }, (_, i) => b.adegan[(i + frames.length + 1) % b.adegan.length]).join("  ") + "  " + fx;
    const trail = "⬜".repeat(at);
    const depan = b.tanah.repeat(Math.max(0, tiles - 1 - at));
    const jump = hasRock && (at === 4 || at === 7) && frames.length < steps - 1;
    if (jump) {
      frames.push(grid([hud, sky, trail + "⬆️🪨" + b.tanah.repeat(Math.max(0, tiles - 2 - at)), "🪨 Rintangan! LOMPAT!"]));
      pos += 3;
    } else {
      frames.push(grid([hud, sky, trail + char + depan, panjat ? "🧗 Menanjak tebing…" : "🥾 Melangkah…"]));
      pos += 2;
    }
  }
  return frames;
}

// ── cinematic DAKI SUKSES (diputar sebelum kartu hasil zona) ──
// ctx: { level, zona, zonaNama, aksi, cuacaIcon, cuaca, events: [harta|kristal|npc|serangan], gua, gold, rombongan, risiko }
export function dakiCinematic(ctx) {
  const scenes = [];
  // SCENE 1 — BASECAMP grid: cek peralatan + jalur
  scenes.push({ frames: [
    grid(["🏕️ BASECAMP", "🌲  ⛺  🔥  🌲", "🎒🥾 ✓", QQ + "Cek tali… cek sepatu… SIAP!" + QQ]),
    grid([(ctx.cuacaIcon || "☀️") + " CUACA: " + (ctx.cuaca || "cerah").toUpperCase(), "🌲 ⛺🔥 🌲", "➡️➜ " + (ctx.zonaNama || "ZONA BERIKUTNYA"), (ctx.risiko ? "⚡ Jalur RISIKO dilirik…" : "🛡️ Jalur aman dipilih…") + (ctx.rombongan ? "\n🤝 Rombongan ikut: loot +20%!" : "")]),
  ], frameMs: fr(1), holdMs: fr(0.7) });
  // SCENE 2 — GRID DAKI (durasi ∝ zona, rintangan zona 4+, panjat zona 6+)
  scenes.push({ frames: lintasanFrames(ctx), frameMs: fr(0.9), holdMs: fr(0.6) });
  // SCENE 3 — event ekstra (tiap event = babak grid tambahan)
  for (const ev of (ctx.events || []).slice(0, 2)) {
    if (ev === "harta") scenes.push({ frames: [
      grid(["✨ SESUATU BERKILAU DI CELAH BATU…", "🪨 🪨 ✨ 🪨", "🥾 👀", "Menggali hati-hati…"]),
      grid(["💎 PETI HARTA DIBUKA!", "📦 💥 ✨", "🥾 🤩 💎", "Gold ekstra melompat ke tas!"]),
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "kristal") scenes.push({ frames: [
      grid(["❄️ SINAR ANEH DARI TEBING ES…", "🧊 ✨ 🧊", "🥾 👀", "Mendekat pelan-pelan…"]),
      grid(["💎 KRISTAL PUNCAK DITEMUKAN!", "🧊💎🧊", "🥾 🤩", "Dimasukkan hati-hati ke kantong."]),
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "npc") scenes.push({ frames: [
      grid(["🧙 SOSOK ANEH DI TIKUNGAN…", "🌲 🧙 🌲", "🥾 ⁉️", "Ia melambai pelan…"]),
      grid(["🧙 " + QQ + "Diskon besok, pendaki muda!" + QQ, "🌲 🧙💨 🌲", "🥾 👋", "Ia menghilang di balik kabut."]),
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
    else if (ev === "serangan") scenes.push({ frames: [
      grid(["🦅 BAYANGAN BESAR MELINTAS…", "🦅  ➡️  ⛰️", "🥾 ⁉️", "Angin kencang tiba-tiba…"]),
      grid(["💥 ELANG MENYAMBAR!", "⛰️ 💥 🦅", "🥾 🛡️", "Kamu meringkuk — stamina terkuras!"]),
    ], frameMs: fr(0.9), holdMs: fr(0.5) });
  }
  // SCENE 3b — gua samping rahasia
  if (ctx.gua) scenes.push({ frames: [
    grid(["🕳️ CELAH GELAP DI SISI JALUR…", "🪨 🕳️ 🪨", "🥾 💨", "Angin dari dalam. Bau petualangan."]),
    grid(["🤔 MASUK ATAU LEWAT?", "🕳️ ⁉️ 🏁", "Keputusan ada di tanganmu…"]),
  ], frameMs: fr(0.9), holdMs: fr(0.6) });
  // SCENE 4 — hasil: zona capai + gold berdetak naik
  const g = Math.max(0, ctx.gold || 0);
  scenes.push({ frames: [
    grid(["🏔️ " + (ctx.zonaNama || "ZONA") + " TERCAPAI!", "🌲 🏁 ✨", "💥 💪", "Zona " + (ctx.zona || 1) + "/8"]),
    grid(["🪙 GOLD BERDETAK…", "+" + Math.floor(g / 3) + "…", "…"]),
    grid(["🪙 +" + g + " ✅", (ctx.aksi === "panjat" ? "🧗 Panjat berhasil!" : "🥾 Daki selesai!")]),
  ], frameMs: fr(0.95), holdMs: fr(0.9) });
  return scenes;
}

// ── cinematic PUNCAK (momen paling megah — babak terbanyak & terlama, grid dramatis) ──
export function puncakCinematic(ctx) {
  const scenes = [];
  // SCENE 1: daki final malam menuju fajar — udara tipis
  scenes.push({ frames: [
    grid(["🌑 DAKI FINAL — UDARA TIPIS", "⭐    🌑", "🧗 🪨🪨🪨🪨", "🫁… Napas pendek…"]),
    grid(["🌑 JARI MEMBEKU", "⭐  🌑  ⭐", "🧗 🪨🪨🪨🪨", "Tarik… angkat… !!!"]),
    grid(["🌓 BIBIR TEBING TERLIHAT…", "🌑 → 🌅", "🧗 🪨🪨🏁", "Kamu MELIHATNYA."]),
    grid(["🌅 SEBENTAR LAGI…", "🌅  ⭐", "🧗 🪨🏁", "Tangan terakhir melampaui bibir tebing…"]),
  ], frameMs: fr(1.1), holdMs: fr(1) });
  // SCENE 2: bendera + matahari terbit (momen paling megah)
  scenes.push({ frames: [
    grid(["🚩 BENDERA TERTANCAP!", "🌅 🚩 🏔️", "🧍 ✋", "Angin membawa namamu ke seluruh lembah."]),
    grid(["🌅 MATAHARI TERBIT DI BAWAH KAKIMU", "🌅 ☀️ ☁️", "🏔️ 🚩 🧍", "Segalanya kecil, kecuali hatimu."]),
    grid(["✨ AWAN BERARAK MEMBERI JALAN", "☁️ ☁️ ☁️", "🏔️ 🚩 🧍", "Kamu berdiri di atap dunia."]),
    grid(["🏆 " + (ctx.gunungNama || "PUNCAK") + " DITAKLUKKAN!", "🏔️ 🚩 ✨", "🧍 📸", "🏆 Puncak ke-" + (ctx.puncak || 1)]),
  ], frameMs: fr(1.2), holdMs: fr(1.2) });
  // SCENE 3: selebrasi puncak
  scenes.push({ frames: [
    grid(["🎉 SELEBRASI!", "🎉 🎉 🎉", "🧍 ✋", "Seluruh lembah bersorak (katanya)."]),
    grid(["📸 FOTO DULU, PENDAKI!", "🏔️ 🧍 📸", "Baterai HP beku, kenangan abadi."]),
    grid(["😌 HENING PUNCAK", "🏔️", "🧍", "Kamu menikmatinya sendirian dulu."]),
  ], frameMs: fr(1), holdMs: fr(1) });
  // SCENE 4: hadiah puncak berdetak + status dramatis penutup
  const g = Math.max(0, ctx.gold || 0);
  scenes.push({ frames: [
    grid(["🎁 HADIAH PUNCAK BERDETAK…", "🎁 ✨", "🪙 +" + Math.floor(g / 2) + "…"]),
    grid(["🎁 🪙 +" + g + " ✅ · 💎 +3 KRISTAL", "🪙 💎"]),
    grid(["♻️ PRESTASI MENANTI", "Gunung baru, cerita baru."]),
    grid(["🏔️ LEGENDA BARU BERDIRI.", "🏆 ✨", "Pendakian selesai."]),
  ], frameMs: fr(1.1), holdMs: fr(1.4) });
  return scenes;
}

// ── cinematic LONSOR (grid dramatis: batu menggelinding + impact) ──
export function longsorCinematic(ctx) {
  return [
    { frames: [
      grid([(ctx.cuacaIcon || "⛈️") + " TANAH BERGETAR PELAN…", "⛰️  🪨  🪨", "🧍 🥾", "…terlalu pelan untuk disalahkan."]),
      grid(["⚡ LONSOR! BATU MENGELINDING!", "🪨🪨 💨 ➡️", "🧍 ⬇️ 💥", "Kamu meringkuk di balik tebing!"]),
      grid(["💨 DEBU MEREDA…", "🌫️  🌫️", "⬇️ TURUN KE ZONA " + (ctx.zonaKe || 1), "Jalur tetap ada di atas sana."]),
    ], frameMs: fr(1.1), holdMs: fr(1.2) },
  ];
}

// ── cinematic PORTIR MENYELAMATKAN (grid: batu ditahan dua tangan kokoh) ──
export function portirCinematic(ctx) {
  return [
    { frames: [
      grid(["⛰️ LONSOR DI ZONA " + (ctx.zona || 1) + "!", "🪨 🪨 ➡️", "🧍 ⁉️", "Semua terasa terlambat…"]),
      grid(["🧑‍🌾 DUA TANGAN KOKOH MENEHAN!", "🪨 ➡️ 🧑‍🌾 ⛔", "💥 DITAHAN!", "Tali portir terkait di pinggangmu!"]),
      grid(["🫡 SELAMAT — POSISI TETAP", "🧑‍🌾 👍", "Kenanga mengangguk pulang.", "Kamu TETAP di posisi. Hebat, pendaki!"]),
    ], frameMs: fr(1), holdMs: fr(0.8) },
  ];
}

// ── cinematic BASECAMP MULAI (diputar saat user baru terdaftar) ──
export function basecampCinematic(ctx) {
  return [
    { frames: [
      grid(["🥾 SEBUAH PERJALANAN DIMULAI…", "⛰️ 🌲 🌲", "… 🥾 …", "Kaki melangkah ke kaki gunung."]),
      grid(["🏕️ BASECAMP TIBA!", "🌲 ⛺ 🔥 🌲", "🧍 🎒", (ctx.gunungNama || "Gunung Legenda") + " menanti di atas sana."]),
    ], frameMs: fr(1), holdMs: fr(0.5) },
  ];
}
