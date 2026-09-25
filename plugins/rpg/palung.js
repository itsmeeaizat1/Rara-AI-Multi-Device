// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// palung.js — PALUNG MISTERI (request owner 21 Sep 2026, game petualangan #6, standar Game Designer)
// Petualangan bawah laut: makin DALAM makin kaya & berbahaya. 4 zona kedalaman (Cahaya/Senja/Abisal/Hadal),
// kelola OKSIGEN (regen 1/5 mnt, naik ke permukaan = regen penuh), jalur AMAN vs RISIKO (loot ×2 tapi 35% bahaya),
// event acak (mutiara/arus/ubur/hiu/kapal karam/bioluminesensi-lore), toko (tabung/lampu/pelampung/sonar),
// TITIK TERDALAM = boss "Sesuatu di Dasar Palung" + reward besar, .petualangpalung prestasi (rebirth +10% EXP, rank
// Common→Mitos). Daily + streak + starter pack + leaderboard. State persist db.data.palung tahan restart.
// 🎬 ANIMASI KHAS: selam VERTIKAL — penyelam 🤿 turun kolom kedalaman, jejak gelembung 🫧, denyut sonar ◎.

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { addCash, spendCash, getCash } from "../../src/lib/nova-rpg-service.js";
import { playTrenchdiverCinematic, selamCinematic, naikCinematic } from "../../src/lib/libanimationrpg/libtrenchdiverrpg.js";
import { getLocalDateObject } from "../../src/lib/nova-time.js";

// ── knob ──
const O2_MAX_BASE = process.env.PALUNG_O2_MAX !== undefined ? Number(process.env.PALUNG_O2_MAX) : 10;
const O2_REGEN_S = process.env.PALUNG_REGEN_S !== undefined ? Number(process.env.PALUNG_REGEN_S) : 300; // +1 / 5 mnt
const SELAM_CD_MS = process.env.PALUNG_SELAM_CD_MS !== undefined ? Number(process.env.PALUNG_SELAM_CD_MS) : 2000;
const DIVES_PER_ZONE = process.env.PALUNG_DIVES_PER_ZONE !== undefined ? Number(process.env.PALUNG_DIVES_PER_ZONE) : 5;
const DIVES_BOSS = process.env.PALUNG_DIVES_BOSS !== undefined ? Number(process.env.PALUNG_DIVES_BOSS) : 6;
const ISTIRAHAT_GOLD = 40;

const ZONA = [
  { id: 1, nama: "Zona Cahaya", meter: "0-200m", tile: "🌊", butuhLampu: false, butuhTabung: 0 },
  { id: 2, nama: "Zona Senja", meter: "200-1000m", tile: "🌑", butuhLampu: false, butuhTabung: 0 },
  { id: 3, nama: "Zona Abisal", meter: "1000-4000m", tile: "🖤", butuhLampu: true, butuhTabung: 0 },
  { id: 4, nama: "Zona Hadal", meter: "4000-11000m", tile: "⬛", butuhLampu: true, butuhTabung: 2 },
];

const TOKO = {
  tabung: { nama: "Tabung Oksigen", harga: (u) => 300 * (((u.maxOksigen - O2_MAX_BASE) / 2) + 1), efek: "Maks oksigen +2 (cap " + (O2_MAX_BASE + 10) + ")" },
  lampu: { nama: "Lampu Selam", harga: () => 500, efek: "Buka Zona Abisal+ (wajib zona 3-4)" },
  pelampung: { nama: "Pelampung Darurat", harga: () => 150, efek: "Nyelametin kamu dari 1 bahaya" },
  sonar: { nama: "Sonar Pro", harga: () => 400, efek: "Deteksi event naik: 18% → 28%" },
};

