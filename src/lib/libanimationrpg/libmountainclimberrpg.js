// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmountainclimberrpg.js — LIB ANIMASI EMOJI-GRID khusus Mountainclimber / gunung
// (upgrade owner 28 Sep 2026: OPEN WORLD PER NEGARA — beda negara beda animasi, durasi TIDAK buru-buru:
//  SITUASI MENENTUKAN LEVEL ANIMASI — zona + jalur risiko + cuaca buruk memperpanjang babak lintasan,
//  3 + min(situasi, 8) frame, tempo diperlambat fr(1.0) — pendakian "butuh berapa waktu, butuhlah")
// Tiap frame = grid 3-4 baris: HUD (negara/zona/cuaca/jalur) · langit & pemandangan KHAS NEGARA ·
// lintasan daki (jejak ⬜) · status aksi. Rintangan 🪨 + lompat ⬆️ (zona 4+), panjat 🧗 + HUD 🫁 (zona 6+),
// impact 💥✨🔥 di momen kritis, frame status dramatis (🏆/⬇️/🫡).
// Isinya MURNI KODE ANIMASI: pure scene-builder dari ctx (gak import plugin, gak ada logic game di sini).
// Konvensi folder src/lib/libanimationrpg/: file lib<namagame>rpg.js per game, animasi BEDA antar game —
// gunung = SIDE-SCROLLING DAKI (jejak ⬜, char melintas tile). Fallback: editSceneAnim false → senyap lanjut.

import { editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.GUNUNG_CINEMATIC_MS !== undefined ? Number(process.env.GUNUNG_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setMountainclimberAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const QQ = "\u201C"; // kutip pintar dekoratif dialog cutscene

// ── OPEN WORLD: preset visual per negara (id sama dengan COUNTRIES di plugins/rpg/gunung.js) ──
// Beda negara = beda langit/pemandangan, tanah, dan karakter daki. Unknown id → Indonesia.
const NEGARA_CLIMB = {
  indonesia: { nama: "INDONESIA", emoji: "🇮🇩", langit: ["🌴", "🌋", "⛺"], tanah: "🟩", char: "🥾" },
  jepang: { nama: "JEPANG", emoji: "🇯🇵", langit: ["🌸", "🗻", "⛩️"], tanah: "🟩", char: "🥾" },
  jerman: { nama: "JERMAN", emoji: "🇩🇪", langit: ["🌲", "🏰", "🦌"], tanah: "🟫", char: "🥾" },
  china: { nama: "CHINA", emoji: "🇨🇳", langit: ["🧊", "🥶", "🏔️"], tanah: "⬜", char: "🧗" },
  dunia: { nama: "7 PUNCAK DUNIA", emoji: "🌍", langit: ["🌍", "🧊", "☀️"], tanah: "⬜", char: "🧗" },
};
const negaraOf = (id) => NEGARA_CLIMB[id] || NEGARA_CLIMB.indonesia;

const CUACA_FX = { cerah: "☀️", mendung: "☁️", hujan: "🌧️", badai: "⚡", "badai-es": "❄️" };

const grid = (lines) => "```\n" + lines.join("\n") + "\n```";

// ── mesin putar: sistem edit berulang (satu pesan, frame demi frame) ──
export async function playGunungCinematic(sock, jid, scenes) {
  try { return await editSceneAnim(sock, jid, scenes, {}); }
  catch (e) { console.error("[anim-gunung] gagal (dilewati senyap):", e); return false; }
}

// ── SCENE 2 signature: GRID DAKI side-scrolling (khas gunung — BEDA dari semua game) ──
// 4 baris grid: HUD negara+zona · langit khas negara · lintasan(+status).
// DURASI ∝ SITUASI (owner 28 Sep: "jangan buru-buru — butuh berapa waktu, butuhlah"):
//   level animasi = zona + jalur risiko(+1) + cuaca badai/badai-es(+1) → steps = 3 + min(level, 8).
//   Zona 2 cerah aman = 5 frame · zona 8 badai-es risiko = 11 frame. Tempo fr(1.0), pelan sedari awal.
function lintasanFrames(ctx) {
  const N = negaraOf(ctx.country);
  const zona = ctx.zona || 1;
  const panjat = ctx.aksi === "panjat" || zona >= 6;
  const char = panjat ? "🧗" : N.char;
  const tiles = 12;
  const situasi = zona + (ctx.risiko ? 1 : 0) + ((ctx.cuaca === "badai" || ctx.cuaca === "badai-es") ? 1 : 0);
  const steps = 3 + Math.min(situasi, 8);
  const fx = CUACA_FX[ctx.cuaca] || "☀️";
  const hud = N.emoji + " ZONA " + zona + "/8 · " + (ctx.risiko ? "⚡ RISIKO" : "🛡️ AMAN") + (panjat ? " · 🫁 OKS" : "");
  const hasRock = zona >= 4;
  const frames = [];
  let pos = 0;
  while (frames.length < steps) {
    const at = Math.min(pos, tiles - 1);
    const sky = Array.from({ length: 4 }, (_, i) => N.langit[(i + frames.length + 1) % N.langit.length]).join("  ") + "  " + fx;
    const trail = "⬜".repeat(at);
    const depan = N.tanah.repeat(Math.max(0, tiles - 1 - at));
    const jump = hasRock && (at === 4 || at === 7) && frames.length < steps - 1;
    if (jump) {
      frames.push(grid([hud, sky, trail + "⬆️🪨" + N.tanah.repeat(Math.max(0, tiles - 2 - at)), "🪨 Rintangan! LOMPAT!"]));
      pos += 3;
    } else {
      frames.push(grid([hud, sky, trail + char + depan, panjat ? "🧗 Menanjak tebing…" : "🥾 Melangkah…"]));
      pos += 2;
    }
  }
  return frames;
}

// ── cinematic DAKI SUKSES (diputar sebelum kartu hasil zona) ──
// ctx: { level, zona, zonaNama, aksi, cuacaIcon, cuaca, events: [harta|kristal|npc|serangan], gua, gold,
//        rombongan, risiko, country, gunungNama }
export function dakiCinematic(ctx) {
  const N = negaraOf(ctx.country);
  const langitRow = N.langit.join("  ") + "  ⛺🔥";
  const scenes = [];
  // SCENE 1 — BASECAMP grid: negara + target gunung + cek peralatan + jalur
  scenes.push({ frames: [
    grid(["🏕️ BASECAMP " + N.emoji + " " + N.nama, langitRow, "🎒🥾 ✓", QQ + "Cek tali… cek sepatu… SIAP!" + QQ]),
    grid([(ctx.cuacaIcon || "☀️") + " CUACA: " + (ctx.cuaca || "cerah").toUpperCase() + " · ⛰️ " + (ctx.gunungNama || "GUNUNG"), langitRow, "➡️➜ " + (ctx.zonaNama || "ZONA BERIKUTNYA"), (ctx.risiko ? "⚡ Jalur RISIKO dilirik…" : "🛡️ Jalur aman dipilih…") + (ctx.rombongan ? "\n🤝 Rombongan ikut: loot +20%!" : "")]),
  ], frameMs: fr(1), holdMs: fr(0.7) });
  // SCENE 2 — GRID DAKI (durasi ∝ SITUASI: zona/risiko/cuaca; rintangan zona 4+, panjat zona 6+)
  scenes.push({ frames: lintasanFrames(ctx), frameMs: fr(1), holdMs: fr(0.7) });
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
    grid(["🏔️ " + (ctx.zonaNama || "ZONA") + " TERCAPAI! " + N.emoji, langitRow, "💥 💪", "Zona " + (ctx.zona || 1) + "/8"]),
    grid(["🪙 GOLD BERDETAK…", "+" + Math.floor(g / 3) + "…", "…"]),
    grid(["🪙 +" + g + " ✅", (ctx.aksi === "panjat" ? "🧗 Panjat berhasil!" : "🥾 Daki selesai!")]),
  ], frameMs: fr(0.95), holdMs: fr(0.9) });
  return scenes;
}

