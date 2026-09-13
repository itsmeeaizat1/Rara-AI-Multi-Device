// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// pet.js — Pet System v2 (adopsi, feed, level up, battle)
// Upgrade 9 Sep 2026: ekonomi Rp (rpg.cash) + 3 bentuk animasi BARU —
// telur menetas (adopt), makanan menghilang (feed), arena hati HP (battle).
// Semua morph edit-in-place, fallback kirim frame terbaru sebagai pesan baru.

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
import { spendCash, addCash, getCash, formatRp } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "pet",
  alias: ["pet", "mypet", "peliharaan", "adoptpet"],
  category: "rpg",
  description: "Pet system v2 — adopsi, feed, battle arena, duel pemain, leaderboard pet terkuat",
  usage: ".pet — info pet\n.pet adopt <type> — adopsi (Rp)\n.pet feed — beri makan (Rp 2.000)\n.pet battle — lawan pet liar\n.pet battle @user — duel pet pemain\n.pet top — pet terkuat\n.pet help — bantuan",
  example: ".pet adopt dragon\n.pet feed\n.pet battle",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

// ─── DATA PET (harga Rp — ekonomi bot) ───
const PET_TYPES = [
  { type: "cat", emoji: "🐱", baseAtk: 20, baseDef: 15, cost: 50000 },
  { type: "wolf", emoji: "🐺", baseAtk: 40, baseDef: 25, cost: 150000 },
  { type: "eagle", emoji: "🦅", baseAtk: 38, baseDef: 22, cost: 175000 },
  { type: "tiger", emoji: "🐅", baseAtk: 45, baseDef: 30, cost: 200000 },
  { type: "shark", emoji: "🦈", baseAtk: 55, baseDef: 20, cost: 250000 },
  { type: "unicorn", emoji: "🦄", baseAtk: 35, baseDef: 45, cost: 300000 },
  { type: "dragon", emoji: "🐉", baseAtk: 50, baseDef: 30, cost: 350000 },
  { type: "phoenix", emoji: "🔥", baseAtk: 60, baseDef: 20, cost: 400000 },
];

const FEED_COST = 2000;
const FEED_COOLDOWN = 60 * 60 * 1000; // 1 jam
const PET_ANIM_MS = Number(process.env.PET_ANIM_MS) || 1100; // knob jeda frame

const sleepShort = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── ENGINE MORPH PUSAT (edit-in-place + fallback) ───
async function morph(m, sock, frames, delay = PET_ANIM_MS) {
  let key = null;
  try {
    const s = await sock?.sendMessage?.(m.chat, { text: frames[0] });
    key = s?.key || null;
  } catch { key = null; }
  if (!key) { try { await m.reply(frames[0]); } catch {} }
  for (let i = 1; i < frames.length; i++) {
    try { await sock?.sendPresenceUpdate?.("composing", m.chat); } catch {}
    await sleepShort(delay);
    if (key) {
      try { await sock.sendMessage(m.chat, { text: frames[i], edit: key }); continue; } catch { key = null; }
    }
    try { await m.reply(frames[i]); } catch {}
  }
}

// ─── ANIMASI 1: TELUR MENETAS (adopt) — bentuk baru: retakan bertambah ───
function eggHatchFrames(petEmoji) {
  return [
    "🥚 Telur dierami dengan penuh kasih sayang...",
    "🥚 Telur goyang... ada yang bergerak di dalam!",
    "🥚⚠️ KRAK! Retakan pertama muncul!",
    "🥚💥 KRAKK! Retakan makin lebar, ada cahaya!",
    `🐣 Kepala keluar... ${petEmoji} PET KAMU LAHIR!`,
  ];
}

// ─── ANIMASI 2: MAKANAN MENGHILANG (feed) — bentuk baru: jatah menyusut ───
function munchFrames(petEmoji) {
  return [
    `🍽️ ${petEmoji} disajikan: 🍖🍖🍖🍖🍖`,
    `🍽️ ${petEmoji} lahap: 🍖🍖🍖🍖`,
    `🍽️ ${petEmoji} semangat: 🍖🍖🍖`,
    `😋 ${petEmoji} tinggal: 🍖🍖`,
    `😋 ${petEmoji} *BURP!* Kenyang puas!`,
  ];
}

// ─── ANIMASI 3: ARENA HATI HP (battle) — bentuk baru: HP = deretan ❤️ ───
const hpHearts = (hp, maxHp) => {
  const filled = Math.max(0, Math.min(10, Math.ceil((hp / maxHp) * 10)));
  return "❤️".repeat(filled) + "🖤".repeat(10 - filled);
};

function arenaFrame(title, A, B, action) {
  return (
    `${title}\n\n` +
    `${A.emoji} ${hpHearts(A.hp, A.maxHp)} ${Math.max(0, Math.round(A.hp))}/${A.maxHp}\n` +
    `${B.emoji} ${hpHearts(B.hp, B.maxHp)} ${Math.max(0, Math.round(B.hp))}/${B.maxHp}` +
    (action ? `\n\n💥 ${action}` : "")
  );
}

// ─── LEVEL UP PET ───
function petLevelUp(pet) {
  let ups = 0;
  while (pet.exp >= pet.level * 100) {
    pet.exp -= pet.level * 100;
    pet.level += 1;
    pet.atk += 5; pet.def += 3;
    pet.maxHp = (pet.maxHp || 100) + 10;
    pet.hp = Math.min((pet.hp || 100) + 10, pet.maxHp);
    ups++;
  }
  return ups;
}

const normalizePet = (pet) => {
  if (!pet) return null;
  pet.maxHp = pet.maxHp || 100;
  pet.hp = pet.hp || pet.maxHp;
  pet.hunger = pet.hunger ?? 100;
  pet.battles = pet.battles || 0;
  pet.wins = pet.wins || 0;
  return pet;
};

// ─── SIMULASI BATTLE (nyata per-round, max 8 ronde) ───
function simulateBattle(A, B) {
  const maxRounds = 8;
  const log = [];
  const a = { ...A, maxHp: A.maxHp || A.hp || 100 };
  const b = { ...B, maxHp: B.maxHp || B.hp || 100 };
  a.hp = a.maxHp; b.hp = b.maxHp; // battle mulai full HP
  let round = 0;
  while (a.hp > 0 && b.hp > 0 && round < maxRounds) {
    round++;
    // penyerang bergantian, pemain duluan
    const dmgToB = Math.max(3, Math.round(a.atk - b.def * 0.5 + Math.random() * 10));
    b.hp -= dmgToB;
    log.push({ round, side: "A", dmg: dmgToB, a: { ...a }, b: { ...b } });
    if (b.hp <= 0) break;
    const dmgToA = Math.max(3, Math.round(b.atk - a.def * 0.5 + Math.random() * 10));
    a.hp -= dmgToA;
    log.push({ round, side: "B", dmg: dmgToA, a: { ...a }, b: { ...b } });
  }
  let winner;
  if (a.hp <= 0 && b.hp <= 0) winner = "draw";
  else if (b.hp <= 0) winner = "A";
  else if (a.hp <= 0) winner = "B";
  else winner = a.hp / a.maxHp >= b.hp / b.maxHp ? "A" : "B";
  return { winner, log };
}

// ─── HANDLER ───
async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    const sub = args[0] || "";
    const db = getDatabase();

    const getPet = () => normalizePet(db.getPlayerData(m.sender, "pet"));
    const savePet = (pet) => db.setPlayerData(m.sender, "pet", pet);

    // ══════════ ADOPT ══════════
    if (sub === "adopt" || sub === "adopsi") {
      const petType = args[1] || "";
      if (!petType) {
        let list = "🛒 DAFTAR PET SIAP ADOPSI\n\n";
        PET_TYPES.forEach((p) => {
          list += `• ${p.emoji} ${p.type} — ${formatRp(p.cost)}\n  ⚔️ ATK ${p.baseAtk} | 🛡️ DEF ${p.baseDef}\n`;
        });
        list += `\n💵 Uang kamu: ${formatRp(getCash(m))}\n💡 .pet adopt <type>`;
        return m.reply(novaRpgBox("pet", list));
      }
      const tpl = PET_TYPES.find((p) => p.type === petType);
      if (!tpl) {
        await m.react("❌");
        return m.reply(novaRpgBox("pet", `Pet "*${petType}*" tidak tersedia. Lihat daftar: .pet adopt`, "error"));
      }
      const existing = getPet();
      if (existing && existing.type) {
        return m.reply(novaRpgBox("pet",
          `Kamu sudah punya pet: ${existing.emoji} *${existing.type}* (Lv.${existing.level}).\n💡 Evolusi: .petevolve do`, "warn"));
      }
      if (!spendCash(m, tpl.cost)) {
        await m.react("❌");
        return m.reply(novaRpgBox("pet",
          `💵 Uang tidak cukup! Butuh *${formatRp(tpl.cost)}*\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      await m.react("🕒");
      await morph(m, sock, eggHatchFrames(tpl.emoji));
      const pet = {
        type: tpl.type, emoji: tpl.emoji, level: 1, exp: 0,
        atk: tpl.baseAtk, def: tpl.baseDef, hp: 100, maxHp: 100,
        hunger: 100, lastFed: 0, battles: 0, wins: 0,
      };
      savePet(pet);
      await m.react("🐣");
      return m.reply(novaRpgBox("pet",
        `🐣 PET BARU DIADOPSI!\n\n${tpl.emoji} Pet : ${tpl.type}\n⚔️ ATK : ${pet.atk} | 🛡️ DEF : ${pet.def}\n❤️ HP : ${pet.hp}/${pet.maxHp}\n🍖 Hunger : 100%\n\n💡 Jangan lupa feed: .pet feed`, "success"));
    }

    const pet = getPet();
    if (!pet || !pet.type) {
      return m.reply(novaRpgBox("pet",
        `Kamu belum punya pet 🥲\n💡 Adopsi sekarang: .pet adopt <type> — daftar: .pet adopt`, "guide"));
    }

    // ══════════ FEED ══════════
    if (sub === "feed" || sub === "makan") {
      const now = Date.now();
      if (pet.hunger >= 100) {
        return m.reply(novaRpgBox("pet", `🍖 ${pet.emoji} masih kenyang banget! (Hunger 100%)`, "warn"));
      }
      if (now - (pet.lastFed || 0) < FEED_COOLDOWN) {
        const remaining = Math.ceil((FEED_COOLDOWN - (now - (pet.lastFed || 0))) / 60000);
        return m.reply(novaRpgBox("pet", `🕒 ${pet.emoji} masih kenyang! Tunggu *${remaining} menit* lagi.`, "warn"));
      }
      if (!spendCash(m, FEED_COST)) {
        return m.reply(novaRpgBox("pet", `💵 Butuh *${formatRp(FEED_COST)}* buat makanan.\nUang kamu: ${formatRp(getCash(m))}`, "warn"));
      }
      await m.react("🕒");
      await morph(m, sock, munchFrames(pet.emoji));
      pet.hunger = Math.min(100, pet.hunger + 40);
      pet.lastFed = now;
      pet.exp = (pet.exp || 0) + 20;
      const ups = petLevelUp(pet);
      savePet(pet);
      await m.react("🐣");
      return m.reply(novaRpgBox("pet",
        `🍖 PET DIBERI MAKAN!\n\n${pet.emoji} Pet : ${pet.type}\n🍖 Hunger : ${pet.hunger}%\n✨ EXP : +20 (${pet.exp}/${pet.level * 100})` +
        (ups ? `\n\n⬆️ LEVEL UP! Lv.${pet.level} — ATK+${5 * ups} DEF+${3 * ups} HP+${10 * ups}` : ""), "success"));
    }

    // ══════════ BATTLE / DUEL ══════════
    if (sub === "battle" || sub === "fight" || sub === "duel") {
      if (pet.hunger < 20) {
        return m.reply(novaRpgBox("pet", `🍖 ${pet.emoji} kelaparan! Feed dulu: .pet feed`, "warn"));
      }
      const targetJid = m.mentionedJid?.[0] || m.quoted?.participant || null;

      let enemy, isDuel = false, defenderPet = null;
      if (targetJid) {
        defenderPet = normalizePet(db.getPlayerData(targetJid, "pet"));
        if (!defenderPet || !defenderPet.type) {
          return m.reply(novaRpgBox("pet", `🙁 Dia belum punya pet. Cari lawan lain atau lawan pet liar: .pet battle`, "warn"));
        }
        enemy = { ...defenderPet };
        isDuel = true;
      } else {
        const wild = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
        const lvl = Math.max(1, pet.level + Math.floor(Math.random() * 3) - 1);
        enemy = {
          type: wild.type, emoji: wild.emoji, level: lvl,
          atk: wild.baseAtk + (lvl - 1) * 5, def: wild.baseDef + (lvl - 1) * 3,
          hp: 100 + (lvl - 1) * 10, maxHp: 100 + (lvl - 1) * 10,
        };
      }

      await m.react("🕒");
      const A = { emoji: pet.emoji, atk: pet.atk, def: pet.def, maxHp: pet.maxHp };
      const B = { emoji: enemy.emoji, atk: enemy.atk, def: enemy.def, maxHp: enemy.maxHp };
      const title = `⚔️ ARENA PET — ${pet.emoji} Lv.${pet.level} vs ${enemy.emoji} Lv.${enemy.level}${isDuel ? " (DUEL)" : " (LIAR)"}`;
      const res = simulateBattle(A, B);

      // frame animasi: intro → tiap aksi → final
      const frames = [arenaFrame(title, res.log[0].a, res.log[0].b, "")];
      for (const step of res.log) {
        const atkEmoji = step.side === "A" ? A.emoji : B.emoji;
        const defEmoji = step.side === "A" ? B.emoji : A.emoji;
        frames.push(arenaFrame(title, step.a, step.b, `${atkEmoji} menerjang ${defEmoji} — ${step.dmg} damage!`));
      }
      const finalStep = res.log[res.log.length - 1];
      if (res.winner === "A") frames.push(arenaFrame(title, finalStep.a, finalStep.b, `🏆 ${A.emoji} MENANG! Lawan tumbang!`));
      else if (res.winner === "B") frames.push(arenaFrame(title, finalStep.a, finalStep.b, `💀 ${B.emoji} MENANG! Pet kamu tumbang...`));
      else frames.push(arenaFrame(title, finalStep.a, finalStep.b, `🤝 SERI! Keduanya kehabisan tenaga!`));
      await morph(m, sock, frames);

      const won = res.winner === "A";
      const draw = res.winner === "draw";
      pet.battles += 1;
      pet.hunger = Math.max(0, pet.hunger - 20);

      let rewardMsg = "";
      if (won) {
        pet.wins += 1;
        pet.exp = (pet.exp || 0) + 50;
        const rp = 3000 + enemy.level * 1500;
        addCash(m, rp);
        rewardMsg = `💰 Reward : ${formatRp(rp)}\n✨ EXP : +50`;
        // defender duel kalah juga dapat pengalaman
        if (isDuel && defenderPet) {
          defenderPet.battles = (defenderPet.battles || 0) + 1;
          defenderPet.exp = (defenderPet.exp || 0) + 15;
          petLevelUp(defenderPet);
          db.setPlayerData(targetJid, "pet", defenderPet);
        }
      } else if (!draw) {
        pet.exp = (pet.exp || 0) + 10;
        rewardMsg = `✨ EXP : +10 (pelajaran berarti)`;
        if (isDuel && defenderPet) {
          defenderPet.battles = (defenderPet.battles || 0) + 1;
          defenderPet.wins = (defenderPet.wins || 0) + 1;
          defenderPet.exp = (defenderPet.exp || 0) + 50;
          petLevelUp(defenderPet);
          db.setPlayerData(targetJid, "pet", defenderPet);
        }
      } else {
        rewardMsg = `🤝 Seri — tidak ada reward, tapi pengalaman tetap dapat!\n✨ EXP : +5`;
        pet.exp = (pet.exp || 0) + 5;
      }
      const ups = petLevelUp(pet);
      savePet(pet);
      await m.react("🐣");
      return m.reply(novaRpgBox("pet",
        `${won ? "🏆 PET KAMU MENANG!" : draw ? "🤝 SERI!" : "💀 PET KAMU KALAH!"}\n\n` +
        `${pet.emoji} ${pet.type} Lv.${pet.level} vs ${enemy.emoji} ${enemy.type} Lv.${enemy.level}${isDuel ? " (duel pemain)" : " (liar)"}\n\n` +
        rewardMsg +
        `\n🍖 Hunger : ${pet.hunger}%` +
        `\n📊 Record : ${pet.wins}W/${pet.battles - pet.wins}L` +
        (ups ? `\n\n⬆️ LEVEL UP! Lv.${pet.level}` : ""), won ? "success" : "warn"));
    }

    // ══════════ TOP / LEADERBOARD ══════════
    if (sub === "top" || sub === "leaderboard" || sub === "rank") {
      let list = [];
      try {
        const all = db.getAllUsers() || {};
        list = Object.entries(all)
          .map(([jid, u]) => {
            const p = normalizePet(u.rpg?.pet);
            if (!p || !p.type) return null;
            return { jid, name: u.name || jid.split("@")[0], pet: p, score: (p.level || 1) * 100 + (p.wins || 0) * 10 };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      } catch {}
      if (!list.length) return m.reply(novaRpgBox("pet", "📊 Belum ada pet terdaftar! Adopsi pertama: .pet adopt", "warn"));
      let msg = "🏆 LEADERBOARD PET TERKUAT\n\n";
      list.forEach((p, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        msg += `${medal} ${p.pet.emoji} ${p.name} — Lv.${p.pet.level} (${p.pet.wins}W/${p.pet.battles - p.pet.wins}L)\n`;
      });
      return m.reply(novaRpgBox("pet", msg));
    }

    // ══════════ HELP ══════════
    if (sub === "help" || sub === "bantuan") {
      return m.reply(novaRpgBox("pet",
        `🐾 BANTUAN PET\n\n` +
        `.pet — info pet kamu\n` +
        `.pet adopt <type> — adopsi pet (Rp)\n` +
        `.pet feed — beri makan (${formatRp(FEED_COST)}, +40 hunger, +20 EXP)\n` +
        `.pet battle — lawan pet liar (reward Rp!)\n` +
        `.pet battle @user — duel pet pemain lain\n` +
        `.pet top — leaderboard pet terkuat\n` +
        `.petevolve do — evolusi pet (+50% stat)\n\n` +
        `🔥 TIPS:\n` +
        `• Pet kenyang = kuat battle (hunger min 20)\n` +
        `• Menang battle = uang Rp + EXP\n` +
        `• Level up = ATK/DEF/HP naik otomatis`));
    }

    // ══════════ INFO (default) ══════════
    const filled = Math.ceil(pet.hunger / 10);
    const hungerRow = "🍖".repeat(filled) + "▫️".repeat(10 - filled);
    return m.reply(novaRpgBox("pet",
      `${pet.emoji} ${pet.type.toUpperCase()} Lv.${pet.level}\n\n` +
      `❤️ HP : ${pet.hp}/${pet.maxHp}\n` +
      `⚔️ ATK : ${pet.atk} | 🛡️ DEF : ${pet.def}\n` +
      `✨ EXP : ${pet.exp}/${pet.level * 100}\n` +
      `🍖 Hunger :\n${hungerRow} ${pet.hunger}%\n\n` +
      `📊 Record : ${pet.wins}W/${pet.battles - pet.wins}L (total ${pet.battles} battle)\n\n` +
      `💡 .pet feed — beri makan\n.pet battle — lawan pet\n.pet help — semua fitur`));
  } catch (err) {
    console.error("pet error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("pet", err?.message || "Ada yang error, coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
