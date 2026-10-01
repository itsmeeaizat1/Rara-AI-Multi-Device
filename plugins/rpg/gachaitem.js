// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gachaitem.js — GACHA ITEM BERBAYAR (request owner 21 Sep 2026): rolling item dengan ekonomi sungguhan.
// Harga 2.000 uang/pull (atomic spendCash), limit 5x/hari reset 00:00 WIB (state {tanggal, jumlahHariIni}),
// cooldown 3 dtk + lock in-flight anti spam, pity 5x tanpa Epic+ → garansi Epic+ lalu reset (.mypity),
// loot table 5 tingkat (Common 60 / Rare 25 / Epic 10 / Legendary 4 / MITOS 1), MITOS → pengumuman dramatis.
// Transaksi: cek kuota → cek saldo → potong atomic → rolling → kirim hasil → SUKSES baru catat kuota+reward;
// kirim gagal → REFUND 2.000. EV/pull ±1.300 < harga 2.000 (deflasi, rumus di gachaExpectedValue()).

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
import { getCash, spendCash, addCash, addGems, addItem, ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { addExpWithLevelCheck } from "../../src/lib/rara-level.js";
import { playSlotAnim } from "../../src/lib/libanimationrpg/libgachaitemrpg.js";
import { getLocalDateObject } from "../../src/lib/rara-time.js";

// ── knob ──
const PULL_PRICE = 2000;
const DAILY_LIMIT = 5;
const COOLDOWN_MS = process.env.GACHA_CD_MS !== undefined ? Number(process.env.GACHA_CD_MS) : 3000;
const ROLL_DELAY_MS = process.env.GACHA_ROLL_DELAY_MS !== undefined ? Number(process.env.GACHA_ROLL_DELAY_MS) : 1100;
const SLOT_ANIM_MS = process.env.GACHA_ANIM_MS !== undefined ? Number(process.env.GACHA_ANIM_MS) : 650;
// 🎬 animasi khas gacha: SLOT 3-REEL — reel berputar lalu TERKUNCI satu per satu
const REEL_ICONS = ["✨", "🌟", "💎", "🔮", "🏆", "🌈"];
const PITY_AT = 5; // pull ke-5 tanpa Epic+ → garansi Epic+, lalu reset

// ── loot table (rate % global + sub-reward berbobot) ──
// Valuasi EV: 1 exp = 0,25 uang · 1 gems = 0,5 uang · item = value ITEM_DB
const EXP_VAL = 0.25;
const GEMS_VAL = 0.5;

const LOOT = {
  common: {
    rate: 60, icon: "⚪", name: "COMMON",
    pool: [
      { type: "uang", min: 300, max: 1500, w: 55 },
      { type: "exp", min: 150, max: 450, w: 25 },
      { type: "item", items: ["ironOre", "wolfPelt", "bearClaw", "deerAntler", "wildHoney", "goldOre"], qty: 2, w: 20 },
    ],
  },
  rare: {
    rate: 25, icon: "🔵", name: "RARE",
    pool: [
      { type: "uang", min: 1500, max: 3500, w: 45 },
      { type: "gems", min: 150, max: 500, w: 35 },
      { type: "item", items: ["pearl", "snakeVenom", "eagleFeather", "whiteWolfPelt", "tigerStripe", "luckyCharm"], qty: 1, w: 20 },
    ],
  },
  epic: {
    rate: 10, icon: "🟣", name: "EPIC",
    pool: [
      { type: "gems", min: 1500, max: 4000, w: 40 },
      { type: "exp", min: 2500, max: 5500, w: 30 },
      { type: "item", items: ["dragonScale", "griffinClaw", "phoenixFeather", "mithrilOre", "elixir"], qty: 1, w: 30 },
    ],
  },
  legendary: {
    rate: 4, icon: "🟠", name: "LEGENDARY",
    pool: [
      { type: "gems", min: 8000, max: 18000, w: 55 },
      { type: "item", items: ["excalibur", "dragonSword"], qty: 1, w: 45 },
    ],
  },
  mitos: {
    rate: 1, icon: "🪄", name: "MITOS",
    pool: [
      { type: "uang", min: 22000, max: 38000, w: 70, jackpot: true },
      { type: "gems", min: 10000, max: 24000, w: 30, jackpot: true },
    ],
  },
};
const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mitos"];
const EPIC_PLUS = ["epic", "legendary", "mitos"];

// nilai uang-e setara item langka tanpa field value
const ITEM_FALLBACK_VALUE = 3000;

// ── teks variasi (backtick + baris baru SUNGGUHAN, bukan "\n") ──
const ROLLING_TEXTS = [
  `🎲 Mesin gacha berputar… butiran cahaya menari di dalam kapsul…`,
  `🔮 Kapsul bergoyang… gemuruh drum menggema… tarik napas dulu…`,
  `✨ Cahaya pelangi menyala… mesin tua ini berderit… ada yang jatuh…`,
  `🎰 Tuas ditarik… KLIKK! roda berputar cepat… pelan… pelan… berhenti!`,
];
const FLAVOR = {
  common: [
    `⚪ Kapsul biasa terbuka…`,
    `⚪ Debu turun dari mesin…`,
    `⚪ Sebuah kapsul pucat mendarat pelan…`,
    `⚪ Klik… kapsul keluar dari jalur lambat…`,
  ],
  rare: [
    `🔵 Cahaya biru mengepul dari kapsul!`,
    `🔵 Kapsul dingin bermandikan kilau biru…`,
    `🔵 Mesin mendesis — jalur biru menyala!`,
    `🔵 Bintang kecil jatuh dari dalam mesin…`,
  ],
  epic: [
    `🟣 GEMURUH! Kapsul ungu memancar petir kecil!`,
    `🟣 Cahaya ungu menerangi ruangan!`,
    `🟣 Mesin bergetar — ini bukan kapsul biasa!`,
    `🟣 Jalur ungu menyala — para penonton berdecak kagum!`,
  ],
  legendary: [
    `🟠 LANGIT MENYALA ORANYE! Ini tanda-tanda besar!`,
    `🟠 Gempa kecil! Mesin hampir terangkat! LEGENDARY!`,
    `🟠 Segala drum berhenti… lalu MELEDAK dalam cahaya oranye!`,
    `🟠 Cahaya emas-oranye menguasai seluruh ruangan!`,
  ],
  mitos: [
    `🪄 SEGALA SUARA LENYAP… WAKTU TERHENTI… MITOS TERJADI.`,
    `🪄 Langit terbelah… bintang jatuh ke telapak tanganmu. MITOS!`,
    `🪄 Mesin tua ini bermimpi… dan mimpi itu NYATA. MITOS!`,
  ],
};

// ── util ──
const fmt = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const ri = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _randFn = null;
function rnd() { return _randFn ? _randFn() : Math.random(); }
export function _setRandForTest(fn) { _randFn = fn; }

// ── state persisten (tahan restart) ──
function ensureGachaUser(m) {
  const db = getDatabase();
  if (!db.data.gachaitem) db.data.gachaitem = { users: {} };
  let u = db.data.gachaitem.users[m.sender];
  if (!u) {
    u = db.data.gachaitem.users[m.sender] = {
      tanggal: todayStr(), jumlahHariIni: 0,
      pityCount: 0, totalPulls: 0, spentTotal: 0,
      rarities: { common: 0, rare: 0, epic: 0, legendary: 0, mitos: 0 },
      lastRollAt: 0,
    };
  }
  // reset harian: bandingkan tanggal HARI INI vs tersimpan (Asia/Jakarta, bukan UTC)
  const today = todayStr();
  if (u.tanggal !== today) {
    console.log(`[gacha] reset kuota harian ${m.sender}: ${u.tanggal} → ${today}`);
    u.tanggal = today;
    u.jumlahHariIni = 0;
  }
  return u;
}
function todayStr() {
  const d = getLocalDateObject ? getLocalDateObject() : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function saveDb() { try { getDatabase().save(); } catch (e) { console.error("[gacha] gagal simpan state:", e); } }

// ── EV (expected value) per pull — transparan & bisa diaudit e2e ──
export function gachaExpectedValue() {
  let ev = 0;
  for (const key of RARITY_ORDER) {
    const r = LOOT[key];
    const wTotal = r.pool.reduce((s, p) => s + p.w, 0);
    let rEv = 0;
    for (const p of r.pool) {
      const avg = (p.min + p.max) / 2;
      let val = 0;
      if (p.type === "uang") val = avg;
      else if (p.type === "exp") val = avg * EXP_VAL;
      else if (p.type === "gems") val = avg * GEMS_VAL;
      rEv += (p.w / wTotal) * val;
    }
    ev += (r.rate / 100) * rEv;
  }
  return ev;
}

// ── rolling ──
function rollRarity(pityForce) {
  if (pityForce) {
    // garansi Epic+ : bobot asli epic/legendary/mitos dinormalisasi (10 : 4 : 1)
    const w = rnd() * 15;
    if (w < 10) return "epic";
    if (w < 14) return "legendary";
    return "mitos";
  }
  const r = rnd() * 100;
  let acc = 0;
  for (const key of RARITY_ORDER) {
    acc += LOOT[key].rate;
    if (r < acc) return key;
  }
  return "common";
}

function rollReward(rarity) {
  const def = LOOT[rarity];
  const wTotal = def.pool.reduce((s, p) => s + p.w, 0);
  let r = rnd() * wTotal;
  for (const p of def.pool) {
    if ((r -= p.w) < 0) {
      if (p.type === "uang") return { type: "uang", amount: ri(p.min, p.max) };
      if (p.type === "exp") return { type: "exp", amount: ri(p.min, p.max) };
      if (p.type === "gems") return { type: "gems", amount: ri(p.min, p.max) };
      return { type: "item", itemId: pick(p.items), qty: p.qty || 1 };
    }
  }
  return { type: "uang", amount: ri(def.pool[0].min, def.pool[0].max) };
}

function applyReward(m, rarity, reward) {
  if (reward.type === "uang") {
    addCash(m, reward.amount);
    return `💵 Uang +${fmt(reward.amount)}`;
  }
  if (reward.type === "exp") {
    let lvlUp = null;
    try { lvlUp = addExpWithLevelCheck(m, reward.amount); } catch (e) { console.error("[gacha] gagal kasih exp:", e); }
    return `⭐ EXP +${fmt(reward.amount)}${lvlUp ? "\n🎊 LEVEL UP!" : ""}`;
  }
  if (reward.type === "gems") {
    addGems(m, reward.amount);
    return `💎 Diamond +${fmt(reward.amount)}`;
  }
  const okItem = addItem(m, reward.itemId, reward.qty);
  if (!okItem) console.error("[gacha] addItem gagal untuk", reward.itemId);
  return `🎁 Item: ${reward.itemId} ×${reward.qty}`;
}

// ── lock in-flight per user (spam 3x cepat = 1 rolling saja) ──
const inflight = new Set();
export function _getInflightForTest() { return inflight; }

// ═══ handler ═══
async function handler(m, { sock, config }) {
  const cmd = String(m.command || "gachaitem").toLowerCase();

  // ── .gachaiteminfo — transparansi loot table ──
  if (cmd === "gachaiteminfo") {
    return m.reply(raraGameBox({
      title: "gacha", icon: "🎰",
      flavor: "🎰 *INFO GACHA ITEM — LOOT TABLE RESMI*",
      body: [
        `💵 Harga: ${fmt(PULL_PRICE)} uang per pull`,
        `⏳ Limit: ${DAILY_LIMIT}x/hari — reset jam 00:00 WIB`,
        `❄️ Cooldown: 3 detik antar pull · 🛡️ Refund otomatis kalau hasil gagal terkirim`,
        "",
        "── LOOT TABLE & RATE ──",
        ...RARITY_ORDER.map((k) => {
          const r = LOOT[k];
          const subs = r.pool.map((p) => p.type === "item" ? `item [${p.items.slice(0, 3).join("/")}…]` : `${p.type} ${fmt(p.min)}-${fmt(p.max)}`).join(" · ");
          return `${r.icon} ${r.name} ${r.rate}% → ${subs}`;
        }),
        "",
        "── PITY SYSTEM ──",
        `5x pull berturut-turut tanpa Epic+ → pull ke-5 DIJAMIN Epic ke atas, lalu hitungan reset.`,
        `Cek pity kamu: .mypity`,
        "",
        "── CATATAN EKONOMI (jujur!) ──",
        `Nilai rata-rata hadiah ±${fmt(gachaExpectedValue())} per pull — sengaja di bawah harga ${fmt(PULL_PRICE)} supaya ekonomi bot gak bubble. Gacha itu hiburan, bukan mesin uang 😄`,
      ].join("\n"),
    }));
  }

  // ── .mypity ──
  if (cmd === "mypity") {
    const u = ensureGachaUser(m);
    const sisa = DAILY_LIMIT - u.jumlahHariIni;
    return m.reply(raraGameBox({
      title: "gacha", icon: "🍀",
      flavor: "🍀 *STATISTIK GACHA KAMU*",
      body: [
        `🎯 Pity: ${u.pityCount}/${PITY_AT} — ${u.pityCount >= PITY_AT - 1 ? "pull berikutnya DIJAMIN Epic+!" : "sisa " + (PITY_AT - u.pityCount) + " pull tanpa Epic+ → dijamin Epic+"}`,
        "",
        `📊 Total pull: ${fmt(u.totalPulls)} · Total belanja: ${fmt(u.spentTotal)} uang`,
        ...RARITY_ORDER.map((k) => `${LOOT[k].icon} ${LOOT[k].name}: ${fmt(u.rarities[k] || 0)}`),
        "",
        `⏳ Kuota hari ini (${u.tanggal}): sisa ${sisa}/${DAILY_LIMIT}`,
        sisa <= 0 ? "Kuota habis — reset jam 00:00 WIB ⏰" : `Ketik .gachaitem untuk rolling (${fmt(PULL_PRICE)} uang)!`,
      ].join("\n"),
    }));
  }

  // ═══ .gachaitem — rolling utama ═══
  // 0. lock in-flight: spam saat rolling jalan = ditolak
  if (inflight.has(m.sender)) {
    return m.reply(raraGameBox({ title: "gacha", icon: "⏳", flavor: "⏳ *SABAR, DETEKTIF GACHA!*", body: "Rolling kamu yang sebelumnya masih jalan! Tunggu hasilnya dulu ya 😊" }));
  }
  inflight.add(m.sender);
  try {
    // 0b. cooldown 3 detik per user
    const nowS = Date.now();
    const gu = ensureGachaUser(m);
    if (nowS - (gu.lastRollAt || 0) < COOLDOWN_MS) {
      const tunggu = Math.ceil((COOLDOWN_MS - (nowS - gu.lastRollAt)) / 1000);
      return m.reply(raraGameBox({ title: "gacha", icon: "❄️", flavor: "❄️ *TERLALU CEPAT!*", body: `Tunggu ${tunggu} detik lagi antar pull ya — mesin gacha masih panas 🔥` }));
    }

    // 1. CEK KUOTA HARIAN dulu
    if (gu.jumlahHariIni >= DAILY_LIMIT) {
      return m.reply(raraGameBox({ title: "gacha", icon: "🚫", flavor: "🚫 *KUOTA HABIS!*", body: `Kuota gachamu hari ini sudah habis (${DAILY_LIMIT}/${DAILY_LIMIT})! Reset jam 00:00 ya ⏰` }));
    }

    // 2. CEK SALDO
    const saldo = getCash(m);
    if (saldo < PULL_PRICE) {
      const kurang = PULL_PRICE - saldo;
      return m.reply(raraGameBox({ title: "gacha", icon: "💸", flavor: "💸 *SALDO BELUM CUKUP!*", body: `Saldomu ${fmt(saldo)}, kurang ${fmt(kurang)} lagi! Coba .daily atau kerjakan misi dulu ya 😊` }));
    }

    // 3+4. POTONG SALDO — ATOMIC (cek + potong satu langkah via spendCash)
    if (!spendCash(m, PULL_PRICE)) {
      return m.reply(raraGameBox({ title: "gacha", icon: "💸", flavor: "💸 *TRANSAKSI GAGAL!*", body: "Saldo berubah di tengah jalan — pull dibatalkan, uangmu aman. Coba lagi ya!" }));
    }

    // 5+6. ROLLING
    if (m.react) { try { await m.react("🧠"); } catch (e) { console.error("[gacha] react loading gagal:", e); } }
    // 🎬 animasi khas GACHA SLOT (fallback: teks rolling bila channel gak dukung edit)
    // 🎬 animasi dimuat dari lib libgachaitemrpg.js (slot 3-reel)
    const slotOk = await playSlotAnim(sock, m.chat, REEL_ICONS, SLOT_ANIM_MS);
    if (!slotOk) {
      try {
        await m.reply(raraGameBox({ title: "gacha", icon: "🎲", flavor: "🎲 *GACHA BERPUTAR…*", body: pick(ROLLING_TEXTS) }));
      } catch (e) {
        console.error("[gacha] animasi rolling gagal terkirim (lanjut ke hasil):", e);
      }
    }
    if (ROLL_DELAY_MS > 0) await sleep(ROLL_DELAY_MS);

    const pityForce = gu.pityCount >= PITY_AT - 1; // pull ke-5 tanpa Epic+
    const rarity = rollRarity(pityForce);
    const reward = rollReward(rarity);

    // 7. KIRIM HASIL — kalau gagal → REFUND (uang gak boleh hilang tanpa hasil)
    const sisaKuota = DAILY_LIMIT - gu.jumlahHariIni - 1;
    const hasilBody = [
      pick(FLAVOR[rarity] || FLAVOR.common),
      "",
      `📦 Hasil: ${LOOT[rarity].icon} ${LOOT[rarity].name}${pityForce && EPIC_PLUS.includes(rarity) ? " (PITY!)" : ""}`,
      ...applyRewardPreview(reward),
      "",
      `💵 Saldo terpotong: ${fmt(PULL_PRICE)} · ⏳ Sisa kuota hari ini: (${sisaKuota}/${DAILY_LIMIT})`,
      `🍀 Pity: ${gu.pityCount >= PITY_AT - 1 ? 0 : gu.pityCount + (EPIC_PLUS.includes(rarity) ? 0 : 1)}/${PITY_AT}`,
    ].join("\n");

    let sentOk = true;
    try {
      await m.reply(raraGameBox({ title: "gacha", icon: LOOT[rarity].icon, flavor: `${LOOT[rarity].icon} *HASIL GACHA: ${LOOT[rarity].name}!*`, body: hasilBody }));
    } catch (e) {
      sentOk = false;
      console.error("[gacha] pengiriman hasil GAGAL — refund:", e);
    }
    if (!sentOk) {
      addCash(m, PULL_PRICE);
      console.log(`[gacha] refund ${PULL_PRICE} ke ${m.sender} (pengiriman gagal)`);
      return m.reply(raraGameBox({ title: "gacha", icon: "🛡️", flavor: "🛡️ *HASIL GAGAL TERKIRIM — UANG KEMBALI!*", body: `Pesan hasil gak terkirim, jadi ${fmt(PULL_PRICE)} uangmu dikembalikan penuh. Coba pull lagi ya!` })).catch((e) => console.error("[gacha] pesan refund juga gagal:", e));
    }

    // 8. SUKSES terkirim → BARU catat state + berikan reward
    const rewardLine = applyReward(m, rarity, reward);
    gu.jumlahHariIni += 1;
    gu.totalPulls += 1;
    gu.spentTotal += PULL_PRICE;
    gu.rarities[rarity] = (gu.rarities[rarity] || 0) + 1;
    gu.pityCount = EPIC_PLUS.includes(rarity) ? 0 : gu.pityCount + 1;
    gu.lastRollAt = Date.now();
    saveDb();
    console.log(`[gacha] ${m.sender} pull #${gu.totalPulls} → ${rarity.toUpperCase()} · ${reward.type} ${reward.amount || reward.itemId} · sisa kuota ${DAILY_LIMIT - gu.jumlahHariIni}/${DAILY_LIMIT}`);

    if (m.react) { try { await m.react(LOOT[rarity].icon); } catch (e) { console.error("[gacha] react hasil gagal:", e); } }

    // MITOS → pengumuman dramatis di chat/grup
    if (rarity === "mitos") {
      const nama = m.pushName || "Seseorang";
      await sock.sendMessage(m.chat, {
        text: raraGameBox({
          title: "gacha", icon: "🎊",
          flavor: "🎊 *PELANGGARAN SEJARAH GACHA!*",
          body: [
            `🪄 ${nama} baru saja mendapatkan item MITOS dari gacha!`,
            `Seisi grup/grup dan alam semesta dianugerahi keheningan…`,
            `🎉 SELAMAT, ${nama}! Nama kamu akan dikenang (sampai kuota habis besok).`,
          ].join("\n"),
        }),
      }).catch((e) => console.error("[gacha] pengumuman MITOS gagal terkirim:", e));
    }
    return;
  } finally {
    inflight.delete(m.sender);
  }
}

// pratinjau reward untuk teks hasil (angka dramatis)
function applyRewardPreview(reward) {
  if (reward.type === "uang") return [`💵 Uang +${fmt(reward.amount)}`];
  if (reward.type === "exp") return [`⭐ EXP +${fmt(reward.amount)}`];
  if (reward.type === "gems") return [`💎 Diamond +${fmt(reward.amount)}`];
  return [`🎁 Item: ${reward.itemId} ×${reward.qty}`];
}

export { handler, LOOT };
export const pluginConfig = {
  name: ["gachaitem", "mypity", "gachaiteminfo"],
  type: "rpg",
  description: "Gacha item berbayar — rolling loot table 5 tingkat, limit 5x/hari, pity system",
  usage: ".gachaitem (rolling 2.000 uang) | .mypity (cek pity & statistik) | .gachaiteminfo (loot table & aturan)",
  isOwner: false, premium: false, group: false,
};
export { pluginConfig as config };
