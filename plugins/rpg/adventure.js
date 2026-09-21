// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Adventure — Random exploration event (multiple outcomes)

import {
  ensureRpg, saveRpg, addExp, addGold, addGems, useEnergy,
  addItem, removeItem, getEquipStats, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  getCash} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, renderStatBar, novaRpgBox } from "../../src/lib/nova-games.js";
import { animAdventure, animBattleTurns } from "../../src/lib/nova-rpg-anim.js";
import { editFramesAnim } from "../../src/lib/nova-anim-runner.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "adventure",
  alias: ["adventure", "petualang", "jelajah"],
  category: "rpg",
  description: "Petualangan acak — bisa harta karun, trap, atau encounter",
  usage: ".adventure",
  example: ".adventure",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 0,
  isEnabled: true,
};

const ADV_ENERGY = 15;
const ADV_COOLDOWN = 3 * 60 * 1000; // 3 menit

// Nama monster acak ala script owner (Slime, Serigala, Orc, Yeti, Lich...)
const MONSTER_NAMES = [
  "Slime", "Kelinci Liar", "Burung Naga", "Serigala", "Beruang", "Orc",
  "Yeti", "Naga Es", "Tentara Bayangan", "Lich", "Goblin", "Raja Salju",
];

const EVENTS = [
  // Treasure (30%)
  {
    type: "treasure",
    weight: 30,
    minExp: 100, maxExp: 300,
    minGold: 50, maxGold: 200,
    drops: [
      { item: "goldOre", chance: 40, minQty: 1, maxQty: 2 },
      { item: "pearl", chance: 20, minQty: 1, maxQty: 1 },
      { item: "hpPotion", chance: 30, minQty: 1, maxQty: 2 },
    ],
    messages: [
      "Kamu menemukan harta karun tersembunyi di gua!",
      "Peti harta terkubur di bawah pohon tua!",
      "Seorang traveler memberimu hadiah karena bantuanmu!",
    ],
  },
  // Monster encounter (25%)
  {
    type: "monster",
    weight: 25,
    minExp: 150, maxExp: 400,
    minGold: 80, maxGold: 250,
    messages: [
      "Monster liar menyerang saat kamu menjelajah!",
      "Kamu bertemu serigala kelaparan di hutan!",
      "Goblin menyergang di jalan setapak!",
    ],
  },
  // Trap (15%)
  {
    type: "trap",
    weight: 15,
    minExp: 20, maxExp: 50,
    messages: [
      "Kamu terjatuh ke lubang jebakan!",
      "Perangkap berduri mengenai kakimu!",
      "Gas beracun menghalangi jalanmu!",
    ],
  },
  // Merchant (15%)
  {
    type: "merchant",
    weight: 15,
    messages: [
      "Kamu bertemu pedagang yang menjual item langka!",
      "Seorang pedagang traveling menawarkan barangnya!",
    ],
  },
  // Shrine (10%)
  {
    type: "shrine",
    weight: 10,
    messages: [
      "Kamu menemukan kuil kuno dan berdoa...",
      "Air suci di kuil memberkati petualanganmu!",
    ],
  },
  // Nothing (5%)
  {
    type: "nothing",
    weight: 5,
    messages: [
      "Kamu berjalan jauh tapi tidak menemukan apapun...",
      "Perjalanan hari ini biasa saja.",
    ],
  },
];

