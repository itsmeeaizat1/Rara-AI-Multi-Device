// nova-rpg-anim.js — RPG Animation Helper
// Progressive message-based animation system for WhatsApp RPG

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

/**
 * Animasi kerja — simulasi proses bekerja
 */
export async function animKerja(m, sock, jobName, activity) {
  const steps = [
    `👔 ${jobName}: ${activity}...`,
    `⏳ Sedang bekerja...`,
    `📦 Menyelesaikan tugas...`,
  ];
  await rpgProgress(m, sock, steps, 1000);
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
 * Animasi mining/digging/fishing — progress bar
 */
export async function animGather(m, sock, emoji, location) {
  await m.reply(`${emoji} ${location}...`);
  await sleep(600);
  await m.reply(`⏳ Progress: ▰▰▱▱▱`);
  await sleep(500);
  await m.reply(`⏳ Progress: ▰▰▰▰▱`);
  await sleep(500);
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
 * Animasi farm/berkebon
 */
export async function animFarm(m, sock, action) {
  const steps = [
    `🌱 ${action || "Menanam"} benih...`,
    "💧 Menyiram tanaman...",
    "⏳ Menunggu tumbuh... ▰▰▰▱▱",
  ];
  await rpgProgress(m, sock, steps, 800);
}

/**
 * Animasi hunt — berburu liar
 */
export async function animHunt(m, sock, target) {
  await m.reply(`🏹 Memburu ${target}...`);
  await sleep(800);
  await m.reply("🔍 Melacak jejak... ▰▰▱▱▱");
  await sleep(600);
  await m.reply("⚔️ Menyerang! ▰▰▰▰▰");
  await sleep(400);
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
