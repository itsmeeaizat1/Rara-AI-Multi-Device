// nova-rpg-anim.js — RPG Animation Helper
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

import { toSC } from "./nova-menu-style.js";

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
🧑⛏️✨⬛⬛⬛
🪨🪨💎🪨🪨🪨🪨

➕ Menemukan urat bijih...`,

  `🕳️🕯️
🧑⛏️💎🪨🪨
🪨💎🪨✨💎🪨🪨

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
export async function animBattle(m, sock, attacker, defender, rounds) {
  let log = `⚔️ ╭─「 BATTLE START 」\n`;
  log += `│ ${attacker} vs ${defender}\n`;
  log += `╰────\n`;
  await m.reply(log);
  await sleep(800);

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    let line = `┊ Round ${i + 1}: `;
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
    line += `\n   ${defender} HP: ${Math.max(0, r.monsterHp)}❤️`;

    if (i % 2 === 1 || i === rounds.length - 1) {
      await m.reply(line);
      await sleep(700);
    }
  }
}

/**
 * Animasi slot machine — spinning reels
 */
export async function animSlot(m, sock, symbols) {
  const spinSyms = ["🍒", "🍋", "🍊", "🔔", "⭐", "💎"];
  await m.reply("🎰 Spinning...");
  await sleep(500);
  for (let i = 0; i < 2; i++) {
    const r = spinSyms[Math.floor(Math.random() * spinSyms.length)];
    const r2 = spinSyms[Math.floor(Math.random() * spinSyms.length)];
    const r3 = spinSyms[Math.floor(Math.random() * spinSyms.length)];
    await m.reply(`🎰 [ ${r} | ${r2} | ${r3} ]`);
    await sleep(400);
  }
  await m.reply(`🎰 [ ${symbols[0]} | ${symbols[1]} | ${symbols[2]} ] ◄`);
  await sleep(300);
}

/**
 * Animasi roulette — ball spinning
 */
export async function animRoulette(m, sock) {
  await m.reply("🎡 Roulette spinning...");
  await sleep(800);
  await m.reply("🎡 Bola berputar... 🔄");
  await sleep(700);
  await m.reply("🎡 Melambat...");
  await sleep(500);
}

/**
 * Animasi dungeon — entering
 */
export async function animDungeon(m, sock, stageCount) {
  await m.reply(`🏰 Memasuki dungeon... (${stageCount} stage)`);
  await sleep(1000);
}

/**
 * Animasi adventure — journey
 */
export async function animAdventure(m, sock, biome) {
  const steps = [
    `🧭 Berangkat ke ${biome}...`,
    `🚶 Menjelajah area...`,
    `🔍 Mencari sesuatu...`,
  ];
  await rpgProgress(m, sock, steps, 900);
}

/**
 * Animasi crafting — progress bar
 */
export async function animCraft(m, sock, craftName) {
  await m.reply(`🔨 Crafting ${craftName}...`);
  await sleep(600);
  await m.reply(`⏳ ▰▰▰▱▱`);
  await sleep(500);
  await m.reply(`⏳ ▰▰▰▰▰ ✅`);
  await sleep(300);
}

/**
 * Animasi gacha — suspense reveal
 */
export async function animGacha(m, sock) {
  await m.reply("🎁 Membuka gacha...");
  await sleep(800);
  await m.reply("✨ Cahaya muncul...");
  await sleep(700);
  await m.reply("🌟 Reveal...");
  await sleep(500);
}

export { sleep as rpgSleep };

/**
 * Animasi heal/rest — recovery process
 */
export async function animHeal(m, sock) {
  await m.reply("🧪 Menyiapkan ramuan...");
  await sleep(600);
  await m.reply("💚 HP regenerating... ▰▰▱▱▱");
  await sleep(500);
  await m.reply("💚 HP regenerating... ▰▰▰▰▰ ✅");
  await sleep(300);
}

/**
 * Animasi bank — transaksi
 */
export async function animBank(m, sock, action) {
  const emoji = action === "nabung" ? "🏦" : "💸";
  await m.reply(`${emoji} Memproses ${action}...`);
  await sleep(700);
  await m.reply("⏳ Menghitung koin... ▰▰▰▱▱");
  await sleep(500);
  await m.reply("⏳ Selesai! ▰▰▰▰▰ ✅");
  await sleep(300);
}

/**
 * Animasi shop/buy — pembelian
 */
export async function animShop(m, sock, action) {
  await m.reply(`🛒 ${action === "buy" ? "Membeli" : "Menjual"} item...`);
  await sleep(600);
  await m.reply("⏳ Memproses transaksi... ▰▰▰▱▱");
  await sleep(400);
  await m.reply("⏳ Selesai! ▰▰▰▰▰ ✅");
  await sleep(300);
}

/**
 * Animasi daily reward — unboxing
 */
export async function animDaily(m, sock) {
  await m.reply("📅 Cek login harian...");
  await sleep(600);
  await m.reply("🎁 Membuka reward box...");
  await sleep(800);
  await m.reply("✨ Reveal...");
  await sleep(400);
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
export async function animQuest(m, sock, questName) {
  await m.reply(`📜 Menerima quest: ${questName}...`);
  await sleep(700);
  await m.reply("⚔️ Menjalankan misi...");
  await sleep(800);
}

/**
 * Animasi crafting upgrade/enchant
 */
export async function animEnchant(m, sock, itemName) {
  await m.reply(`✨ Meng-enchant ${itemName}...`);
  await sleep(600);
  await m.reply("⏳ ▰▰▱▱▱ Glow effect...");
  await sleep(500);
  await m.reply("⏳ ▰▰▰▰▰ ✅ Berhasil!");
  await sleep(300);
}

/**
 * Animasi investasi
 */
export async function animInvest(m, sock, amount) {
  await m.reply(`📈 Menginvestasikan ${amount} gold...`);
  await sleep(700);
  await m.reply("📊 Market analyzing... ▰▰▰▱▱");
  await sleep(500);
  await m.reply("📊 Done! ▰▰▰▰▰");
  await sleep(300);
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

/**
 * Animasi arena PvP
 */
export async function animArena(m, sock, p1, p2) {
  await m.reply(`⚔️ ╭─「 ARENA PVP 」`);
  await sleep(500);
  await m.reply(`│ ${p1} vs ${p2}`);
  await sleep(500);
  await m.reply("│ Fight starts in 3...");
  await sleep(500);
  await m.reply("│ 2...");
  await sleep(500);
  await m.reply("│ 1... FIGHT! 🥊");
  await sleep(300);
}

/**
 * Animasi auction — bidding
 */
export async function animAuction(m, sock, item) {
  await m.reply(`🏛️ Lelang: ${item} dimulai!`);
  await sleep(800);
  await m.reply("💰 Menerima tawaran... ▰▰▱▱▱");
  await sleep(600);
  await m.reply("💰 Tawaran naik! ▰▰▰▰▰");
  await sleep(400);
}

/**
 * Animasi skill learning
 */
export async function animLearnSkill(m, sock, skillName) {
  await m.reply(`📖 Mempelajari ${skillName}...`);
  await sleep(800);
  await m.reply("⏳ ▰▰▱▱▱ Reading scroll...");
  await sleep(500);
  await m.reply("⏳ ▰▰▰▰▱ Practicing...");
  await sleep(500);
  await m.reply("✅ Mastered!");
  await sleep(300);
}

/**
 * Animasi generic — untuk plugin yang butuh animasi simple
 */
export async function animGeneric(m, sock, emoji, label, steps) {
  const fullSteps = steps || [
    `${emoji} ${label}...`,
    `⏳ Progress... ▰▰▰▱▱`,
    `⏳ Done! ▰▰▰▰▰ ✅`,
  ];
  await rpgProgress(m, sock, fullSteps, 800);
}