// ── cinematic PUNCAK (momen paling megah — babak terbanyak & terlama, grid dramatis) ──
// ctx: { gunungNama, puncak, gold, country }
export function puncakCinematic(ctx) {
  const N = negaraOf(ctx.country);
  const scenes = [];
  // SCENE 1: daki final malam menuju fajar — udara tipis
  scenes.push({ frames: [
    grid(["🌑 DAKI FINAL — UDARA TIPIS " + N.emoji, "⭐    🌑", "🧗 🪨🪨🪨🪨", "🫁… Napas pendek…"]),
    grid(["🌑 JARI MEMBEKU", "⭐  🌑  ⭐", "🧗 🪨🪨🪨🪨", "Tarik… angkat… !!!"]),
    grid(["🌬️ ANGIN MEMOTONG WAJAH", "⭐ 🌑 ⭐", "🧗 🪨🪨🪨", "Setiap langkah sewaktu sejam."]),
    grid(["🌓 BIBIR TEBING TERLIHAT…", "🌑 → 🌅", "🧗 🪨🪨🏁", "Kamu MELIHATNYA."]),
    grid(["🪢 TALI TERAKHIR… TARIK!", "🌅  🪢", "🧗 🪨🏁", "Sebelas jari, satu tujuan."]),
    grid(["🌅 SEBENTAR LAGI…", "🌅  ⭐", "🧗 🪨🏁", "Tangan terakhir melampaui bibir tebing…"]),
  ], frameMs: fr(1.1), holdMs: fr(1) });
  // SCENE 2: bendera + matahari terbit (momen paling megah)
  scenes.push({ frames: [
    grid(["🚩 BENDERA TERTANCAP! " + N.emoji, "🌅 🚩 🏔️", "🧍 ✋", "Angin membawa namamu ke seluruh lembah."]),
    grid(["🌅 MATAHARI TERBIT DI BAWAH KAKIMU", "🌅 ☀️ " + N.langit[0], "🏔️ 🚩 🧍", "Segalanya kecil, kecuali hatimu."]),
    grid(["✨ AWAN BERARAK MEMBERI JALAN", "☁️ ☁️ ☁️", "🏔️ 🚩 🧍", "Kamu berdiri di atap dunia."]),
    grid(["🌤️ LANGIT " + N.nama + " TERBUKA", N.langit.join("  ") + "  ☀️", "🏔️ 🚩 🧍", "Dari sini " + N.nama + " terlihat utuh."]),
    grid(["🏆 " + (ctx.gunungNama || "PUNCAK") + " DITAKLUKKAN! " + N.emoji, "🏔️ 🚩 ✨", "🧍 📸", "🏆 Puncak ke-" + (ctx.puncak || 1)]),
  ], frameMs: fr(1.2), holdMs: fr(1.2) });
  // SCENE 3: selebrasi puncak
  scenes.push({ frames: [
    grid(["🎉 SELEBRASI!", "🎉 🎉 🎉", "🧍 ✋", "Seluruh lembah bersorak (katanya)."]),
    grid(["📸 FOTO DULU, PENDAKI!", "🏔️ 🧍 📸", "Baterai HP beku, kenangan abadi."]),
    grid(["😌 HENING PUNCAK", "🏔️", "🧍", "Kamu menikmatinya sendirian dulu."]),
    grid(["🌄 PANORAMA 360°", N.langit.join("  ") + "  🏔️", "Semua arah adalah turunan."]),
  ], frameMs: fr(1), holdMs: fr(1) });
  // SCENE 4: hadiah puncak berdetak + status dramatis penutup
  const g = Math.max(0, ctx.gold || 0);
  scenes.push({ frames: [
    grid(["🎁 HADIAH PUNCAK BERDETAK…", "🎁 ✨", "🪙 +" + Math.floor(g / 2) + "…"]),
    grid(["🎁 🪙 +" + g + " ✅ · 💎 +3 KRISTAL", "🪙 💎"]),
    grid(["♻️ PRESTASI MENANTI", "Gunung baru, cerita baru."]),
    grid(["🏔️ LEGENDA BARU BERDIRI. " + N.emoji, "🏆 ✨", "Pendakian selesai."]),
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
  const N = negaraOf(ctx.country);
  return [
    { frames: [
      grid(["🥾 SEBUAH PERJALANAN DIMULAI… " + N.emoji, "⛰️ 🌲 🌲", "… 🥾 …", "Kaki melangkah ke kaki gunung."]),
      grid(["🏕️ BASECAMP TIBA!", "🌲 ⛺ 🔥 🌲", "🧍 🎒", (ctx.gunungNama || "Gunung Legenda") + " menanti di atas sana."]),
    ], frameMs: fr(1), holdMs: fr(0.5) },
  ];
}
