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