function rollEvent() {
  const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[0];
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("adventure", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastAdventure");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("adventure", `Cooldown petualangan tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < ADV_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("adventure", `Energi kurang! Butuh *${ADV_ENERGY} energy*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, ADV_ENERGY, sock);
    const levelBefore = rpg.level || 1;

    const event = rollEvent();
    let message = event.messages[Math.floor(Math.random() * event.messages.length)];

    // Animasi petualangan (morphing message)
    // 🎬 animasi khas PETA KOMPAS: penanda 📍 menyusuri jalur landmark (kompas berputar)
    const ARAH = ["⬆️", "↗️", "➡️", "↘️", "⬇️"];
    const LANDMARK = ["🌲", "⛰️", "🏕️", "🌊", "🌴", "🗿", "🌉"];
    const LMAP = 10;
    const trail = "·";
    const petaFrames = Array.from({ length: 6 }, (_, f) => {
      const pos = Math.min(LMAP - 1, f * 2);
      const row = Array.from({ length: LMAP }, (_, i) =>
        i === pos ? "📍" : i === LMAP - 1 ? "🏕️" : i < pos ? trail : LANDMARK[(i + f) % LANDMARK.length]);
      return "```\n🧭 " + ARAH[f % ARAH.length] + " MENUJU " + event.type.toUpperCase() + "\n" + row.join("") + "\n```";
    });
    const petaOk = await editFramesAnim(sock, m.chat, petaFrames, {});
    if (!petaOk) await animAdventure(m, sock, event.type);
    let expGain = 0, goldGain = 0, gemGain = 0;
    let drops = [];
    let extraText = "";
    let hpChange = 0;
    let flavor = "🧭 *PETUALANGAN SELESAI!*";

    switch (event.type) {
      case "treasure": {
        expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
        goldGain = Math.floor(Math.random() * (event.maxGold - event.minGold + 1)) + event.minGold;

        for (const drop of event.drops) {
          if (Math.random() * 100 <= drop.chance) {
            const qty = Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + drop.minQty;
            drops.push({ item: drop.item, qty });
            addItem(m, drop.item, qty);
          }
        }

        addExp(m, expGain);
        addGold(m, goldGain);
        flavor = "💰 *HARTA KARUN DITEMUKAN!*";
        break;
      }

      case "monster": {
        const equip = getEquipStats(m);
        const playerAtk = rpg.atk + equip.atk;
        const playerDef = rpg.def + equip.def;
        const monsterHp = 100 + rpg.level * 10;
        const monsterAtk = 15 + rpg.level * 2;
        const monsterName = MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)];

        // Simulasi quick combat — tiap round direkam buat animasi turn-by-turn
        const rounds = [];
        let dmgTaken = 0;
        let mHp = monsterHp;
        let playerHpNow = rpg.hp;
        while (mHp > 0 && dmgTaken < rpg.hp && rounds.length < 10) {
          const dmg = Math.max(1, Math.floor(playerAtk * (1 - 10 / 110)));
          mHp -= dmg;
          const round = { dmg, enemyHpAfter: Math.max(0, mHp), monsterDmg: 0, playerHpAfter: playerHpNow };
          if (mHp > 0) {
            const md = Math.max(1, Math.floor(monsterAtk * (1 - playerDef / (playerDef + 100))));
            dmgTaken += md;
            playerHpNow = Math.max(0, rpg.hp - dmgTaken);
            round.monsterDmg = md;
            round.playerHpAfter = playerHpNow;
          }
          rounds.push(round);
        }

        // ANIMASI BATTLE TURN-BY-TURN (morphing ala script owner):
        // PERTEMPURAN DIMULAI → tiap round serangan + balasan + HP → menang/kalah
        await animBattleTurns(m, sock, {
          playerName: m.pushName || "Petualang",
          enemyName: monsterName,
          enemyHp: monsterHp, enemyMaxHp: monsterHp,
          playerHp: rpg.hp, playerMaxHp: rpg.maxHp,
          rounds,
          victory: mHp <= 0,
        });
        message = `Kamu bertemu *${monsterName}* di jalur petualangan!`;

        if (mHp <= 0) {
          expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
          goldGain = Math.floor(Math.random() * (event.maxGold - event.minGold + 1)) + event.minGold;
          addExp(m, expGain);
          addGold(m, goldGain);
          hpChange = -dmgTaken;
          flavor = "⚔️ *MONSTER DIKALAHKAN!*";
        } else {
          hpChange = -dmgTaken;
          extraText = "💀 Kamu kalah dari monster!";
          flavor = "💀 *KALAH DARI MONSTER!*";
        }
        break;
      }

      case "trap": {
        hpChange = -Math.floor(rpg.maxHp * (0.1 + Math.random() * 0.2));
        expGain = Math.floor(Math.random() * (event.maxExp - event.minExp + 1)) + event.minExp;
        addExp(m, expGain);
        extraText = `│ • 💔 HP : -${Math.abs(hpChange)}`;
        flavor = "💥 *KENA JEBAKAN!*";
        break;
      }

      case "merchant": {
        // Random free item
        const freeItems = ["hpPotion", "mpPotion", "energyDrink", "bread", "cookedMeat"];
        const freeItem = freeItems[Math.floor(Math.random() * freeItems.length)];
        addItem(m, freeItem, 1);
        drops.push({ item: freeItem, qty: 1 });
        extraText = "🎁 Pedagang memberi item gratis!";
        flavor = "🛒 *PEDAGANG DITEMUKAN!*";
        break;
      }

      case "shrine": {
        // Blessing: recover HP + Mana + small exp
        const healAmount = Math.floor(rpg.maxHp * 0.5);
        const manaAmount = Math.floor(rpg.maxMana * 0.5);
        rpg.hp = Math.min(rpg.maxHp, rpg.hp + healAmount);
        rpg.mana = Math.min(rpg.maxMana, rpg.mana + manaAmount);
        saveRpg(m, { hp: rpg.hp, mana: rpg.mana });
        expGain = 50 + Math.floor(Math.random() * 100);
        addExp(m, expGain);
        hpChange = healAmount;
        extraText = `│ • ⛩️ Blessing : HP +${healAmount} | Mana +${manaAmount}`;
        flavor = "⛩️ *BERKAH KUIL!*";
        break;
      }

      case "nothing":
      default:
        expGain = 10 + Math.floor(Math.random() * 30);
        addExp(m, expGain);
        break;
    }

    // Save HP changes
    if (hpChange < 0) {
      const newHp = Math.max(1, rpg.hp + hpChange);
      saveRpg(m, { hp: newHp });
    }

    setCooldown(m, "lastAdventure", ADV_COOLDOWN);

    // Level-up flavor ala script owner (addExp naikin level → tampilkan frame LEVEL UP)
    const freshRpg = ensureRpg(m, m.pushName);
    const levelUpLines = [];
    if (freshRpg && freshRpg.level > levelBefore) {
      levelUpLines.push(
        "",
        "⭐ *━━━ LEVEL UP! ━━━*",
        `🎊 Selamat ${m.pushName || "Petualang"}!`,
        `📈 Level ${levelBefore} → ${freshRpg.level}`,
        "❤️ Max HP +20 | ⚔️ ATK +3 | 🛡️ DEF +2 | 📖 Skill Point +2",
        "⭐ *━━━━━━━━━━━━━━━━*",
      );
    }

    const dropLines = drops.map(d => `│ • 📦 ${ITEM_DB[d.item]?.name || d.item} : +${d.qty}x`);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "adventure", icon: "🧭",
      flavor,
      body: [
        message,
        "",
        ...(expGain > 0 ? [`│ • ✨ EXP : +${expGain}`] : []),
        ...(goldGain > 0 ? [`│ • 💰 Gold : +${goldGain}`] : []),
        `│ • 💵 Uang : Rp ${getCash(m)}`,
        ...dropLines,
        ...(extraText ? [extraText] : []),
        ...levelUpLines,
        `│ • ❤️ HP : ${renderStatBar(freshRpg.hp, freshRpg.maxHp)} (${freshRpg.hp}/${freshRpg.maxHp})`,
        `│ • ⚡ Energy : ${renderStatBar(freshRpg.energy, freshRpg.maxEnergy)} (${freshRpg.energy}/${freshRpg.maxEnergy})`,
      ].join("\n"),
      cta: gameCTA("adventure"),
    }));
  } catch (err) {
    console.error("adventure error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("adventure", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };