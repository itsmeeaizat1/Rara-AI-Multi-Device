// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG World Boss — Boss kooperatif, semua member grup serang bareng
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgworldboss",
  alias: ["worldboss", "rpgraid", "raidboss", "rpgbossraid"],
  category: "rpg",
  description: "RPG World Boss — boss kooperatif, semua member grup serang bareng untuk dapat reward",
  usage: ".rpgworldboss spawn | .rpgworldboss attack | .rpgworldboss status | .rpgworldboss damage",
  example: ".rpgworldboss spawn\n.rpgworldboss attack",
  isGroup: true,
  cooldown: 3,
  energi: 5,
  isEnabled: true,
};

const WORLD_BOSSES = [
  { name: "Ancient Dragon Vorthrax", hp: 5000, atk: 80, element: "Api", reward: 2000, exp: 1000 },
  { name: "Kraken the Abyssal", hp: 7000, atk: 90, element: "Air", reward: 3000, exp: 1500 },
  { name: "Titan Golgoth", hp: 10000, atk: 100, element: "Bumi", reward: 5000, exp: 2000 },
  { name: "Phoenix Emperor", hp: 6500, atk: 85, element: "Api", reward: 3500, exp: 1700 },
  { name: "Void Leviathan", hp: 12000, atk: 120, element: "Gelap", reward: 7000, exp: 3000 },
  { name: "Celestial Seraph", hp: 8000, atk: 95, element: "Terang", reward: 4000, exp: 2200 },
];

