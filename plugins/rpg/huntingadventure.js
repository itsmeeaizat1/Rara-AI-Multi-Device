// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berburu — Hunt monsters for EXP, Gold, and item drops (animated combat)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, regenHP,
  addItem, getEquipStats, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
  getCash} from "../../src/lib/nova-rpg-service.js";
import { getRpgWeather, rpgWeatherTag } from "../../src/lib/nova-rpg-weather.js";
import { animBattle, rpgSleep, animHuntTrack, animHuntShoot, animHuntResult } from "../../src/lib/nova-rpg-anim.js";
import { playScopeAnim } from "../../src/lib/libanimationrpg/libhuntingadventurerpg.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "huntingadventure",
  alias: ["petualangberburu", "berburu", "hunt"],
  category: "rpg",
  description: "Berburu monster untuk EXP, Gold, dan item drop",
  usage: ".petualangberburu [zone <nama> | trophy]",
  example: ".petualangberburu\n.berburu zone hutan_tengah\n.berburu trophy",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const HUNT_ENERGY = 10;

// ═══ ZONE BERBURU (ala script owner) — pool hewan per zone, kunci level ═══
const HUNT_ZONES = {
  hutan_pemula: {
    name: "🌳 Hutan Pemula", levelReq: 1,
    animals: [
      { name: "Kelinci", hp: 15, atk: 2, def: 0, exp: 8, gold: 5, rare: false, drops: [{ item: "rabbitMeat", chance: 60 }] },
      { name: "Burung Hutan", hp: 10, atk: 1, def: 0, exp: 6, gold: 4, rare: false, drops: [{ item: "birdFeather", chance: 60 }] },
      { name: "Rusa", hp: 25, atk: 4, def: 1, exp: 12, gold: 10, rare: false, drops: [{ item: "deerAntler", chance: 50 }] },
    ],
  },
  hutan_tengah: {
    name: "🌲 Hutan Tengah", levelReq: 3,
    animals: [
      { name: "Babi Hutan", hp: 35, atk: 8, def: 2, exp: 20, gold: 15, rare: false, drops: [{ item: "boarMeat", chance: 55 }] },
      { name: "Serigala", hp: 40, atk: 10, def: 3, exp: 25, gold: 18, rare: false, drops: [{ item: "wolfFang", chance: 50 }] },
      { name: "Beruang", hp: 55, atk: 12, def: 4, exp: 30, gold: 25, rare: true, drops: [{ item: "bearClaw", chance: 40 }] },
    ],
  },
  hutan_lebah: {
    name: "🍯 Hutan Lebah", levelReq: 5,
    animals: [
      { name: "Lebah Raksasa", hp: 30, atk: 8, def: 1, exp: 22, gold: 12, rare: false, drops: [{ item: "wildHoney", chance: 60 }] },
      { name: "Ular Berbisa", hp: 45, atk: 12, def: 2, exp: 28, gold: 20, rare: true, drops: [{ item: "snakeVenom", chance: 45 }] },
      { name: "Elang", hp: 50, atk: 14, def: 3, exp: 35, gold: 30, rare: true, drops: [{ item: "eagleFeather", chance: 45 }] },
    ],
  },
  hutan_malam: {
    name: "🌙 Hutan Malam", levelReq: 8,
    animals: [
      { name: "Kelelawar Raksasa", hp: 55, atk: 12, def: 2, exp: 40, gold: 35, rare: false, drops: [{ item: "batWing", chance: 50 }] },
      { name: "Harimau Loreng", hp: 70, atk: 18, def: 5, exp: 50, gold: 45, rare: true, drops: [{ item: "tigerStripe", chance: 40 }] },
      { name: "Serigala Putih", hp: 80, atk: 20, def: 6, exp: 60, gold: 55, rare: true, drops: [{ item: "whiteWolfPelt", chance: 40 }] },
    ],
  },
  hutan_lembah: {
    name: "🏞️ Lembah Para Dewa", levelReq: 12,
    animals: [
      { name: "Naga Muda", hp: 100, atk: 25, def: 8, exp: 80, gold: 70, rare: true, drops: [{ item: "dragonScale", chance: 35 }] },
      { name: "Griffin", hp: 120, atk: 30, def: 10, exp: 100, gold: 90, rare: true, drops: [{ item: "griffinClaw", chance: 30 }] },
      { name: "Phoenix", hp: 150, atk: 35, def: 12, exp: 150, gold: 120, rare: true, drops: [{ item: "phoenixFeather", chance: 25 }] },
    ],
  },
};
const ZONE_ORDER = Object.keys(HUNT_ZONES);
const HUNT_COOLDOWN = 60 * 1000;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("berburu", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const sub = (m.args?.[0] || "").toLowerCase();

    // ═══ SUBCOMMAND: zone — list / pindah (ala script) ═══
    if (sub === "zone" || sub === "zona") {
      const target = (m.args?.[1] || "").toLowerCase();
      const current = HUNT_ZONES[rpg.huntZone] || HUNT_ZONES.hutan_pemula;
      if (!target) {
        const list = ZONE_ORDER.map((z, i) => {
          const zn = HUNT_ZONES[z];
          const here = z === (rpg.huntZone || "hutan_pemula") ? " ← kamu di sini" : (rpg.level >= zn.levelReq ? " ✅ terbuka" : " 🔒 butuh LV " + zn.levelReq);
          return `${i + 1}. ${z} — ${zn.name} (LV ${zn.levelReq})${here}`;
        }).join("\n");
        return m.reply(novaRpgBox("berburu", `🗺️ *ZONE BERBURU*

${list}

📍 Zone kamu: ${current.name} (Level kamu: ${rpg.level})
💡 Pindah: .petualangberburu zone <nama>`, "info"));
      }
      const zn = HUNT_ZONES[target] || Object.values(HUNT_ZONES).find(z => z.name.toLowerCase().includes(target));
      if (!zn || !HUNT_ZONES[target]) return m.reply(novaRpgBox("berburu", `Zone *${target}* gak ada. Lihat daftar zone: .petualangberburu zone`, "error"));
      if (rpg.level < zn.levelReq) return m.reply(novaRpgBox("berburu", `⚠️ Butuh Level *${zn.levelReq}* untuk masuk ${zn.name}. Level kamu: ${rpg.level}`, "warn"));
      const zoneId = Object.keys(HUNT_ZONES).find(k => HUNT_ZONES[k] === zn);
      rpg.huntZone = zoneId;
      rpg.lastZoneNotify = null;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("berburu", `🗺️ Pindah ke ${zn.name}\n📍 Siap berburu! Hewan di sini: ${zn.animals.map(a => a.name).join(", ")}`, "success"));
    }

    // ═══ SUBCOMMAND: trophy — koleksi buruan langka (ala script) ═══
    if (sub === "trophy" || sub === "trophies") {
      const trophies = rpg.trophies || [];
      if (!trophies.length) return m.reply(novaRpgBox("berburu", `🏆 Belum ada trophy. Buru hewan langka! (Beruang, Elang, Harimau Loreng, Phoenix, dll)`, "info"));
      const list = trophies.map((t, i) => `${i + 1}. 🏅 ${t.name} (${t.item}) — ${new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`).join("\n");
      return m.reply(novaRpgBox("berburu", `🏆 *TROPHY COLLECTION*

${list}

📊 Total: ${trophies.length} trophy`, "info"));
    }

    const cd = checkCooldown(m, "lastHunt");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("berburu", `Sabar, cooldown berburu tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < HUNT_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("berburu", `Energi kurang! Butuh *${HUNT_ENERGY} energy* untuk berburu. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    // Pool hewan dari zone berburu (ala script owner)
    const zone = HUNT_ZONES[rpg.huntZone] || HUNT_ZONES.hutan_pemula;
    const monster = zone.animals[Math.floor(Math.random() * zone.animals.length)];

    useEnergy(m, HUNT_ENERGY, sock);
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk + (rpg.lifesteal || 0);
    const playerDef = rpg.def + equip.def;
    const playerHp = rpg.hp;

    // ANIMASI ALA SCRIPT OWNER (morphing 1 pesan per fase):
    // FASE 1: MELACAK JEJAK → target ditemukan
    // 🎬 animasi khas BURU SASARAN: crosshair 🎯 merayap menuju jejak 🐾 lalu TERKUNCI
    const SCW = 10;
    const target = 3 + Math.floor(Math.random() * 4);
    // 🎬 animasi dimuat dari lib libhuntingadventurerpg.js (crosshair 🎯 merayap ke sasaran)
    const scopeOk = await playScopeAnim(sock, m.chat, { monsterName: monster.name, rare: monster.rare === true });
    if (!scopeOk) await animHuntTrack(m, sock, monster.name);
    await m.reply(`🎯 Ditemukan *${monster.name}* di ${zone.name}!\n⚔️ Bersiap bertarung...`);
    // FASE 2: MEMANAH — bidik, tarik tali, lepas
    await animHuntShoot(m, sock, monster.name);

    // Simulasi pertarungan dengan animasi
    let monsterHp = monster.hp;
    let playerDmgTaken = 0;
    let rounds = 0;
    const maxRounds = 10;
    const combatLog = [];

    while (monsterHp > 0 && playerDmgTaken < playerHp && rounds < maxRounds) {
      const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
      const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - monster.def / (monster.def + 100))));
      monsterHp -= playerDmg;
      rounds++;

      let monsterDmg = 0;
      let dodged = false;

      if (monsterHp <= 0) {
        combatLog.push({ dmg: playerDmg, crit, monsterDmg: 0, monsterHp, dodged: false });
        break;
      }

      monsterDmg = Math.max(1, Math.floor(monster.atk * (1 - playerDef / (playerDef + 100))));
      if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
        dodged = true;
      } else {
        playerDmgTaken += monsterDmg;
      }

      combatLog.push({ dmg: playerDmg, crit, monsterDmg: dodged ? 0 : monsterDmg, monsterHp, dodged });
    }

    // Send battle animation (max 4 messages to avoid spam)
    const logSlice = combatLog.slice(0, 4);
    await animBattle(m, sock, m.pushName || "Player", monster.name, logSlice);
    if (combatLog.length > 4) {
      await m.reply(`...dan ${combatLog.length - 4} ronde lagi!`);
      await rpgSleep(500);
    }

    const won = monsterHp <= 0;

    if (won) {
      // 🌦️ CUACA: multiplier EXP/Gold buruan (badai +30%, kabut −15%)
      const weather = getRpgWeather();
      const expGain = Math.floor(monster.exp * (1 + (rpg.expBonus || 0) / 100) * weather.hunt);
      const goldGain = Math.floor(monster.gold * (1 + (rpg.goldFind || 0) / 100) * weather.hunt);
      const drops = rollDrop(monster.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

      addExp(m, expGain);
      addGold(m, goldGain);
      for (const drop of drops) addItem(m, drop.item, drop.qty);
      await bumpPlayerStat(m, "berburu", "totalHunt", 1);

      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      // TROPHY + zone unlock — re-read state FRESH (saveRpg({hp}) tadi bikin
      // reference rpg stale; mutasi di objek lama gak akan pernah ke-persist)
      const fresh = ensureRpg(m) || rpg;
      if (monster.rare) {
        fresh.trophies = fresh.trophies || [];
        fresh.trophies.push({ name: monster.name, item: ITEM_DB[drops[0]?.item]?.name || monster.name, date: Date.now() });
      }
      // Zone baru terbuka? (ala script — dedup biar gak spam tiap hunt)
      const curIdx = ZONE_ORDER.indexOf(fresh.huntZone);
      let zoneNotice = null;
      if (curIdx < ZONE_ORDER.length - 1) {
        const nextId = ZONE_ORDER[curIdx + 1];
        if (fresh.level >= HUNT_ZONES[nextId].levelReq && fresh.lastZoneNotify !== nextId) {
          fresh.lastZoneNotify = nextId;
          zoneNotice = `🗺️ *ZONE BARU TERBUKA!*\n📍 ${HUNT_ZONES[nextId].name}\n⚔️ Level Req: ${HUNT_ZONES[nextId].levelReq}\n\nKetik .petualangberburu zone ${nextId} untuk pindah`;
        }
      }
      // Persist eksplisit trophy + dedup flag (biar gak andalkan ref live)
      saveRpg(m, { trophies: fresh.trophies, lastZoneNotify: fresh.lastZoneNotify });

      const dropLines = drops.map(d => `│ • 📦 ${ITEM_DB[d.item]?.name || d.item} : +${d.qty}x`);

      // FASE 3: HASIL BURUAN — panah mengenai (morphing)
      const lootText = drops.length ? drops.map(d => `${ITEM_DB[d.item]?.name || d.item} x${d.qty}`).join(", ") : null;
      await animHuntResult(m, sock, { animalName: monster.name, success: true, loot: lootText });

      await m.react("🐣");
      await m.reply(novaGameBox({
        title: "berburu", icon: "🎯",
        flavor: "🏆 *HUNT BERHASIL!*",
        body: [
          `│ • 🐉 Monster : ${monster.name}`,
          `│ • ⚔️ Ronde : ${rounds}`,
          `│ • 💔 DMG diterima : ${playerDmgTaken}`,
          "",
          `│ • ✨ EXP : +${expGain}`,
          `│ • 💰 Gold : +${goldGain}`,
          `│ • 🌦️ Cuaca : ${weather.label} (${weather.hunt > 1 ? "+" : ""}${Math.round((weather.hunt - 1) * 100)}%)`,
          `│ • 💵 Uang : Rp ${getCash(m)}`,
          ...dropLines,
          `│ • ❤️ HP : ${newHp}/${rpg.maxHp}`,
          `│ • ⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}`,
        ].join("\n"),
        cta: gameCTA("berburu"),
      }));
      if (zoneNotice) await m.reply(novaRpgBox("berburu", zoneNotice, "success"));
      return;
    } else {
      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      // FASE 3: HASIL BURUAN — buruan kabur (morphing)
      await animHuntResult(m, sock, { animalName: monster.name, success: false });

      await m.react("❌");
      return m.reply(novaGameBox({
        title: "berburu", icon: "🎯",
        flavor: "💀 *HUNT GAGAL!*",
        body: [
          `│ • 🐉 Monster : ${monster.name}`,
          `│ • 💔 DMG diterima : ${playerDmgTaken}`,
          `│ • ❤️ HP : ${newHp}/${rpg.maxHp}`,
          "",
          "💡 Tingkatkan equipment atau level dulu!",
        ].join("\n"),
        cta: gameCTA("berburu"),
      }));
    }
  } catch (err) {
    console.error("berburu error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("berburu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
