// rara-rpg-anim.js — RPG Animation Helper
// Sistem animasi RPG modern: "morphing message" — SATU pesan yang di-edit
// berjenjang antar scene (edit-in-place), bukan banjir pesan era bot lama.
// Scene emoji bergerak + caption naratif + counter tahap & progress bar
// dalam satu frame pesan yang selalu ter-update.
//
// Konvensi caption naratif:
//   🔍 = mulai mencari, ✔️ = tahap selesai, ➕ = sedang berlangsung, 💹 = hasil/uang
//
// Fallback otomatis: jika edit pesan gagal (device lama/dll), stage berikutnya
// dikirim sebagai pesan baru — animasi tetap jalan di semua kondisi.

import { toSC } from "./rara-menu-style.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Kirim pesan progresif dengan delay
 * @param {object} m - Baileys message object
 * @param {object} sock - Baileys socket
 * @param {string[]} steps - Array teks langkah
 * @param {number} delay - Delay antar langkah (ms), default 1200
 * @returns {Promise<void>}
 */
export async function rpgProgress(m, sock, steps, delay = 1200) {
  for (let i = 0; i < steps.length; i++) {
    if (i === steps.length - 1) break;
    await m.reply(steps[i]);
    await sleep(delay);
  }
}

const sceneBar = (cur, total) => "▰".repeat(cur) + "▱".repeat(Math.max(0, total - cur));

/**
 * Engine animasi "morphing message" modern.
 * Stage 1 dikirim sebagai pesan baru; stage berikutnya meng-EDIT pesan yang sama
 * (edit-in-place ala bot modern) — satu pesan yang ber-morph antar scene.
 * Jeda antar stage disertai indikator "mengetik..." agar terasa hidup.
 * Jika edit tidak tersedia/gagal → fallback kirim pesan baru per stage.
 *
 * @param {object} m - Baileys message object
 * @param {object} sock - Baileys socket
 * @param {string[]} scenes - Array scene (boleh multi-line)
 * @param {number} delay - Jeda antar scene (ms), default 3000
 * @param {string} [title] - Judul frame (otomatis smallcaps)
 */
export async function rpgScene(m, sock, scenes, delay = 3000, title = "") {
  const total = scenes.length;
  if (total === 0) return;
  const head = title ? `「 ✦ ${toSC(title)} ✦ 」\n\n` : "";
  const frame = (i) =>
    `${head}${scenes[i]}\n\n${toSC("tahap")} ${i + 1}/${total} ${sceneBar(i + 1, total)}`;

  // Stage 1 — kirim pesan pertama, simpan key untuk mode edit
  let key = null;
  if (sock?.sendMessage && m.chat) {
    try {
      const sent = await sock.sendMessage(m.chat, { text: frame(0) });
      key = sent?.key || null;
    } catch {
      key = null;
    }
  }
  if (!key) await m.reply(frame(0));

  // Stage 2..n — edit pesan yang sama; fallback pesan baru jika edit gagal
  for (let i = 1; i < total; i++) {
    if (sock?.sendPresenceUpdate) {
      try { await sock.sendPresenceUpdate("composing", m.chat); } catch {}
    }
    await sleep(delay);
    if (key) {
      try {
        await sock.sendMessage(m.chat, { text: frame(i), edit: key });
        continue;
      } catch {
        key = null; // edit gagal → mode fallback
      }
    }
    await m.reply(frame(i));
  }
}

/* ================= SCENE LIBRARY (ala Alya) =================
   Tiap game dapat scene sendiri: karakter/objek bergerak tiap stage
   + caption naratif. Delay default 3s → total animasi ~12s. */

const SCENE_FISHING = (spot) => [
  `~~🌊🌊🌊🎣🌊🌊🌊~~
   ~ ~ ~ ~

🔍 ${spot}...`,

  `~~🌊🌊🐟🌊🎣🌊🌊~~
   ~ ~ ~ ~

➕ Ada ikan mendekat ke umpan...`,

  `~~🌊🌊🐟🎣🌊🌊🌊~~
   ~ ~ ~ ~

➕ Kail ditarik ikan!`,

  `~~🌊🎣🐟🌊🌊🌊🌊~~
   ~ ~ ~ ~

➕ Menarik kail dengan sekuat tenaga...`,

  `🎣🐟💥💦

✔️ Ikan berhasil keluar dari air!`];

const SCENE_MINING = (spot) => [
  `🕳️🕯️
🧑⛏️⬛⬛⬛⬛⬛
🪨🪨🪨🪨🪨🪨🪨

🔍 ${spot}, mulai mengayunkan pickaxe...`,

  `🕳️🕯️
🧑⛏️💥⬛⬛⬛
🪨🪨🪨🪨🪨🪨🪨

✔️ Batu mulai retak!`,

  `🕳️🕯️
🧑⛏️⬛⬛⬛
🪨🪨💎🪨🪨🪨🪨

➕ Menemukan urat bijih...`,

  `🕳️🕯️
🧑⛏️💎🪨🪨
🪨💎🪨💎🪨🪨

✔️ Bijih berhasil dipecahkan!`];

const SCENE_NEBANG = (spot) => [
  `🧑🪓  🌳

🔍 ${spot}, mulai mengayunkan kapak...`,

  `🧑🪓💥 🌳

➕ Tak! Tak! Batang mulai retak...`,

  `🧑🪓💥🌳
      ↘️

➕ Pohon makin miring...`,

  `🧑🪓💨

🌳💨💨

✔️ TOBRAK! Pohon tumbang! 🪵🪵🪵`];

const SCENE_NGULI = (spot) => [
  `👷🧱🧱🧱
🧱🧱🧱🧱🧱

🔍 ${spot}, menyiapkan material...`,

  `👷🧱🧱🧱
🧱🧱🧱🧱🧱

➕ Mengangkut material ke atas...`,

  `👷🧱🧱
🧱🧱🧱🧱🧱🧱

➕ Menata bata satu per satu...`,

  `👷🏗️
🧱🧱🧱🧱🧱🧱🧱

✔️ Gedung makin tinggi!`];

const SCENE_SAMPAH = (spot) => [
  `🏘️🏘️🏘️🌳🏘️
🚶🗑️

🔍 ${spot}, menyusuri gang kompleks...`,

  `🏘️🏘️🏘️🌳🏘️
🚶🗑️🍾🥫

➕ Menemukan botol dan kaleng...`,

  `🏘️🏘️🏘️🌳🏘️
🚶🗑️📦

➕ Memungut sampah plastik...`,

  `🏘️🏘️🏘️🌳🏘️
🚶🗑️📦✅

✔️ Karung penuh! Berhasil terkumpul 💹`];

const SCENE_FORAGE = (spot) => [
  `🌿🌿🌳🌿🌿

🔍 ${spot}, masuk ke semak-semak...`,

  `🌿🌿🌳🌿🌿
🧑🌿🍄

➕ Menyusuri area di belakang rumah...`,

  `🌿🌿🌳🌿🌿
🧑🌿🌱🍄🌿

➕ Menemukan tanaman liar...`,

  `🌿🌿🌳🌿🌿
🧑🌿🌱🍄🌿✅

✔️ Panen tanaman berhasil!`];

const SCENE_OJEK = [
  `⬛⬛⬛⬛⬛⬛⬛⬛⬛
🚶⬛⬛⬛⬛⬛⬛🛵⬛
🏘️🏘️🏘️🌳  🌳 🏘️

🔍 Mencari pelanggan...`,

  `⬛⬛⬛⬛⬛⬛⬛⬛⬛
🚶⬛⬛⬛⬛⬛⬛🛵⬛
🏘️🏘️🏘️🌳  🌳 🏘️

✔️ Mendapatkan orderan...`,

  `⬛⬛⬛⬛⬛⬛⬛⬛⬛
🛵⬛⬛⬛⬛⬛⬛⬛⬛
🏘️🏘️🏘️🌳  🌳 🏘️ 🚶

➕ Mengantar ke tujuan...`,

  `⬛⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬛⬛⬛⬛⬛🛵⬛⬛
🏘️🏘️🏘️🌳  🌳 🏘️

➕ Sampai di tujuan...`,

  `⬛⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬛⬛⬛⬛⬛🛵⬛⬛
🏘️🏘️🏘️🌳  🌳 🏘️ 🚶

➕ 💹 Menerima gaji...`];

const SCENE_GENERIC = (emoji, location) => [
  `${emoji} ${location}...`,
  `${emoji} ➕ Sedang fokus mengerjakan...`,
  `${emoji} ➕ Hampir selesai...`,
  `${emoji} ✔️ Berhasil!`];

/* ================= PUBLIC ANIM API ================= */

/**
 * Animasi gather — dispatch scene tematik berdasarkan emoji.
 * Dipakai: mancing 🎣, mining ⛏️, nebang 🪓, nguli 👷, sampah 🗑️, forage 🌿
 */
export async function animGather(m, sock, emoji, location, delay = 3000) {
  // normalisasi label: buang "..." buntut agar caption tidak dobel titik
  const spot = String(location || "").replace(/\s*\.{2,}$/, "");
  let scenes, title;
  switch (emoji) {
    case "🎣": scenes = SCENE_FISHING(spot || "Memancing di danau"); title = "mancing"; break;
    case "⛏️": scenes = SCENE_MINING(location || "Menambang di gua"); title = "menambang"; break;
    case "🪓": scenes = SCENE_NEBANG(location || "Menebang pohon di hutan"); title = "menebang pohon"; break;
    case "👷": scenes = SCENE_NGULI(location || "Bekerja sebagai kuli"); title = "kuli bangunan"; break;
    case "🗑️": scenes = SCENE_SAMPAH(location || "Mengumpulkan sampah"); title = "memungut sampah"; break;
    case "🌿": scenes = SCENE_FORAGE(location || "Mencari tanaman liar"); title = "mencari tanaman"; break;
    default: scenes = SCENE_GENERIC(emoji, location || "Bekerja"); title = "";
  }
  await rpgScene(m, sock, scenes, delay, title);
}

/**
 * Animasi kerja — tahapan naratif misi klasik + scene lapangan
 */
export async function animKerja(m, sock, jobName, activity, delay = 3000) {
  const scenes = [
    `🔍 Berangkat ke tempat kerja...`,
    `✔️ Mulai bekerja sebagai ${jobName}...`,
    `➕ ${activity}...`,
    `➕ Menyelesaikan tugas...`,
    `➕ 💹 Menerima gaji...`,
  ];
  await rpgScene(m, sock, scenes, delay, jobName);
}

/**
 * Animasi ojek online — minimap ala misi klasik
 */
export async function animOjek(m, sock, delay = 3000) {
  await rpgScene(m, sock, SCENE_OJEK, delay, "ojek online");
}

/**
 * Animasi bertarung — round-by-round combat log
 */
export async function animBattle(m, sock, attacker, defender, rounds, delay = 1400) {
  const total = rounds.length;
  const shown = [];
  let key = null;
  const frame = () => `⚔️ ${attacker} vs ${defender}\n\n` + shown.join("\n");
  const sendFrame = async () => {
    if (key) {
      try { await sock.sendMessage(m.chat, { text: frame(), edit: key }); return; }
      catch { key = null; }
    } else if (sock?.sendMessage && m.chat) {
      try {
        const s = await sock.sendMessage(m.chat, { text: frame() });
        key = s?.key || null;
        if (key) return;
      } catch {}
    }
    await m.reply(frame());
  };

  for (let i = 0; i < total; i++) {
    const r = rounds[i];
    let line = `➕ R${i + 1}: `;
    if (r.dodged) {
      line += `💨 ${defender} menghindar!`;
    } else if (r.crit) {
      line += `💥 CRIT! ${attacker} serang *${r.dmg}*`;
    } else {
      line += `🗡️ ${attacker} serang *${r.dmg}*`;
    }
    if (r.monsterDmg && !r.dodged) {
      line += ` | ${defender} balas *${r.monsterDmg}*`;
    }
    line += ` — ${defender} HP: ${Math.max(0, r.monsterHp)}❤️`;

    if (i % 2 === 1 || i === total - 1) {
      shown.push(line);
      await sendFrame();
      await sleep(delay);
    }
  }
}

/**
 * Animasi battle TURN-BY-TURN ala adventure script owner (8 Sep 2026,
 * request: "ke rpg .adventure tambah animasi ini").
 * Frame intro PERTEMPURAN DIMULAI → tiap round: serangan player (damage +
 * HP musuh) + balasan musuh (damage + HP player) → frame final menang/kalah.
 * Morphing: frame dikirim lalu di-EDIT berjenjang; fallback pesan baru.
 *
 * @param {object} opts
 *   playerName, enemyName, enemyHp, enemyMaxHp, playerHp, playerMaxHp,
 *   rounds: [{ dmg, enemyHpAfter, monsterDmg, playerHpAfter }],
 *   victory: boolean
 */
export async function animBattleTurns(m, sock, opts, delay = 1600) {
  const {
    playerName = "Petualang", enemyName = "Monster",
    enemyHp = 100, enemyMaxHp = 100, playerHp = 100, playerMaxHp = 100,
    rounds = [], victory = true,
  } = opts || {};

  // Susun frame
  const frames = [];
  frames.push(
    `⚔️ *PERTEMPURAN DIMULAI!*\n` +
    `👹 Musuh: ${enemyName} (HP: ${enemyHp})\n` +
    `❤️ ${playerName}: ${playerHp}/${playerMaxHp}`
  );
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    let f = `⚔️ *${playerName}* menyerang! Damage: *${r.dmg}*\n` +
            `👹 ${enemyName} HP: ${r.enemyHpAfter}/${enemyMaxHp}`;
    if (r.monsterDmg > 0) {
      f += `\n💢 *${enemyName}* membalas! Damage: *${r.monsterDmg}*\n` +
           `❤️ ${playerName} HP: ${r.playerHpAfter}/${playerMaxHp}`;
    }
    frames.push(f);
  }
  frames.push(victory
    ? `🎉 *${enemyName.toUpperCase()} KALAH!* 🏆`
    : `💀 *${playerName.toUpperCase()} KALAH!* Semoga beruntung lain kali...`);

  // Morphing message — kirim frame pertama, sisanya edit-in-place
  let key = null;
  const send = async (text) => {
    if (key) {
      try { await sock.sendMessage(m.chat, { text, edit: key }); return; }
      catch { key = null; }
    }
    try {
      const s = await sock.sendMessage(m.chat, { text });
      key = s?.key || null;
      if (key) return;
    } catch {}
    await m.reply(text);
  };
  for (let i = 0; i < frames.length; i++) {
    await send(frames[i]);
    if (i < frames.length - 1) {
      if (sock?.sendPresenceUpdate) { try { await sock.sendPresenceUpdate("composing", m.chat); } catch {} }
      await sleep(delay);
    }
  }
}

/**
 * Animasi slot machine — spinning reels
 */
export async function animSlot(m, sock, symbols, delay = 1500) {
  const rnd = () => ["🍒", "🍋", "🍊", "🔔", "⭐", "💎"][Math.floor(Math.random() * 6)];
  await rpgScene(m, sock, [
    `🎰 [ ${rnd()} | ${rnd()} | ${rnd()} ]`,
    `🎰 [ ${symbols[0]} | ${rnd()} | ${rnd()} ]`,
    `🎰 [ ${symbols[0]} | ${symbols[1]} | ${rnd()} ]`,
    `🎰 [ ${symbols[0]} | ${symbols[1]} | ${symbols[2]} ] ◄`,
  ], delay, "slot");
}

/**
 * Animasi roulette — ball spinning
 */
export async function animRoulette(m, sock, delay = 1800) {
  await rpgScene(m, sock, [
    `🎡 Roulette berputar...`,
    `➕ Bola meluncur di roda... 🔄`,
    `➕ Bola melambat...`,
    `✔️ Bola berhenti!`,
  ], delay, "roulette");
}

/**
 * Animasi dungeon — entering
 */
export async function animDungeon(m, sock, stageCount, delay = 2000) {
  await rpgScene(m, sock, [
    `🏰 Berdiri di depan gerbang dungeon...`,
    `➕ Menyusuri lorong gelap (${stageCount} stage)...`,
    `➕ Suara geraman terdengar dari kejauhan...`,
    `✔️ Ruang bos terdeteksi!`,
  ], delay, "dungeon");
}

/**
 * Animasi adventure — journey
 */
export async function animAdventure(m, sock, biome, delay = 2000) {
  await rpgScene(m, sock, [
    `🧭 Berangkat ke ${biome}...`,
    `➕ Menjelajah area...`,
    `➕ Mencari sesuatu yang berkilau...`,
    `✔️ Menemukan sesuatu!`,
  ], delay, "petualangan");
}

/**
 * Animasi crafting — progress bar
 */
export async function animCraft(m, sock, craftName, delay = 1800) {
  await rpgScene(m, sock, [
    `🔨 Menyiapkan material untuk ${craftName}...`,
    `➕ Menempa dan merakit...`,
    `➕ Finishing dan mengasah...`,
    `✔️ ${craftName} selesai dibuat!`,
  ], delay, "crafting");
}

/**
 * Animasi gacha — suspense reveal
 */
export async function animGacha(m, sock, delay = 1800) {
  await rpgScene(m, sock, [
    `🎁 Membuka kotak gacha...`,
    ` Cahaya mulai memancar...`,
    `➕ Kaget! Ada sesuatu di dalam...`,
    `✔️ Reveal!`,
  ], delay, "gacha");
}

