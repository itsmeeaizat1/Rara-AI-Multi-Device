// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-rpg-shapes.js — BENTUK ANIMASI KHAS PER-GAME (9 Sep 2026,
// request owner: "beda game beda plugin = animasi beda bentuk, khas
// game itu sendiri").
//
// Tiap shape di sini sengaja BEDA BENTUK total satu sama lain & beda dari
// rpgScene (frame tahapan ▰▱), nguli (timeline tumbuh), pet (hati HP):
//   ⛏️ mining       → GALI MAKIN DALAM  — penampang tanah makin dalam
//   🪓 nebang       → TIMBER!           — pohon miring pelan sampai tumbang
//   🎣 fishing      → RIAK & TARIKAN    — riak air melebar + float tenggelem
//   🚔 patrol       → RUTE PATROLI      — marker 🚔 maju antar checkpoint
//   🗺️ treasurehunt → PETA MENDEKAT     — 📍 bergerak mendekati ❌ di grid
//   🏰 dungeon      → KORIDOR KE GELAP — koridor memanjang per lantai
//   🐪 berdagang    → RUTE KARAVAN      — 🐪 merangkak di garis jarak
//
// Semua morph edit-in-place (pesan ke-1 di-edit jadi frame berikutnya),
// fallback: kirim frame terbaru sebagai pesan baru bila edit gagal.

import { smallcapsText } from "./styler.js";

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

export const SHAPE_ANIM_MS = Number(process.env.SHAPE_ANIM_MS) || 1200; // knob jeda frame

// ─── core morph: kirim frame[0], edit in place untuk sisanya ───
export async function morphCore(m, sock, frames, delay = SHAPE_ANIM_MS) {
  if (!Array.isArray(frames) || frames.length === 0) return;
  let key = null;
  try {
    const s = await sock?.sendMessage?.(m.chat, { text: frames[0] });
    key = s?.key || null;
  } catch { key = null; }
  if (!key) { try { await m.reply(frames[0]); } catch {} }
  for (let i = 1; i < frames.length; i++) {
    try { await sock?.sendPresenceUpdate?.("composing", m.chat); } catch {}
    await sleepMs(delay);
    if (key) {
      try { await sock.sendMessage(m.chat, { text: frames[i], edit: key }); continue; } catch { key = null; }
    }
    try { await m.reply(frames[i]); } catch {}
  }
}

const hdr = (t) => `${smallcapsText(`「 ✦ ${t} ✦ 」`)}`;

// ══════════════════════════════════════════════════
// ⛏️ MINING — GALI MAKIN DALAM (penampang tanah makin dalam)
// ══════════════════════════════════════════════════
export async function shapeMining(m, sock, delay = SHAPE_ANIM_MS) {
  const layers = ["🟩 rumput", "🟫 humus", "🟫 tanah liat", "🟫 batu kapur", "🟫 batu keras", "⬛ urat bijih"];
  const depths = [0, 3, 7, 12, 18, 24];
  const frames = [];
  for (let i = 0; i < layers.length; i++) {
    const cross = layers.slice(0, i + 1).map((l, j) => `${j === 0 ? "⛰️" : "  "}${"🟫".repeat(Math.min(j + 1, 4))} ${l} — ${depths[j]}m`).join("\n");
    frames.push(
      `${hdr("Gali Makin Dalam")}\n\n⛏️ kedalaman: *${depths[i]}m*\n\n${cross}\n\n⛏️ ${i === 0 ? "mulai menggali..." : i < layers.length - 1 ? "terus menggali..." : "ada kilau di dinding! 💎"}`
    );
  }
  await morphCore(m, sock, frames, delay);
}


// CATATAN (owner, 9 Sep 2026): animasi game lain dibikin SATU-SATU di
// giliran masing-masing — jangan dibatch sekalian, biar tiap bentuk
// benar-benar dikarang khas buat game itu. Antrian: nebang → fishing →
// patrol → treasurehunt → dungeon → berdagang.