const BAHAYA_TEXTS = [
  "Arus pusaran menarik kamu ke jurang — sebagian harta lepas!",
  "Gigitan sesuatu yang besar! Kamu buru-buru naik sambil menjatuhkan loot.",
  "Jaring nelayan tua melilit kakimu — harta berhamburan saat kamu lepas.",
];
const EVENT_BIO = [
  "Sosok raksasa bercahaya lewat di kejauhan… matanya menatapmu sedetik lalu lenyap.",
  "Puluhan titik cahaya biru menari membentuk lingkaran — seperti membuka jalan.",
  "Kamu menemukan tiang batah puing kota tua yang seharusnya tak ada di kedalaman ini…",
];

const RANKS = ["Common", "Rare", "Epic", "Legendary", "Mitos"];
const rankOf = (l) => RANKS[Math.min(RANKS.length - 1, l || 0)];
const prestigeBonus = (l) => 1 + (l || 0) * 0.1;

let _rand = Math.random;
const rand = () => _rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ── state ──
function loadUser(m) {
  const db = getDatabase();
  if (!db.data.palung) db.data.palung = { users: {} };
  const u = db.data.palung.users[m.sender];
  if (!u) return null;
  regenO2(u);
  return u;
}
function regenO2(u) {
  const nowS = Math.floor(Date.now() / 1000);
  const gained = Math.floor((nowS - (u.o2At || nowS)) / O2_REGEN_S);
  if (gained > 0 && (u.oksigen || 0) < (u.maxOksigen || O2_MAX_BASE)) {
    u.oksigen = Math.min(u.maxOksigen || O2_MAX_BASE, (u.oksigen || 0) + gained);
    u.o2At = nowS;
  }
}
function newUser(m) {
  const db = getDatabase();
  const u = {
    zona: 1, dives: 0, titik: 0, lencana: 0,
    oksigen: O2_MAX_BASE, maxOksigen: O2_MAX_BASE, o2At: Math.floor(Date.now() / 1000),
    lampu: false, pelampung: 0, sonar: false, kristal: 0,
    dailyStreak: 0, lastDaily: "", firstTime: true, lastSelamAt: 0,
    stats: { selam: 0, bahaya: 0, kapal: 0, bio: 0, boss: 0 },
    mulaiPada: Date.now(),
  };
  db.data.palung.users[m.sender] = u;
  return u;
}
function saveDb() { try { getDatabase().save(); } catch (e) { console.error("[palung] gagal simpan:", e); } }

const box = (icon, flavor, body) => novaGameBox({ title: "palung", icon, flavor, body });