export { sleep as rpgSleep };

/**
 * Animasi heal/rest — recovery process
 */
export async function animHeal(m, sock, delay = 1800) {
  await rpgScene(m, sock, [
    `🧪 Menyiapkan ramuan...`,
    `➕ Meminum dan merasakan efeknya...`,
    `✔️ HP pulih kembali! 💚`,
  ], delay, "heal");
}

/**
 * Animasi bank — transaksi
 */
export async function animBank(m, sock, action, delay = 1800) {
  const emoji = action === "nabung" ? "🏦" : "💸";
  await rpgScene(m, sock, [
    `${emoji} Memproses ${action}...`,
    `➕ Menghitung koin...`,
    `✔️ Transaksi selesai!`,
  ], delay, "bank");
}

/**
 * Animasi shop/buy — pembelian
 */
export async function animShop(m, sock, action, delay = 1800) {
  await rpgScene(m, sock, [
    `🛒 ${action === "buy" ? "Membeli" : "Menjual"} item...`,
    `➕ Memproses transaksi...`,
    `✔️ Selesai!`,
  ], delay, "toko");
}

/**
 * Animasi daily reward — unboxing
 */
export async function animDaily(m, sock, delay = 1800) {
  await rpgScene(m, sock, [
    `📅 Cek login harian...`,
    `🎁 Membuka kotak reward...`,
    `✔️ Reveal!`,
  ], delay, "daily reward");
}

/**
 * Animasi level up
 */
export async function animLevelUp(m, sock, level) {
  await m.reply("⭐ EXP penuh!");
  await sleep(500);
  await m.reply("💫 Level up...");
  await sleep(800);
  await m.reply(`🎉 Selamat! Level ${level}!`);
  await sleep(300);
}

/**
 * Animasi quest/mission
 */
export async function animQuest(m, sock, questName, delay = 2000) {
  await rpgScene(m, sock, [
    `📜 Menerima quest: ${questName}...`,
    `➕ Menjalankan misi...`,
    `✔️ Misi selesai!`,
  ], delay, "quest");
}

/**
 * Animasi crafting upgrade/enchant
 */
export async function animEnchant(m, sock, itemName, delay = 1800) {
  await rpgScene(m, sock, [
    ` Meng-enchant ${itemName}...`,
    `➕ Mantra mulai meresap...`,
    `✔️ Berhasil!`,
  ], delay, "enchant");
}

/**
 * Animasi investasi
 */
export async function animInvest(m, sock, amount, delay = 1800) {
  await rpgScene(m, sock, [
    `📈 Menginvestasikan ${amount} gold...`,
    `➕ Menganalisis pasar...`,
    `✔️ Investasi tercatat!`,
  ], delay, "investasi");
}

/**
 * Animasi fishing v2 — more detailed
 */
export async function animFishV2(m, sock) {
  await m.reply("🎣 Melempar pancing...");
  await sleep(1000);
  await m.reply("🌊 Menunggu ikan... ▰▱▱▱▱");
  await sleep(800);
  await m.reply("🎣 Ada tarikan! ▰▰▰▱▱");
  await sleep(600);
  await m.reply("🐟 Menarik... ▰▰▰▰▰");
  await sleep(400);
}

/**
 * Animasi farm/berkebon — tahapan naratif
 */
export async function animFarm(m, sock, action, delay = 3000) {
  const scenes = [
    `🌱 ${action || "Menanam"} benih...

🔍 Membajak tanah dan menabur benih...`,
    `🌱➕💧

➕ Menyiram dan merawat tanaman...`,
    `🌱🌿🌿

➕ Tanaman mulai tumbuh subur...`,
    `🌿🌿🌿✅

✔️ Panen berhasil! 💹`,
  ];
  await rpgScene(m, sock, scenes, delay, "berkebon");
}

/**
 * Animasi hunt — berburu mangsa ala misi klasik
 */
export async function animHunt(m, sock, target) {
  const scenes = [
    `🔍 Sedang mencari mangsa...`,
    `🎯 Dapat sasaran!`,
    `🔥 Dor!`,
    `✔️ Nah ini dia!`,
  ];
  await rpgScene(m, sock, scenes, 2500, "berburu");
}

// ═══════════════════════════════════════════════════
// ANIMASI BERBURU ALA SCRIPT OWNER (morphing 1 pesan per fase)
// Melacak jejak → Memanah → Hasil buruan
// ═══════════════════════════════════════════════════

