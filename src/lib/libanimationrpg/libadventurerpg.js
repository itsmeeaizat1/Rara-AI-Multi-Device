// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libadventurerpg.js — LIB ANIMASI EMOJI-GRID khusus Adventure / petualangan
// (upgrade owner 28 Sep 2026 #2: "petualangan = animasinya PALING BANYAK" — cutscene 1 babak 6 frame
//  → EKSPEDISI MULTI-BABAK ~12-13 frame: PERSIAPAN → PERJALANAN peta kompas → BABAK KHAS EVENT
//  (beda event beda animasi; monster/trap babak 3 frame = situasi makin lama) → EPILOG hasil).
// Grid per frame: HUD kompas (arah berputar + tujuan) · jalur landmark (📍, jejak ·, 🏕️) · adegan · status.
// SITUASI MENENTUKAN LEVEL: event ringan = babak 2 frame · event bahaya (monster/trap) = babak 3 frame.
// KHUSUS adventure (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Fallback: playAdventureCinematic false → playPetaAnim (jalur perjalanan doang) → animAdventure (teks lama).

import { editFramesAnim, editSceneAnim } from "../nova-anim-runner.js";

const ANIM_BASE = process.env.ADVENTURE_CINEMATIC_MS !== undefined ? Number(process.env.ADVENTURE_CINEMATIC_MS) : 700;
let _animBaseMs = ANIM_BASE;
export const _setAdventureAnimMsForTest = (ms) => { _animBaseMs = Number(ms) || 0; };
const fr = (x) => Math.round(_animBaseMs * x);
const grid = (lines) => "```\n" + lines.join("\n") + "\n```";
const QQ = "\u201C";

// ── SCENE 2 signature: PETA KOMPAS (khas adventure — 📍 menyusuri jalur landmark, kompas berputar) ──
// ctx: { eventType, landmarks: [emoji...], arahs: [teks arah...] }
export function petaFrames({ eventType, landmarks, arahs }) {
  const LMAP = 10;
  const trail = "·";
  const LM = (landmarks && landmarks.length ? landmarks : ["🌲", "⛰️", "🏕️"]);
  const AR = (arahs && arahs.length ? arahs : ["⬆️", "➡️", "⬇️"]);
  const TUJUAN = String(eventType || "PETUALANGAN").toUpperCase();
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const pos = Math.min(LMAP - 1, f * 2);
    const jalur = Array.from({ length: LMAP }, (_, i) =>
      i === pos ? "📍" : i === LMAP - 1 ? "🏕️" : i < pos ? trail : LM[(i + f) % LM.length]).join("");
    const lewat = Math.max(0, pos); // landmark dilewati = posisi
    const adegan = f === 5
      ? "✨ " + LM[f % LM.length] + " ✨ TIBA DI TUJUAN!"
      : "🗺️ " + AR[f % AR.length] + " 🧭 " + LM[(f + 2) % LM.length] + " " + LM[(f + 4) % LM.length] + " · " + lewat + " langkah";
    const status = f === 5 ? "🏕️ " + TUJUAN + " TERCAPAI! ✨" : "🧭 MENYUSURI JALUR… " + (f + 1) + "/6";
    frames.push(grid(["🧭 " + AR[f % AR.length] + " MENUJU " + TUJUAN, jalur, adegan, status]));
  }
  return frames;
}

export async function playPetaAnim(sock, jid, ctx) {
  try { return await editFramesAnim(sock, jid, petaFrames(ctx), {}); }
  catch (e) { console.error("[anim-adventure] gagal (dilewati senyap):", e); return false; }
}