async function handler(m, { sock }) {
  const sub = (m.args?.[0] || "").toLowerCase();

  // ── mulai / status / bantuan ──
  let u = loadUser(m);
  if (!u && sub && !["", "mulai", "start", "status"].includes(sub)) {
    return m.reply(box("❓", "❓ *BELUM TERDAFTAR!*", "Ketik .petualangpalung dulu untuk ekspedisi selam pertama."));
  }
  if (!u) {
    u = newUser(m);
    saveDb();
    addCash(m, 2000); u.pelampung += 1; saveDb();
    return m.reply(box("🌊", "🌊 *SELAMAT DATANG, PENJELAJAH PALUNG!*",
      "Laut menyimpan rahasia di kedalamannya:\n\n" +
      "🤿 .petualangpalung selam aman — aman, loot stabil\n" +
      "⚔️ .petualangpalung selam risiko — loot ×2, bisa bahaya\n" +
      "⬆️ .petualangpalung naik — ke permukaan, oksigen penuh\n" +
      "🛒 .petualangpalung toko — tabung/lampu/pelampung/sonar\n" +
      "📅 .petualangpalung daily · 🏆 .petualangpalung top · ♻️ .petualangpalung prestasi\n\n" +
      "🎁 Starter pack: +2.000 uang & 1 pelampung darurat!\n" +
      "Tujuanmu: titik terdalam Zona Hadal… dan Sesuatu di sana."));
  }
  if (sub === "status" || sub === "") {
    const z = ZONA[Math.min(ZONA.length, Math.max(0, u.zona - 1))];
    regenO2(u);
    return m.reply(box("🌊", `🤿 *${z.nama.toUpperCase()} (${z.meter})*`,
      `⬇️ Kedalaman: zona ${u.zona}/4 · selam di zona: ${u.dives}/${DIVES_PER_ZONE}` +
      (u.zona >= ZONA.length ? ` (boss: ${u.dives}/${DIVES_BOSS})` : "") +
      `\n🫁 Oksigen: ${u.oksigen}/${u.maxOksigen} (+1/5 mnt)\n` +
      `🛡️ Peralatan: lampu ${u.lampu ? "✅" : "❌"} · sonar ${u.sonar ? "✅" : "❌"} · pelampung ×${u.pelampung} · kristal ×${u.kristal}\n` +
      `💰 Uang: ${getCash(m)}\n` +
      `🏆 Titik Terdalam: ${u.titik} · ♻️ Lencana: ${u.lencana} (+${(u.lencana || 0) * 10}% EXP)\n` +
      `🎖️ Rank: ${rankOf(u.lencana)}\n\n` +
      `Ketik .petualangpalung selam untuk menyelam!`));
  }

  // ── selam (aman/risiko) ──
  if (sub === "selam" || sub === "menyelam" || sub === "dive") {
    const jalur = (m.args?.[1] || "aman").toLowerCase();
    if (jalur !== "aman" && jalur !== "risiko") return m.reply(box("🤔", "🤔 *JALUR TIDAK KENAL*", "Pilih: .petualangpalung selam aman atau .petualangpalung selam risiko"));
    if (Date.now() - (u.lastSelamAt || 0) < SELAM_CD_MS) return m.reply(box("⏳", "⏳ *SABAR!*", "Ombak belum reda. Tunggu sebentar lalu selam lagi."));
    const z = ZONA[Math.min(ZONA.length, Math.max(0, u.zona - 1))];
    if (z.butuhLampu && !u.lampu) return m.reply(box("🔦", "🔦 *TERLALU GELAP!*", `Zona ${z.nama} butuh Lampu Selam. Beli di .petualangpalung toko (500 uang).`));
    if (z.butuhTabung && (u.maxOksigen || O2_MAX_BASE) < O2_MAX_BASE + z.butuhTabung * 2) {
      return m.reply(box("🫁", "🫁 *TEKANAN TERLALU BESAR!*", `Zona Hadal butuh tabung minimal +${z.butuhTabung} upgrade (${O2_MAX_BASE + z.butuhTabung * 2} oksigen). Beli di .petualangpalung toko.`));
    }
    const cost = jalur === "risiko" ? 3 : 2;
    if ((u.oksigen || 0) < cost) return m.reply(box("🫁", "🫁 *OKSIGEN HABIS!*", `Selam ${jalur} butuh ${cost} oksigen (punya ${u.oksigen}). Naik ke permukaan (.petualangpalung naik) atau istirahat!`));

    u.lastSelamAt = Date.now();
    u.oksigen -= cost;
    saveDb();

    let cash = 25 + u.zona * 15 + Math.floor(rand() * 21);
    const baseCash = cash;
    if (jalur === "risiko") cash *= 2;
    let bahaya = jalur === "risiko" && rand() < 0.35;
    let bahayaText = "";
    let selamatPelampung = false;
    if (bahaya) {
      if (u.pelampung > 0) {
        selamatPelampung = true;
        u.pelampung -= 1;
        bahaya = false;
        bahayaText = "🛟 Pelampung darurat menyelamatkanmu dari " + pick(BAHAYA_TEXTS).toLowerCase();
      } else {
        u.oksigen = Math.max(0, u.oksigen - 1);
        cash = Math.floor(cash * 0.7);
        u.stats.bahaya += 1;
        bahayaText = "💥 " + pick(BAHAYA_TEXTS);
      }
    }

    // event acak 18% (28% dengan sonar)
    const eventChance = u.sonar ? 0.28 : 0.18;
    let eventText = "";
    let evTipe = null;
    if (rand() < eventChance) {
      const ev = rand();
      if (ev < 0.3) { evTipe = "mutiara"; const bonus = 50 * u.zona; cash += bonus; eventText = "🦪 Mutiara raksasa sebesar kepalan! +" + bonus + " uang."; }
      else if (ev < 0.5) { evTipe = "arus"; u.oksigen = Math.max(0, u.oksigen - 1); eventText = "🌊 Arus kuat menabrakmu — -1 oksigen."; }
      else if (ev < 0.65) { evTipe = "ubur"; u.oksigen = Math.max(0, u.oksigen - 2); eventText = "⚡ Ubur-ubur listrik menyengatmu — -2 oksigen!"; }
      else if (ev < 0.8) { evTipe = "hiu"; cash = Math.floor(cash * 0.6); eventText = "🦈 Hiu! Kamu kabur sambil menjatuhkan sebagian harta."; }
      else if (ev < 0.95) { evTipe = "kapal"; const bonus = 100 * u.zona; cash += bonus; u.stats.kapal += 1; eventText = "⚓ Kapal karam berusia ratusan tahun! Artifak diangkat: +" + bonus + " uang."; }
      else { evTipe = "bio"; u.kristal += 1; u.stats.bio += 1; eventText = "✨ Bioluminesensi… " + pick(EVENT_BIO) + "\n\n💎 +1 Kristal Laut."; }
    }

    // progres zona
    u.dives += 1;
    u.stats.selam += 1;
    let naikText = "";
    let bossText = "";
    if (u.zona >= ZONA.length && u.dives >= DIVES_BOSS) {
      // ── TITIK TERDALAM: boss ──
      u.stats.boss += 1;
      u.titik += 1;
      const reward = 2500 + u.titik * 250;
      addCash(m, reward);
      u.kristal += 3;
      bossText = "🦑 SESUATU DI DASAR PALUNG TERJANGKAR!\nIa menatapmu lama… lalu menyingkir, seolah mengizinkan.\n\n🏆 TITIK TERDALAM ke-${u.titik}: +${reward} uang, +3 Kristal Laut!\nEkspedisi selesai — kamu naik ke permukaan, palung baru menanti."
        .replace("${u.titik}", u.titik).replace("${reward}", reward);
      u.zona = 1; u.dives = 0;
      naikText = "\n⬆️ Kamu kembali ke Zona Cahaya.";
    } else if (u.dives >= DIVES_PER_ZONE && u.zona < ZONA.length) {
      u.zona += 1;
      u.dives = 0;
      naikText = "\n⬇️ Kedalaman baru terbuka: " + ZONA[u.zona - 1].nama + " (" + ZONA[u.zona - 1].meter + ")!";
    }

    const expGain = 10 + u.zona * 6;
    let lvlUp = null;
    try { lvlUp = addExpWithLevelCheck(m, Math.floor(expGain * prestigeBonus(u.lencana))); } catch (e) { console.error("[palung] exp gagal:", e); }
    addCash(m, cash);
    saveDb();

    const lines = [
      "🤿 Selam " + jalur.toUpperCase() + " di " + z.nama + " (" + z.meter + ")",
      "💰 +" + cash + " uang" + (jalur === "risiko" ? " (×2 jalur risiko, dasar " + baseCash + ")" : ""),
      "⭐ +" + Math.floor(expGain * prestigeBonus(u.lencana)) + " EXP",
      "🫁 Oksigen: " + u.oksigen + "/" + u.maxOksigen,
    ];
    if (bahayaText) lines.push("", bahayaText);
    if (eventText) lines.push("", "🎁 EVENT: " + eventText);
    if (bossText) lines.push("", bossText);
    if (naikText) lines.push("", naikText);
    if (lvlUp) lines.push("", "🎉 LEVEL UP! " + (typeof lvlUp === "string" ? lvlUp : JSON.stringify(lvlUp)));
    // 🎬 cutscene gaya Nintendo — durasi nyesuaikan situasi (zona/jalur/bahaya/event/boss)
    await playTrenchdiverCinematic(sock, m.chat, selamCinematic({
      zona: z.id, zonaNama: z.nama, zonaTile: z.tile, jalur,
      bahaya: bahaya || selamatPelampung, selamat: selamatPelampung, event: evTipe,
      loot: cash, boss: Boolean(bossText),
    }));
    return m.reply(box("🤿", "🤿 *HASIL MENYELAM*", lines.join("\n")));
  }

  // ── naik (permukaan) ──
  if (sub === "naik" || sub === "permukaan") {
    regenO2(u);
    u.oksigen = u.maxOksigen;
    u.o2At = Math.floor(Date.now() / 1000);
    saveDb();
    await playTrenchdiverCinematic(sock, m.chat, naikCinematic({}));
    return m.reply(box("⬆️", "⬆️ *KE PERMUKAAN!*", "Kamu menepi ke perahu. Oksigen penuh kembali: " + u.oksigen + "/" + u.maxOksigen + ".\n\nWaktu oksigen: laut menunggumu kembali 🌊"));
  }

  // ── istirahat ──
  if (sub === "istirahat") {
    if (!spendCash(m, ISTIRAHAT_GOLD)) return m.reply(box("💸", "💸 *KURANG UANG!*", "Istirahat di perahu butuh " + ISTIRAHAT_GOLD + " uang. Kamu punya " + getCash(m) + "."));
    u.oksigen = Math.min(u.maxOksigen, u.oksigen + 3);
    saveDb();
    return m.reply(box("😴", "😴 *REHAT DI PERAHU*", "+3 oksigen (" + u.oksigen + "/" + u.maxOksigen + ")"));
  }

  // ── toko & beli ──
  if (sub === "toko") {
    return m.reply(box("🛒", "🛒 *TOKO PELABUHAN*", Object.entries(TOKO).map(([k, v]) =>
      `${k} — ${v.nama} · ${v.harga(u)} uang · ${v.efek}`).join("\n") + "\n\nBeli: .petualangpalung beli <nama>"));
  }
  if (sub === "beli") {
    const item = (m.args?.[1] || "").toLowerCase();
    const def = TOKO[item];
    if (!def) return m.reply(box("🛒", "🛒 *BARANG TAK ADA*", "Pilihan: tabung / lampu / pelampung / sonar"));
    const harga = def.harga(u);
    if (item === "lampu" && u.lampu) return m.reply(box("🔦", "🔦 *SUDAH PUNYA!*", "Lampu selammu sudah menyala terang."));
    if (item === "sonar" && u.sonar) return m.reply(box("📡", "📡 *SUDAH PUNYA!*", "Sonar Pro sudah terpasang di perahu."));
    if (item === "tabung" && (u.maxOksigen || O2_MAX_BASE) >= O2_MAX_BASE + 10) return m.reply(box("🫁", "🫁 *TABUNG MAKSIMAL!*", "Tabungmu sudah di kapasitas terbesar (" + u.maxOksigen + ")."));
    if (!spendCash(m, harga)) return m.reply(box("💸", "💸 *KURANG UANG!*", `${def.nama} harganya ${harga} uang. Kamu punya ${getCash(m)}. Coba .petualangpalung daily dulu!`));
    if (item === "tabung") { u.maxOksigen += 2; u.oksigen += 2; }
    if (item === "lampu") u.lampu = true;
    if (item === "pelampung") u.pelampung += 1;
    if (item === "sonar") u.sonar = true;
    saveDb();
    return m.reply(box("🛍️", "🛍️ *PEMBELIAN SUKSES!*", `${def.nama} milikmu sekarang! (${def.efek})`));
  }

  // ── daily ──
  if (sub === "daily") {
    const d = getLocalDateObject();
    const today = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    if (u.lastDaily === today) return m.reply(box("📅", "📅 *SUDAH DIKLAIM!*", "Bonus penyelam hari ini sudah diambil. Kembali besok!"));
    u.dailyStreak = u.lastDaily && isYesterday(u.lastDaily, d) ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDaily = today;
    const gold = 30 + (u.dailyStreak - 1) * 10;
    addCash(m, gold);
    u.oksigen = u.maxOksigen;
    saveDb();
    return m.reply(box("📅", "📅 *BONUS HARIAN PENYELAM!*", `🫁 Oksigen penuh · 🪙 +${gold} uang\n🔥 Streak: ${u.dailyStreak} hari (bonus +${(u.dailyStreak - 1) * 10} uang)`));
  }

  // ── leaderboard ──
  if (sub === "top" || sub === "leaderboard") {
    const db = getDatabase();
    const list = Object.entries(db.data.palung?.users || {})
      .map(([jid, x]) => ({ jid, titik: x.titik || 0, lencana: x.lencana || 0, zona: x.zona || 1 }))
      .sort((a, b) => (b.titik - a.titik) || (b.lencana - a.lencana) || (b.zona - a.zona))
      .slice(0, 10);
    const body = list.length
      ? list.map((x, i) => `${i + 1}. ${x.jid.split("@")[0]} — 🏆${x.titik} · ♻️${x.lencana} · ⬇️ zona ${x.zona}`).join("\n")
      : "Belum ada penyelam terdaftar.";
    return m.reply(box("🏆", "🏆 *PAPAN LEGENDA PALUNG*", body));
  }

  // ── prestasi (rebirth) ──
  if (sub === "prestasi") {
    if ((u.titik || 0) < 1) return m.reply(box("♻️", "♻️ *BELUM LAYAK!*", "Prestasi butuh minimal 1 Titik Terdalam. Terus menyelam!"));
    u.lencana = (u.lencana || 0) + 1;
    u.titik = 0; u.zona = 1; u.dives = 0;
    u.lampu = false; u.sonar = false; u.pelampung = 0;
    u.maxOksigen = O2_MAX_BASE; u.oksigen = O2_MAX_BASE;
    saveDb();
    return m.reply(box("♻️", "♻️ *LENCANA PENJELAJAH BARU!*",
      `Lencana ke-${u.lencana}: EXP +${u.lencana * 10}% permanen!\nRank kamu sekarang: 🎖️ ${rankOf(u.lencana)}\n\nPeralatan direset — palung baru menyimpan lebih banyak harta untukmu.`));
  }

  // ── bantuan ──
  return m.reply(box("🌊", "🌊 *PALUNG MISTERI*",
    "🤿 .petualangpalung selam [aman|risiko] — menyelam\n⬆️ .petualangpalung naik — permukaan, oksigen penuh\n😴 .petualangpalung istirahat — +3 oksigen (" + ISTIRAHAT_GOLD + " uang)\n🛒 .petualangpalung toko / .petualangpalung beli <item>\n📅 .petualangpalung daily · 🏆 .petualangpalung top · ♻️ .petualangpalung prestasi\n📊 .petualangpalung status"));
}

function isYesterday(last, d) {
  const [dd, mm, yy] = last.split("-").map(Number);
  const y = new Date(d.getTime() - 86400000);
  return dd === y.getDate() && mm === y.getMonth() + 1 && yy === y.getFullYear();
}

const _setRandForTest = (fn) => { _rand = fn || Math.random; };
export { handler, ZONA, TOKO, _setRandForTest };
export default {
  name: ["trenchdiver", "petualangpalung", "palung", "palungmisteri", "diving"],
  category: "rpg",
  desc: "Petualangan bawah laut: makin dalam makin kaya & berbahaya",
  usage: ".petualangpalung | .petualangpalung selam [aman|risiko] | .petualangpalung toko | .petualangpalung prestasi",
  handler,
};
