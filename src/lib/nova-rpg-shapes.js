// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-rpg-shapes.js — BENTUK ANIMASI KHAS PER-GAME (9 Sep 2026,
// request owner: "beda game beda plugin = animasi beda bentuk, khas
// game itu sendiri").
//
// Tiap shape di sini sengaja BEDA BENTUK total satu sama lain & beda dari
// rpgScene (frame tahapan ▰▱), nguli (timeline tumbuh), pet (hati HP):
//   ⛏️ mining       → GALI MAKIN DALAM  — penampang tanah makin dalam
//   🪓 nebang       → TIMBER!           — pohon miring pelan sampai tumbang
//   🎣 mancing      → RIAK & TARIKAN    — riak air melebar + float tenggelem
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
// 🎣 MANCING — RIAK & TARIKAN (khas mancing, batch #2)
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

// ══════════════════════════════════════════════════
// 🏰 DUNGEON — TURUN KE KEDALAMAN (khas dungeon, batch #7)
// Bentuk: DESCENT — turun lantai B1→Bn, cahaya lentera
// makin redup per lantai. Jumlah frame = jumlah stage.
// ══════════════════════════════════════════════════
export async function shapeDungeon(m, sock, stages = 3, hasKey = false, delay = SHAPE_ANIM_MS) {
  const flavorByFloor = [
    "gerbang tua berderit terbuka...",
    "lorong lembap, tetesan air terdengar...",
    "desisan dari kegelapan... ini sarang monster!",
    "kilaau barang berkilau di kejauhan...",
    "singgasana raja dungeon... batin berdebar!",
  ];
  const frames = [];
  for (let i = 0; i < stages; i++) {
    const torch = i < 2 ? "🕯️🕯️🕯️" : i === 2 ? "🕯️🕯️" : i === 3 ? "🕯️" : "✨";
    const gate = "🚪" + "⬇️".repeat(i + 1);
    frames.push(
      `${hdr("Turun ke Kedalaman")}\n\n${torch}\n${gate}\n\n` +
      `🏯 Lantai : *B${i + 1}/${stages}*${hasKey ? " 🔑" : ""}\n\n${flavorByFloor[Math.min(i, flavorByFloor.length - 1)]}`
    );
  }
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🌱 BERKEBON — KEBON TUMBUH (khas berkebon, batch #8)
// Bentuk: SIKLUS HIDUP TANAMAN — mode "tanam" (cangkul →
// benih → tunas) & "panen" (tunas → tumbuh → bunga →
// matang → dipanen). Pertumbuhan tanaman = progres.
// ══════════════════════════════════════════════════
export async function shapeBerkebon(m, sock, mode = "tanam", cropName = "Tanaman", delay = SHAPE_ANIM_MS) {
  const row = (mid) => `⬛⬛${mid}⬛⬛`;
  const frames =
    mode === "tanam"
      ? [
          { viz: row("🪓"), note: "mencangkul tanah, bikin alur tanaman..." },
          { viz: row("🕳️"), note: "menanam benih " + cropName + "..." },
          { viz: row("💧"), note: "menyiram benih dengan penuh kasih..." },
          { viz: row("🌱"), note: "tunas muncul! selamat tumbuh ya 🌱" },
        ]
      : [
          { viz: row("🌱"), note: "tunas muda merekah..." },
          { viz: row("🌿"), note: "tanaman makin subur & daun lebat!" },
          { viz: row("🌸"), note: "berbunga! tinggal menunggu matang..." },
          { viz: row("🌾"), note: "MATANG SEMPURNA! siap dipanen!" },
          { viz: row("✂️"), note: "PANEN! hasil kebon ditarik ke keranjang 🧺" },
        ];
  const title = mode === "tanam" ? "Menanam Benih" : "Kebon Tumbuh";
  await morphCore(m, sock, frames.map((f) => `${hdr(title)}\n\n${f.viz}\n\n${f.note}`), delay);
}

// ══════════════════════════════════════════════════
// 🗑️ SAMPAH — GOT BERSIH (khas sampah, batch #9)
// Bentuk: CLEANUP SWEEP — 🧹 menyapu baris sampah,
// tiap frame sampah terkumpul jadi ♻️ sampai bersih.
// ══════════════════════════════════════════════════
export async function shapeSampah(m, sock, delay = SHAPE_ANIM_MS) {
  const junk = ["🗑️", "📦", "🥫", "🔋", "📰"];
  const cells = Array.from({ length: 5 }, () => junk[Math.floor(Math.random() * junk.length)]);
  const frames = [];
  for (let i = 0; i <= 5; i++) {
    const row = cells.map((c, idx) => (idx < i ? "♻️" : c)).join("");
    const broom = i < 5 ? "🧹".repeat(1) : "✨";
    frames.push(
      `${hdr("Got Bersih")}\n\n${row}\n\n` +
      `${i < 5 ? `${broom} menyapu area... (${i}/5 zona bersih)` : `🎉 SELESAI! area bersih, siap daur ulang! ✨`}`
    );
  }
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🏕️ EKSPEDISI — KAFILAH BERANGKAT & KEMBALI
// (khas expedition, batch #10)
// Bentuk: RUTE EKSPEDISI — party 🚶 jalan 5 sel dari
// titik awal ke tujuan per segmen. Mode "berangkat"
// (🏕️ markas → 🏁 destinasi) & "kembali" (🏁 → 🏕️ bawa loot 💰).
// ══════════════════════════════════════════════════
export async function shapeEkspedisi(m, sock, mode = "berangkat", delay = SHAPE_ANIM_MS) {
  const L = mode === "berangkat" ? "🏕️" : "🏁";
  const R = mode === "berangkat" ? "🏁" : "🏕️";
  const steps = 4;
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const cells = [L, "·", "·", "·", R];
    cells[i] = "🚶";
    const row = cells.join("─");
    let note;
    if (mode === "berangkat") {
      note = i === 0 ? "kafilah siap berangkat dari markas..."
        : i === steps ? "kafilah sampai destinasi — misi dimulai! 🎒"
        : `menempuh rute ekspedisi... (${i}/${steps} segmen)`;
    } else {
      note = i === 0 ? "misi selesai! bawa pulang hasil ekspedisi..."
        : i === steps ? "kafilah tiba kembali di markas! 🎉"
        : `kafilah pulang bawa loot... (${i}/${steps} segmen)`;
    }
    frames.push(`${hdr(mode === "berangkat" ? "Kafilah Berangkat" : "Ekspedisi Kembali")}\n\n${row}\n\n${note}`);
  }
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🌿 FORAGE — KERANJANG MENGISI
// (khas forage, batch #11)
// Bentuk: KERANJANG HASIL — tiap frame 1 hasil forage
// "masuk keranjang" (slot kosong · jadi item), counter
// N/4 terkumpul, akhir 🧺 PENUH siap dibawa pulang.
// ══════════════════════════════════════════════════
export async function shapeForage(m, sock, delay = SHAPE_ANIM_MS) {
  const loot = ["🌿", "🍄", "🍀", "🌸"];
  const slots = 4;
  const frames = [];
  for (let i = 0; i <= slots; i++) {
    const row = [];
    for (let j = 0; j < slots; j++) row.push(j < i ? loot[j] : "·");
    const note = i === 0
      ? "membedah semak mencari tanaman..."
      : i === slots
        ? "🧺 keranjang penuh! hasil forage siap dibawa pulang 🎉"
        : `hasil masuk keranjang... (${i}/${slots} terkumpul)`;
    frames.push(`${hdr("Keranjang Mengisi")}\n\n🧺 ${row.join(" ")}\n\n${note}`);
  }
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🏹 HUNTWILD — HEWAN DALAM SEMAK
// (khas huntwild, batch #12)
// Bentuk: baris 5 pohon 🌲 — bayangan hewan ❓ pindah
// slot per frame, frame akhir HEWAN KELIATAN (emoji asli
// hasil roll) → TANGKAPAN! Berbeda dari .berburu 3 fase.
// ══════════════════════════════════════════════════
export async function shapeHuntwild(m, sock, animalEmoji = "🦌", delay = SHAPE_ANIM_MS) {
  const frames = [];
  const hidePos = [2, 1, 3, 4]; // bayangan gerak antar slot
  for (let i = 0; i < hidePos.length; i++) {
    const cells = ["🌲", "🌲", "🌲", "🌲", "🌲"];
    cells[hidePos[i]] = "❓";
    const notes = [
      "mendengar gerakan di balik pohon...",
      "ada bayangan! tapi geser tempat...",
      "melihat ekor semburat! nyaris...",
      "HEWAN KELIATAN!",
    ];
    frames.push(`${hdr("Hewan dalam Semak")}\n\n${cells.join(" ")}\n\n${notes[i]}`);
  }
  const cells = ["🌲", "🌲", "🌲", "🌲", "🌲"];
  cells[4] = animalEmoji;
  frames.push(`${hdr("Hewan dalam Semak")}\n\n${cells.join(" ")}\n\n🎯 ${animalEmoji} tangkapan! hasil buru dibawa pulang 🎉`);
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// ⏳ TIMETRAVEL — LORONG WAKTU
// (khas timetravel, batch #13)
// Bentuk: loncatan tahun per frame menuju era tujuan
// (2026 → 1900 → tahun era → mendarat!). Era hasil roll
// tentuin tahun & emoji landing.
// ══════════════════════════════════════════════════
export async function shapeTimetravel(m, sock, era = { emoji: "🦖", name: "Era Prasejarah", year: "66.000.000 SM" }, delay = SHAPE_ANIM_MS) {
  const jumps = [
    { from: "2026", to: "1900", note: "cahaya mulai memelintir!" },
    { from: "1900", to: era.year, note: "loncatan besar... hampir sampai!" },
  ];
  const frames = [
    `${hdr("Lorong Waktu")}\n\n🌀 ◈◈◈◈◈◈\n\nmesin waktu menyala... tahun 2026`,
  ];
  for (const j of jumps) {
    frames.push(`${hdr("Lorong Waktu")}\n\n🌀 ${j.from} ⇢ ${j.to}\n\n${j.note}`);
  }
  frames.push(`${hdr("Lorong Waktu")}\n\n${era.emoji} ${era.name.toUpperCase()}\n\nmendarat! kamu sampai ${era.year} 🎉`);
  await morphCore(m, sock, frames, delay);
}

// ══════════════════════════════════════════════════
// 🎖️ RANGERPOST — RADAR PATROLI
// (khas rangerpost, batch #14)
// Bentuk: sweep radar nyari sinyal → kontak muncul
// sesuai tugas (monster/warga/intel) → resolve hasil.
// ══════════════════════════════════════════════════
export async function shapeRanger(m, sock, task = { emoji: "⚔️", name: "Defeat Monster", desc: "" }, success = true, delay = SHAPE_ANIM_MS) {
  const H = () => hdr("Radar Patroli");
  const CONTACT = {
    "Defeat Monster": "⚔️ monster liar terlihat di sektor barat!",
    "Rescue Civilian": "🆘 warga menunggu di sektor timur!",
    "Gather Intel": "📜 jejak pasukan musuh ditemukan!",
  };
  const contact = CONTACT[task.name] || `${task.emoji} titik tugas terkonfirmasi!`;
  const frames = [
    `${H()}\n\n📡 · · · · ·\n\nradar menyala... memindai zona patroli`,
    `${H()}\n\n📡 · · ◉ · ·\n\nsinyal terdeteksi! menuju titik kontak`,
    `${H()}\n\n📡 · · ◉ · ·\n\n${contact}`,
    success
      ? `${H()}\n\n🎯 · · ✅ · ·\n\nTUGAS SELESAI!`
      : `${H()}\n\n💨 · · ◌ · ·\n\nsinyal hilang...`,
  ];
  await morphCore(m, sock, frames, delay);
}