// ── BABAK KHAS EVENT — beda event beda animasi; monster/trap = 3 frame (situasi bahaya lebih panjang) ──
function babakEventFrames(eventType, LM) {
  const T = String(eventType || "nothing").toLowerCase();
  const g = grid;
  if (T === "monster") return [
    g(["👹 BAYANGAN BESAR DI ANTARA POHON…", LM[0] + " 👹 " + LM[1], "🫠 Hening. Terlalu hening."]),
    g(["⚔️ KAU MENARIK SENJATAMU!", "⚔️ 💥 👹", "Debu beterbangan — adu ketat!"]),
    g(["💨 DEBU MEREDA…", LM[0] + " 💨 " + LM[1], "Bayangan itu mundur. Kamu bernapas lagi."]),
  ];
  if (T === "trap") return [
    g(["🕳️ TANAH TERASA GEMPAL…", "· · 🕳️ · ·", "Satu langkah lagi dan semuanya runtuh."]),
    g(["🤸 MELONCAT SEKUAT TENAGA!", "🤸 💨 🕳️", "Punggungmu terasa ringan — hampir!"]),
    g(["🌿 AMAN DI SEBERANG!", "🕳️ 🤸 🌿", "Jerat tua itu tertutup rumah. Nasib bagus."]),
  ];
  if (T === "treasure") return [
    g(["✨ SESUATU BERKILAU DI AKAR POHON…", LM[0] + " ✨ 🪓", "Kau menyingsingkan lengan."]),
    g(["💥 PETI TUA TERBUKA!", "⛏️ 💥 ✨ 💎", "Emas dan permata memantulkan mataharimu."]),
  ];
  if (T === "merchant") return [
    g(["🛒 KAFILAH DARI ARAH BERLAWANAN…", "🐪 🛒 🐪", QQ + "Pendaki! Mau lihat barang langka?" + QQ]),
    g(["🤝 TAWAR-MENAWAR PANJANG", "🤝 ✨ 🛒", "Kesepakatan tercapai — tali dibuka."]),
  ];
  if (T === "shrine") return [
    g(["⛩️ GERBANG KAYU TUA TERLIHAT…", "⛩️ 🌿 ⛩️", "Hawanya hangat. Jauh lebih tua dari peta."]),
    g(["🙏 BERKAH CAHAYA", "⛩️ ✨ 🙏 ✨", "Kau berlutut sebentar. Bahu terasa ringan."]),
  ];
  return [
    g(["🌫️ JALUR SEMAKIN SUNYI…", LM[0] + " 🌫️ " + LM[1], "Cuma suara sepatumu sendiri."]),
    g(["🤷 TAK ADA APA-APA DI SINI", "🌫️ 🤷 🌫️", "Petualangan kadang begini juga — dan itu oke."]),
  ];
}

// ── EKSPEDISI MULTI-BABAK (animasi paling banyak di antara game — petualangan!) ──
// ctx: { eventType, landmarks, arahs } → [PERSIAPAN 2 · PERJALANAN 6 · BABAK EVENT 2-3 · EPILOG 2]
export function adventureCinematic(ctx) {
  const LM = (ctx.landmarks && ctx.landmarks.length ? ctx.landmarks : ["🌲", "⛰️", "🏕️"]);
  const AR = (ctx.arahs && ctx.arahs.length ? ctx.arahs : ["⬆️", "➡️", "⬇️"]);
  const TUJUAN = String(ctx.eventType || "PETUALANGAN").toUpperCase();
  const scenes = [];
  // SCENE 1 — PERSIAPAN: bekal & kompas
  scenes.push({ frames: [
    grid(["🎒 BEKAL DICEK…", "🍞 💧 🗺️ 🧭", "Semua pas. Punggung pas."]),
    grid(["🧭 KOMPAS DITITIKKAN…", "🧭 " + AR[0], QQ + "Arah " + TUJUAN + "… jarak jauh, tapi kaki kita muda." + QQ]),
  ], frameMs: fr(0.9), holdMs: fr(0.4) });
  // SCENE 2 — PERJALANAN peta kompas (signature adventure)
  scenes.push({ frames: petaFrames({ eventType: ctx.eventType, landmarks: ctx.landmarks, arahs: ctx.arahs }), frameMs: fr(0.85), holdMs: fr(0.5) });
  // SCENE 3 — BABAK KHAS EVENT (beda event beda animasi; monster/trap lebih panjang)
  scenes.push({ frames: babakEventFrames(ctx.eventType, LM), frameMs: fr(0.95), holdMs: fr(0.7) });
  // SCENE 4 — EPILOG: hasil & penutup
  scenes.push({ frames: [
    grid(["🏕️ BERPACU DI KEMAH…", "🏕️ 🔥 🍢", "Kaki ditinggikan. Api kecil. Kisah besar."]),
    grid(["✨ PETUALANGAN SELESAI! " + AR[1], "🧭 ✨ 🎒", TUJUAN + " — hasil menyusul di kartu!"]),
  ], frameMs: fr(1), holdMs: fr(1) });
  return scenes;
}

export async function playAdventureCinematic(sock, jid, ctx) {
  try { return await editSceneAnim(sock, jid, adventureCinematic(ctx), {}); }
  catch (e) { console.error("[anim-adventure] gagal (dilewati senyap):", e); return false; }
}
