// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Tower — Climb endless tower, fight monster per floor, makin tinggi makin sulit
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgtower",
  alias: ["tower", "towerclimb", "menara", "rpgmenara"],
  category: "rpg",
  description: "RPG Tower — naik menara tak terbatas, lawan monster per lantai, makin tinggi makin sulit",
  usage: ".rpgtower | .rpgtower status | .rpgtower reward | .rpgtower reset",
  example: ".rpgtower",
  isGroup: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const FLOOR_MONSTERS = [
  { name: "Slime Lantai", baseHp: 30, baseAtk: 5 },
  { name: "Goblin Penjaga", baseHp: 45, baseAtk: 8 },
  { name: "Wolf Menara", baseHp: 60, baseAtk: 12 },
  { name: "Skeleton Knight", baseHp: 80, baseAtk: 15 },
  { name: "Dark Mage", baseHp: 100, baseAtk: 20 },
  { name: "Stone Golem", baseHp: 130, baseAtk: 18 },
  { name: "Vampire Lord", baseHp: 160, baseAtk: 25 },
  { name: "Demon Gatekeeper", baseHp: 200, baseAtk: 30 },
  { name: "Dragon Warden", baseHp: 250, baseAtk: 35 },
  { name: "Tower Guardian", baseHp: 300, baseAtk: 40 },
];

const FLOOR_REWARDS = [
  { koin: 30, exp: 10, item: "Health Potion" },
  { koin: 50, exp: 15, item: null },
  { koin: 80, exp: 25, item: "Energy Potion" },
  { koin: 120, exp: 40, item: null },
  { koin: 180, exp: 60, item: "Rune Shard" },
  { koin: 250, exp: 80, item: null },
  { koin: 350, exp: 110, item: "Rare Chest" },
  { koin: 500, exp: 150, item: null },
  { koin: 700, exp: 200, item: "Epic Chest" },
  { koin: 1000, exp: 300, item: "Legendary Chest" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Tower", [
        "STATUS MENARA",
        "",
        "Lantai tercapai: " + (user.towerFloor || 0),
        "Lantai tertinggi: " + (user.towerBest || 0),
        "Total climb: " + (user.towerClimbs || 0),
        "Total koin dari tower: " + (user.towerKoin || 0),
        "Monster dikalahkan: " + (user.towerKills || 0),
        "",
        "Ketik .rpgtower untuk mulai/lanjut climb!",
      ]));
    }

    // REWARD INFO
    if (sub === "reward" || sub === "hadiah") {
      let lines = ["DAFTAR HADIAH PER LANTAI", ""];
      FLOOR_REWARDS.forEach((r, i) => {
        lines.push("Lantai " + (i + 1) + ": " + r.koin + " koin, " + r.exp + " exp" + (r.item ? " + " + r.item : ""));
      });
      lines.push("", "Lantai 10+ = hadiah x2, Lantai 20+ = x3, dst.");
      return m.reply(claraWrap("RPG Tower", lines));
    }

    // RESET
    if (sub === "reset" || sub === "ulang") {
      user.towerFloor = 0;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Tower", "Progress tower direset ke lantai 0. Ketik .rpgtower untuk mulai dari awal.", "success"));
    }

    // CLIMB
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Tower", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const currentFloor = user.towerFloor || 0;
    const nextFloor = currentFloor + 1;
    const monsterIdx = (nextFloor - 1) % FLOOR_MONSTERS.length;
    const cycleMultiplier = Math.floor((nextFloor - 1) / FLOOR_MONSTERS.length) + 1;

    const monster = {
      ...FLOOR_MONSTERS[monsterIdx],
      hp: FLOOR_MONSTERS[monsterIdx].baseHp * cycleMultiplier,
      atk: FLOOR_MONSTERS[monsterIdx].baseAtk * cycleMultiplier,
    };

    // Battle simulation
    const userAtk = (user.attack || 20) + (user.level || 1) * 3;
    const userHp = (user.hp || 100) + (user.maxHp || 100) + (user.defense || 10) * 2;
    const userDef = (user.defense || 10) + (user.level || 1) * 2;

    let monsterHp = monster.hp;
    let userHpRemaining = userHp;
    let rounds = 0;
    let battleLog = [];

    while (monsterHp > 0 && userHpRemaining > 0 && rounds < 20) {
      rounds++;
      // User attacks
      const dmgToMonster = Math.max(1, userAtk - Math.floor(monster.atk * 0.2));
      monsterHp -= dmgToMonster;
      battleLog.push("Ronde " + rounds + ": Kamu serang " + dmgToMonster + " DMG");

      if (monsterHp <= 0) break;

      // Monster attacks
      const dmgToUser = Math.max(1, monster.atk - userDef);
      userHpRemaining -= dmgToUser;
      battleLog.push("Musuh serang " + dmgToUser + " DMG");
    }

    const won = monsterHp <= 0;

    user.energi -= pluginConfig.energi;

    let lines = [
      "RPG TOWER — LANTAI " + nextFloor,
      "",
      "Musuh: " + monster.name + " (Siklus " + cycleMultiplier + ")",
      "HP Musuh: " + monster.hp + " | ATK: " + monster.atk,
      "Stats Kamu: ATK " + userAtk + " | DEF " + userDef + " | HP " + userHp,
      "",
      "BATTLE LOG:",
      "",
    ];
    battleLog.forEach((l) => lines.push(l));

    if (won) {
      const rewardIdx = (nextFloor - 1) % FLOOR_REWARDS.length;
      const reward = FLOOR_REWARDS[rewardIdx];
      const rewardMult = Math.floor((nextFloor - 1) / FLOOR_REWARDS.length) + 1;
      const koinGain = reward.koin * rewardMult;
      const expGain = reward.exp * rewardMult;

      user.koin = (user.koin || 0) + koinGain;
      user.exp = (user.exp || 0) + expGain;
      user.towerFloor = nextFloor;
      user.towerBest = Math.max(user.towerBest || 0, nextFloor);
      user.towerClimbs = (user.towerClimbs || 0) + 1;
      user.towerKoin = (user.towerKoin || 0) + koinGain;
      user.towerKills = (user.towerKills || 0) + 1;

      // Level up check
      if (user.exp >= (user.level || 1) * 150) {
        user.level = (user.level || 1) + 1;
      }

      lines.push("", "MENANG! Naik ke lantai " + (nextFloor + 1));
      lines.push("Reward: " + koinGain + " koin, +" + expGain + " exp");
      if (reward.item) lines.push("Item: " + reward.item);
      lines.push("Level: " + (user.level || 1));
      lines.push("", "Ketik .rpgtower lagi untuk lanjut lantai " + (nextFloor + 1) + "!");
    } else {
      lines.push("", "KALAH! Kamu jatuh dari lantai " + nextFloor);
      lines.push("Tower climb berhenti. Ketik .rpgtower reset untuk mulai dari awal.");
      lines.push("Atau ketik .rpgtower untuk coba lagi lantai yang sama.");
    }

    db.data.users[sender] = user;
    await db.save();

    lines.push("", "Energi tersisa: " + user.energi);
    lines.push("Lantai: " + (user.towerFloor || 0) + " | Best: " + (user.towerBest || 0));

    return m.reply(claraWrap("RPG Tower", lines, won ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Tower]", e);
    m.reply(claraWrap("RPG Tower", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