// Active boss per group: groupId -> { boss, hp, attackers, spawnedAt, totalDamage }
let activeBosses = {};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const groupId = m.key.remoteJid;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      const boss = activeBosses[groupId];
      if (!boss) {
        return m.reply(claraWrap("RPG World Boss", [
          "Tidak ada World Boss aktif di grup ini.",
          "",
          "Ketik .rpgworldboss spawn untuk memanggil boss!",
          "(Hanya admin yang bisa spawn)",
        ]));
      }
      const hpPercent = Math.round((boss.hp / boss.boss.hp) * 100);
      const bar = "[" + "#".repeat(Math.floor(hpPercent / 5)) + ".".repeat(20 - Math.floor(hpPercent / 5)) + "]";
      let lines = [
        "WORLD BOSS STATUS",
        "",
        "Boss: " + boss.boss.name,
        "Elemen: " + boss.boss.element,
        "HP: " + boss.hp + " / " + boss.boss.hp,
        "HP Bar: " + bar + " " + hpPercent + "%",
        "",
        "Total damage diberikan: " + boss.totalDamage,
        "Total penyerang: " + Object.keys(boss.attackers).length,
        "",
      ];
      // Top 5 attackers
      const sorted = Object.entries(boss.attackers).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length > 0) {
        lines.push("TOP DAMAGE DEALERS:");
        sorted.forEach(([jid, dmg], i) => {
          lines.push((i + 1) + ". @" + jid.split("@")[0] + " - " + dmg + " DMG");
        });
      }
      lines.push("", "Ketik .rpgworldboss attack untuk serang!");
      const payload = { text: claraWrap("RPG World Boss", lines) };
      if (sorted.length > 0) payload.mentions = sorted.map(([jid]) => jid);
      return m.reply(payload);
    }

    // DAMAGE LEADERBOARD
    if (sub === "damage" || sub === "leaderboard") {
      const boss = activeBosses[groupId];
      if (!boss) return m.reply(claraWrap("RPG World Boss", "Tidak ada boss aktif."));
      const sorted = Object.entries(boss.attackers).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return m.reply(claraWrap("RPG World Boss", "Belum ada yang serang boss."));
      let lines = ["DAMAGE LEADERBOARD", "", "Boss: " + boss.boss.name, ""];
      sorted.forEach(([jid, dmg], i) => {
        lines.push((i + 1) + ". @" + jid.split("@")[0] + " - " + dmg + " DMG");
      });
      lines.push("", "Total damage: " + boss.totalDamage);
      const payload = { text: claraWrap("RPG World Boss", lines) };
      payload.mentions = sorted.map(([jid]) => jid);
      return m.reply(payload);
    }

    // SPAWN
    if (sub === "spawn" || sub === "panggil") {
      // Admin only
      let metadata;
      try {
        metadata = await conn.groupMetadata(groupId);
      } catch {}
      const isAdmin = metadata?.participants?.find((p) => p.id === (m.key.participant || m.sender))?.admin;
      if (!isAdmin) {
        return m.reply(claraWrap("RPG World Boss", "Hanya admin grup yang bisa spawn World Boss!"));
      }
      if (activeBosses[groupId]) {
        return m.reply(claraWrap("RPG World Boss", "Boss masih aktif! Kalahkan dulu sebelum spawn baru.\nKetik .rpgworldboss status"));
      }
      const boss = WORLD_BOSSES[Math.floor(Math.random() * WORLD_BOSSES.length)];
      activeBosses[groupId] = {
        boss,
        hp: boss.hp,
        attackers: {},
        spawnedAt: Date.now(),
        totalDamage: 0,
      };

      return m.reply(claraWrap("RPG World Boss", [
        "WORLD BOSS SPAWNED!",
        "",
        "Boss: " + boss.name,
        "Elemen: " + boss.element,
        "HP: " + boss.hp,
        "ATK: " + boss.atk,
        "",
        "Reward: " + boss.reward + " koin, " + boss.exp + " exp (dibagi rata)",
        "",
        "Ketik .rpgworldboss attack untuk serang!",
        "Semua member grup bisa ikut!",
        "",
        "Boss hilang dalam 30 menit jika tidak dikalahkan!",
      ], "success"));
    }

    // ATTACK
    if (sub === "attack" || sub === "serang" || sub === "") {
      const boss = activeBosses[groupId];
      if (!boss) {
        return m.reply(claraWrap("RPG World Boss", "Tidak ada boss aktif! Ketik .rpgworldboss spawn (admin only)"));
      }

      if ((user.energi || 0) < pluginConfig.energi) {
        return m.reply(claraWrap("RPG World Boss", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
      }

      user.energi -= pluginConfig.energi;

      // Calculate damage
      const userAtk = (user.attack || 20) + (user.level || 1) * 5 + Math.floor(Math.random() * 30);
      const crit = Math.random() < 0.2;
      const damage = crit ? userAtk * 2 : userAtk;

      boss.hp = Math.max(0, boss.hp - damage);
      boss.totalDamage += damage;
      boss.attackers[sender] = (boss.attackers[sender] || 0) + damage;

      if (!user.bossKills) user.bossKills = 0;
      if (!user.bossDamage) user.bossDamage = 0;
      user.bossDamage += damage;
      db.data.users[sender] = user;
      await db.save();

      let lines = [
        "SERANGAN BERHASIL!",
        "",
        "Boss: " + boss.boss.name,
        "Damage: " + damage + (crit ? " (CRITICAL!)" : ""),
        "",
      ];

      const hpPercent = Math.round((boss.hp / boss.boss.hp) * 100);
      const bar = "[" + "#".repeat(Math.floor(hpPercent / 5)) + ".".repeat(20 - Math.floor(hpPercent / 5)) + "]";
      lines.push("HP Boss: " + boss.hp + " / " + boss.boss.hp);
      lines.push("HP Bar: " + bar + " " + hpPercent + "%");
      lines.push("Total damage kamu: " + boss.attackers[sender]);

      if (boss.hp <= 0) {
        // Boss defeated! Calculate rewards
        const totalAttackers = Object.keys(boss.attackers).length;
        const koinPerPlayer = Math.floor(boss.boss.reward / totalAttackers);
        const expPerPlayer = Math.floor(boss.boss.exp / totalAttackers);

        lines.push("", "BOSS DIKALAHKAN!");
        lines.push("Total penyerang: " + totalAttackers);
        lines.push("Reward per pemain: " + koinPerPlayer + " koin, " + expPerPlayer + " exp");
        lines.push("", "Top Damage Dealers:");

        const sorted = Object.entries(boss.attackers).sort((a, b) => b[1] - a[1]).slice(0, 5);
        sorted.forEach(([jid, dmg], i) => {
          lines.push((i + 1) + ". @" + jid.split("@")[0] + " - " + dmg + " DMG");
        });

        // Give rewards to all attackers
        for (const [jid, dmg] of Object.entries(boss.attackers)) {
          const attacker = db.data.users?.[jid] || {};
          attacker.koin = (attacker.koin || 0) + koinPerPlayer;
          attacker.exp = (attacker.exp || 0) + expPerPlayer;
          attacker.bossKills = (attacker.bossKills || 0) + 1;
          db.data.users[jid] = attacker;
        }
        await db.save();

        delete activeBosses[groupId];

        // Give MVP bonus
        const mvp = sorted[0];
        if (mvp) {
          lines.push("", "MVP: @" + mvp[0].split("@")[0] + " (" + mvp[1] + " DMG)");
          lines.push("MVP bonus: 500 koin");
          const mvpUser = db.data.users?.[mvp[0]] || {};
          mvpUser.koin = (mvpUser.koin || 0) + 500;
          db.data.users[mvp[0]] = mvpUser;
          await db.save();
        }
      } else {
        lines.push("", "Ketik .rpgworldboss attack lagi untuk serang lagi!");
      }

      lines.push("", "Energi: " + user.energi);

      const payload = { text: claraWrap("RPG World Boss", lines, boss.hp <= 0 ? "success" : "warn") };
      if (boss.hp <= 0 && Object.keys(boss.attackers).length > 0) {
        payload.mentions = Object.keys(boss.attackers);
      }
      return m.reply(payload);
    }

    // HELP
    return m.reply(claraWrap("RPG World Boss", [
      "Boss kooperatif untuk semua member grup",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgworldboss spawn — Panggil boss (admin only)",
      usedPrefix + "rpgworldboss attack — Serang boss",
      usedPrefix + "rpgworldboss status — Lihat HP boss",
      usedPrefix + "rpgworldboss damage — Lihat damage leaderboard",
      "",
      "Semua member bisa serang! Reward dibagi rata.",
      "MVP (damage tertinggi) dapat bonus 500 koin!",
      "Critical hit 20% chance = 2x damage!",
    ]));
  } catch (e) {
    console.error("[RPG World Boss]", e);
    m.reply(claraWrap("RPG World Boss", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