// Helper morphing: kirim frame 1, sisanya edit-in-place (pola animBattleTurns)
async function huntMorph(m, sock, frames, delay = 1400) {
  let key = null;
  const send = async (text) => {
    if (key) {
      try { await sock.sendMessage(m.chat, { text, edit: key }); return; }
      catch { key = null; }
    }
    try {
      const s = await sock.sendMessage(m.chat, { text });
      key = s?.key || null;
      if (key) return;
    } catch {}
    await m.reply(text);
  };
  for (let i = 0; i < frames.length; i++) {
    await send(frames[i]);
    if (i < frames.length - 1) {
      if (sock?.sendPresenceUpdate) { try { await sock.sendPresenceUpdate("composing", m.chat); } catch {} }
      await sleep(delay);
    }
  }
}

// ─── SCENE ENGINE BERBURU (rev 9 Sep 2026, request owner:
// "animasinya diedit-edit, banyak emot — hewannya gerak, panahnya
// nyebrang". Tiap fase = strip adegan 10 slot yang digambar ulang
// per frame, elemen beneran berpindah. ───
const HUNT_ANIMAL_EMOJI = (name) => {
  const n = String(name || "").toLowerCase();
  if (/phoenix/.test(n)) return "🔥";
  if (/griffin|elang/.test(n)) return "🦅";
  if (/naga/.test(n)) return "🐲";
  if (/harimau/.test(n)) return "🐯";
  if (/kelelawar/.test(n)) return "🦇";
  if (/ular/.test(n)) return "🐍";
  if (/lebah/.test(n)) return "🐝";
  if (/beruang/.test(n)) return "🐻";
  if (/putih|serigala/.test(n)) return "🐺";
  if (/babi/.test(n)) return "🐗";
  if (/burung/.test(n)) return "🐦";
  if (/kelinci/.test(n)) return "🐰";
  if (/rusa/.test(n)) return "🦌";
  return "🦌";
};

// strip adegan: 10 slot — slot 0 pemburu 🏹, sisanya hutan 🌲
const huntStrip = (animalPos, animalEmoji, extra = {}) => {
  const W = 10;
  const slots = new Array(W).fill("🌲");
  slots[0] = "🏹";
  slots[animalPos] = animalEmoji;
  if (extra.arrowEnd && extra.arrowStart) {
    for (let i = extra.arrowStart; i <= extra.arrowEnd; i++) if (slots[i] === "🌲") slots[i] = "➤";
  }
  if (extra.impact) slots[animalPos - 1] = "💥";
  return slots.join("");
};

// FASE 1: MELACAK JEJAK (5 frame) — hewan berjalan mendekat di jalur hutan,
// jejak kaki 👣 numpuk di belakangnya tiap frame.
export async function animHuntTrack(m, sock, animalName, delay = 1400) {
  const em = HUNT_ANIMAL_EMOJI(animalName);
  const pos = [8, 7, 6, 5, 3];
  const notes = [
    `🔍 *MELACAK JEJAK...*\n\n🕵️ menemukan jejak ${animalName}...`,
    `👣 jejak makin jelas — masih hangat!`,
    `🌿 gerakan terlihat di antara pepohonan!`,
    `🤫 pelan-pelan... jangan bikin suara!`,
  ];
  const frames = pos.map((p, i) =>
    (i === 0 ? notes[0] + "\n\n" : "") +
    huntStrip(p, em) +
    `\n${"👣".repeat(i + 1)}\n\n` +
    (i < pos.length - 1 ? (i === 0 ? "🐾 mulai mengikuti jejak..." : notes[i]) || "" : `🎯 *TARGET DITEMUKAN!*\n\n${em} ${animalName} berhenti — jarak bidik pas!`)
  );
  await huntMorph(m, sock, frames, delay);
}

// FASE 2: MEMANAH (4 frame) — panah ➤ meluncur slot-per-slot
// menembus hutan ke arah hewan.
export async function animHuntShoot(m, sock, animalName, delay = 1400) {
  const em = HUNT_ANIMAL_EMOJI(animalName);
  const flight = [
    { start: 0, end: 0, note: `🏹 *MEMANAH!*\n\n🎯 membidik ${animalName}... 🌬️ tarik tali busur...` },
    { start: 1, end: 2, note: `💨 LEPAS! anak panah meluncur!` },
    { start: 3, end: 5, note: `➤➤➤ makin dekat! angin ikut berbisik...` },
    { start: 6, end: 7, note: `⚡ hampir sampai!` },
  ];
  const frames = flight.map((f) => `${huntStrip(8, em, { arrowStart: f.start, arrowEnd: f.end })}\n\n${f.note}`);
  await huntMorph(m, sock, frames, delay);
}