// ══════════════════════════════════════════════════
// 🎣 FISHING — RIAK & TARIKAN (khas fishing, batch #2)
// Bentuk: permukaan air dengan riak melebar + float yang
// makin dalam + titik tensi bertambah — bukan bar, bukan frame tahapan.
// ══════════════════════════════════════════════════
export async function shapeFishing(m, sock, delay = SHAPE_ANIM_MS) {
  const frame = (wave, tension, status, note) =>
    `${hdr("Riak & Tarikan")}\n\n` +
    `🌊 ${wave}\n\n` +
    `${"•".repeat(tension)} ${status}\n\n${note}`;
  const frames = [
    frame("〰️〰️〰️〰️〰️", 1, "🎣 float dilempar...", "🌤️ air tenang, sabar ya..."),
    frame("〰️〰️〰️〰️〰️", 2, "🎣 float goyang pelan...", "💧 ada yang nyenggol bawah"),
    frame("🔱〰️〰️〰️〰️", 3, "🎣 float TENGGELEM!", "💥 SAMBARAN! tali melengkung!"),
    frame("🌊🌊🌊🌊🌊", 4, "🎣 tarik-menarik!", "💪 TARIK! JANGAN LEPAS!"),
    frame("🌊🌊🌊🌊🌊", 5, "🐟 KELUAR DARI AIR!", "✨ tangkapan melayang!"),
  ];
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🐪 BERDAGANG — RUTE KARAVAN (khas berdagang, batch #3)
// Bentuk: karavan 🐪 merangkak di garis jarak desa→pasar,
// persen perjalanan = progres. Bukan bar, bukan grid, bukan riak.
// ══════════════════════════════════════════════════
export async function shapeDagang(m, sock, from = "Desa Asal", to = "Desa Tujuan", good = "Barang", delay = SHAPE_ANIM_MS) {
  const track = (pct) => {
    const total = 10;
    const pos = Math.round((pct / 100) * total);
    return "🏚️" + "─".repeat(pos) + "🐪" + "─".repeat(Math.max(0, total - pos)) + "🏪";
  };
  const stops = [
    { pct: 0, note: "memuat barang ke karavan..." },
    { pct: 30, note: "nunggangi jalan berbatu..." },
    { pct: 55, note: "istirahat sebentar di pos peristirahatan..." },
    { pct: 80, note: "bedug pasar sudah terdengar!" },
    { pct: 100, note: "TIBA! mulai berteriak jualan! 💰" },
  ];
  const frames = stops.map((s, i) =>
    `${hdr("Rute Karavan")}\n\n${track(s.pct)}\n\n📦 ${good} • ${from} ➜ ${to}\n🧭 Perjalanan : *${s.pct}%*\n\n🐪 ${s.note}`
  );
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🪓 NEBANG — TIMBER! (khas nebang, batch #4)
// Bentuk: ORIENTASI POHON — miring pelan per frame dari tegak
// sampai tumbang. Bukan bar, bukan jarak, bukan kedalaman.
// ══════════════════════════════════════════════════
export async function shapeNebang(m, sock, treeName = "Pohon", treeEmoji = "🌲", delay = SHAPE_ANIM_MS) {
  const frames = [
    `${hdr("Timber!")}\n\n${treeEmoji} ${treeName}\n\n🌳 berdiri tegak...\n🪓 menandai sisi tebang dulu...`,
    `${hdr("Timber!")}\n\n${treeEmoji} ${treeName}\n\n🌳↗ miring 15°\n🪓 AXOKK! serpihan pertama beterbangan!`,
    `${hdr("Timber!")}\n\n${treeEmoji} ${treeName}\n\n🌳↘ miring 45°\n🪓 KRAK! inti batang mulai retak!`,
    `${hdr("Timber!")}\n\n${treeEmoji} ${treeName}\n\n🌳💥 TIMBERRR!!\n🪓 pohon roboh, burung pada kabur!`,
    `${hdr("Timber!")}\n\n${treeEmoji} ${treeName}\n\n🪵🪵🪵\n✅ dipotong jadi kayu siap angkut!`,
  ];
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🗺️ TREASUREHUNT — PETA MENDEKAT (khas treasurehunt, batch #5)
// Bentuk: navigasi GRID — 📍 bergerak kotak-per-kotak mendekati ❌
// (X marks the spot), jarak countdown = progres.
// ══════════════════════════════════════════════════
export async function shapeTreasure(m, sock, locName = "Lokasi", delay = SHAPE_ANIM_MS) {
  const grid = (r, c, hit = false) => {
    const rows = [];
    for (let y = 0; y < 5; y++) {
      let row = "";
      for (let x = 0; x < 5; x++) {
        if (y === 2 && x === 2) row += hit ? "📍" : "❌";
        else if (y === r && x === c) row += "📍";
        else row += "⬜";
      }
      rows.push(row);
    }
    return rows.join("\n");
  };
  const steps = [
    { r: 0, c: 0, note: "kompas berputar... sinyal lemah" },
    { r: 0, c: 1, note: "jarum kompas menunjuk timur laut" },
    { r: 1, c: 1, note: "deteksi logam makin kuat!" },
    { r: 1, c: 2, note: "SANGAT DEKAT! jangan pindah tangan!" },
    { r: 2, c: 2, hit: true, note: "TEPAT SASARAN! GALI DI SINI! ⛏️" },
  ];
  const dist = (r, c) => Math.max(Math.abs(r - 2), Math.abs(c - 2));
  const frames = steps.map((s) =>
    `${hdr("Peta Mendekat")}\n\n🗺️ ${locName}\n\n${grid(s.r, s.c, s.hit)}\n\n🧭 Jarak ke ❌ : *${s.hit ? 0 : dist(s.r, s.c)} kotak*\n\n${s.note}`
  );
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🛡️ PATROL — RONDA PERIMETER (khas patrol, batch #6)
// Bentuk: pos jaga di perimeter grid 3x3 — 🛡️ jalan
// Utara → Timur → Selatan → Barat (pos = progres).
// ══════════════════════════════════════════════════
export async function shapePatrol(m, sock, delay = SHAPE_ANIM_MS) {
  const posts = [
    { r: 0, c: 1, name: "POS UTARA", note: "memeriksa gerbang utara..." },
    { r: 1, c: 2, name: "POS TIMUR", note: "menyapu kawasan timur dengan senter..." },
    { r: 2, c: 1, name: "POS SELATAN", note: "mengecek jejak mencurigakan di selatan..." },
    { r: 1, c: 0, name: "POS BARAT", note: "pos barat aman! hampir selesai..." },
    { r: 1, c: 1, name: "MARKAS", note: "RONDA SELESAI! lapor ke markas 🫡" },
  ];
  const frames = posts.map((p) => {
    let grid = "";
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (y === p.r && x === p.c) grid += "🛡️";
        else if (y === 1 && x === 1) grid += "🏰";
        else grid += "⬜";
      }
      grid += "\n";
    }
    return `${hdr("Ronda Perimeter")}\n\n${grid}📍 ${p.name}\n\n${p.note}`;
  });
  await morphCore(m, sock, frames, delay);
}