// FASE 3: HASIL BURUAN — kena (panah nembus 💥 + hewan terjatuh,
// lalu dibawa pulang) / kabur (hewan nyerobot ke kanan hilang di
// semak sambil ninggalin debu 💨).
export async function animHuntResult(m, sock, opts, delay = 1400) {
  const { animalName, success, loot } = opts || {};
  const em = HUNT_ANIMAL_EMOJI(animalName);
  const frames = success
    ? [
        `🎯 *PANAH MENGENAI!*\n\n${huntStrip(8, em, { arrowStart: 5, end: 7, arrowEnd: 7, impact: true })}\n\n💥 ${animalName} terjatuh!`,
        `🏹🌲🌲🌲🌲🌲🌲🌲🫥🌲\n\n✅ Berhasil diburu! dibaris ke kamp.`,
        ...(loot ? [`📦 Mendapatkan: ${loot}`] : []),
      ]
    : [
        `😰 ${animalName} menghindar!\n\n${huntStrip(8, em, { impact: true })}\n\n➤➤ nyangkut di batang pohon...`,
        `💨 menerjang kabur ke semak!\n\n${huntStrip(9, em)}\n\n🏃 makin jauh...`,
        `💨 *Buruan kabur...*\n\n🏹🌲🌲🌲🌲🌲🌲🌲🌲💨\n\n🌱 mungkin lain kali!`,
      ];
  await huntMorph(m, sock, frames, delay);
}

/**
 * Animasi arena PvP
 */
export async function animArena(m, sock, p1, p2, delay = 1500) {
  await rpgScene(m, sock, [
    `⚔️ ${p1} vs ${p2}`,
    `➕ Kedua petarung saling menatap...`,
    `➕ 3... 2... 1...`,
    `✔️ FIGHT! 🥊`,
  ], delay, "arena pvp");
}

/**
 * Animasi auction — bidding
 */
export async function animAuction(m, sock, item, delay = 1800) {
  await rpgScene(m, sock, [
    `🏛️ Lelang ${item} dimulai!`,
    `💰 Menerima tawaran...`,
    `➕ Tawaran makin tinggi!`,
    `✔️ Hammer jatuh!`,
  ], delay, "lelang");
}

/**
 * Animasi skill learning
 */
export async function animLearnSkill(m, sock, skillName, delay = 2000) {
  await rpgScene(m, sock, [
    `📖 Mempelajari ${skillName}...`,
    `➕ Membaca gulungan...`,
    `➕ Berlatih gerakan...`,
    `✔️ Skill dikuasai!`,
  ], delay, "belajar skill");
}

/**
 * Animasi generic — SEAM NO-OP sejak 14 Sep 2026 (owner: "animasi loading
 * gak perlu, udah ada loading react emoji — hapus aja"). Dulu morphing
 * "Label... → Sedang diproses → Selesai" di 92 plugin RPG. Signature
 * dipertahanin biar 92 call site gak perlu diubah — sekarang langsung
 * lolos, loading cukup react emoji (🕒→🐣) dari handler. Anim konten
 * nyata (hunt/battle/profesi) tetap via rpgScene langsung.
 */
export async function animGeneric(m, sock, emoji, label, steps, delay = 2000) {
  return;
}

/* ============ ANIMASI EVENT & GAME POPULER (morphing) ============ */

/**
 * Sabung ayam — arena adu ayam
 */
export async function animSabung(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🐓 Arena sabung semakin ramai...\n\n🐓 🥊 🐓`,
    `➕ Kedua ayam saling menerjang!\n\n🐓💥🐓`,
    `➕ Ronde panas! Bulu beterbangan...\n\n💨🐓💥🐓💨`,
    `✔️ Ronde selesai! Menunggu hasil pertarungan...`,
  ], delay, "sabung ayam");
}

/**
 * Duel dadu — lemparan dadu
 */
export async function animDice(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🎲 Melempar dadu ke meja...`,
    `➕ Dadu berputar... 🎲🔄`,
    `➕ Dadu melambat...`,
    `✔️ Angka keluar!`,
  ], delay, "duel dadu");
}

/**
 * Hi-Lo dadu — tebak besar/kecil
 */
export async function animHiLo(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🎲 Melempar dadu...`,
    `➕ Dadu bergulir di meja...`,
    `✔️ Angka keluar!`,
  ], delay, "hi-lo dadu");
}

/**
 * Pacuan kuda — balapan kuda
 */
export async function animHorserace(m, sock, horseName, delay = 2000) {
  await rpgScene(m, sock, [
    `🐎 ${horseName} masuk lintasan...`,
    `🏁 Start! Kuda-kuda melesat...`,
    `➕ Tikungan terakhir, posisi terdepan diperebutkan!`,
    `✔️ Melewati garis finis!`,
  ], delay, "pacuan kuda");
}

/**
 * Lotre — pembelian tiket undian
 */
export async function animLottery(m, sock, count, delay = 2000) {
  await rpgScene(m, sock, [
    `🎟️ Membeli ${count} tiket undian...`,
    `➕ Menghitung nomor keberuntungan...`,
    `✔️ Tiket resmi masuk undian!`,
  ], delay, "lotre");
}

/**
 * Gajian — ambil gaji harian
 */
export async function animGajian(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🏦 Menuju kasir kantor...`,
    `➕ Menghitung gaji...`,
    `✔️ Gaji cair! 💹`,
  ], delay, "gajian");
}

/**
 * Heist — merampok target
 */
export async function animHeist(m, sock, emoji, targetName, delay = 2000) {
  await rpgScene(m, sock, [
    `${emoji || "🥷"} Menyusup ke ${targetName}...`,
    `➕ Merampok isi brankas...`,
    `✔️ Kabur dengan jarahan!`,
  ], delay, "heist");
}

/**
 * Harta karun — penggalian harta
 */
export async function animTreasure(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🗺️ Mendekati titik X di peta...`,
    `➕ Menggali dengan cangkul...`,
    `➕ Ada kilau emas dari dalam tanah! `,
    `✔️ Peti harta ditemukan!`,
  ], delay, "harta karun");
}

/**
 * Casino — putaran mesin
 */
export async function animCasino(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🎰 Mesin mulai berputar...`,
    `➕ Reel pertama melambat...`,
    `➕ Reel kedua berhenti...`,
    `✔️ Reel terakhir menentukan nasib!`,
  ], delay, "casino");
}

/**
 * Begal — merampok di jalan
 */
export async function animBegal(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🦹 Mengintai target dari kegelapan...`,
    `➕ Menyergap dengan gerakan cepat...`,
    `✔️ Aksi selesai! Lari dari TKP...`,
  ], delay, "begal");
}

/**
 * Boss fight — serang boss
 */
export async function animBossFight(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🐲 Boss muncul di hadapanmu!`,
    `➕ Menghindari serangan besar...`,
    `➕ Menemukan celah pertahanannya!`,
    `✔️ Melepaskan serangan pamungkas!`,
  ], delay, "boss fight");
}

/**
 * Guild war — perang antar guild
 */
export async function animGuildWar(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `⚔️ Guild berkumpul di markas...`,
    `➕ Barisan maju ke medan perang...`,
    `✔️ Peperangan dimulai!`,
  ], delay, "guild war");
}

/**
 * Invasi — serbu wilayah musuh
 */
export async function animInvasion(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `⚔️ Pasukanmu bergerak ke wilayah musuh...`,
    `➕ Menembus pertahanan luar...`,
    `✔️ Pertempuran sengit berlangsung!`,
  ], delay, "invasi");
}

/**
 * Rift — dimensi retak
 */
export async function animRift(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🌀 Portal rift terbuka...`,
    `➕ Melangkah ke dimensi retak...`,
    `✔️ Sesuatu berkilau di dalam!`,
  ], delay, "rift");
}

/**
 * Survival — bertahan hidup
 */
export async function animSurvival(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🏕️ Membangun kamp di alam liar...`,
    `➕ Bertahan dari malam berbahaya...`,
    `✔️ Kamu berhasil bertahan hidup!`,
  ], delay, "mode survival");
}

/**
 * Bansos — antre bantuan sosial
 */
export async function animBansos(m, sock, delay = 2000) {
  await rpgScene(m, sock, [
    `🤲 Mengantri di posko bansos...`,
    `➕ Menunjukkan kartu penerima...`,
    `✔️ Paket bansos diterima! 💹`,
  ], delay, "bansos");
}
