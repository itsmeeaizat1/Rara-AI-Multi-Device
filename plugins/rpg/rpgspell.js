// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgspell",
  alias: ["spell", "sihirrpg", "sihir", "rpgmagic"],
  category: "rpg",
  description: "Belajar dan cast spell/magic untuk pertempuran RPG",
  usage: ".rpgspell learn | .rpgspell cast <nama> | .rpgspell list | .rpgspell info",
  example: ".rpgspell learn\n.rpgspell cast fireball",
  isGroup: true,
  isPremium: false,
  cooldown: 30,
  energi: 8,
  isEnabled: true,
};

const SPELLS = [
  { name: "Fireball", element: "Api", manaCost: 20, damage: 50, level: 1, desc: "Lempar bola api ke musuh." },
  { name: "Ice Spike", element: "Es", manaCost: 18, damage: 45, level: 1, desc: "Tusuk musuh dengan paku es." },
  { name: "Lightning Bolt", element: "Petir", manaCost: 25, damage: 65, level: 2, desc: "Sambar petir ke musuh." },
  { name: "Heal", element: "Terang", manaCost: 30, damage: 0, heal: 80, level: 1, desc: "Pulihkan HP diri sendiri." },
  { name: "Shadow Strike", element: "Gelap", manaCost: 35, damage: 80, level: 3, desc: "Serangan bayangan yang menembus pertahanan." },
  { name: "Earthquake", element: "Bumi", manaCost: 40, damage: 70, level: 3, desc: "Gempa yang menghancurkan semua musuh." },
  { name: "Tornado", element: "Angin", manaCost: 28, damage: 55, level: 2, desc: "Putaran angin yang melempar musuh." },
  { name: "Poison Mist", element: "Racun", manaCost: 22, damage: 35, level: 2, desc: "Kabut racun yang meracuni musuh perlahan." },
  { name: "Holy Light", element: "Terang", manaCost: 50, damage: 90, level: 4, desc: "Cahaya suci yang menghanguskan musuh gelap." },
  { name: "Dark Void", element: "Gelap", manaCost: 55, damage: 95, level: 4, desc: "Lubang hitam yang menelan musuh." },
  { name: "Meteor", element: "Api", manaCost: 60, damage: 100, level: 5, desc: "Meteor jatuh menghancurkan medan perang." },
  { name: "Resurrection", element: "Terang", manaCost: 80, damage: 0, heal: 200, level: 5, desc: "Bangkitkan dari kematian dengan HP penuh." },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // LIST
    if (sub === "list" || sub === "daftar") {
      const known = user.spells || [];
      if (known.length === 0) {
        return m.reply(claraWrap("RPG Spell", "Kamu belum belajar spell apapun. Ketik .rpgspell learn untuk belajar!"));
      }
      let lines = ["Spell Kamu (" + known.length + "/" + SPELLS.length + "):", ""];
      known.forEach((s, i) => {
        lines.push((i + 1) + ". " + s.name + " [" + s.element + "]");
        lines.push("   Mana: " + s.manaCost + " | DMG: " + s.damage + (s.heal ? " | Heal: " + s.heal : "") + " | Lv." + s.level);
      });
      lines.push("", "Mana kamu: " + (user.mana || 0) + "/" + (user.maxMana || 100));
      return m.reply(claraWrap("RPG Spell", lines));
    }

    // INFO
    if (sub === "info" || sub === "semua") {
      let lines = ["Daftar Semua Spell (" + SPELLS.length + "):", ""];
      SPELLS.forEach((s, i) => {
        lines.push((i + 1) + ". " + s.name + " [" + s.element + "] Lv." + s.level);
        lines.push("   Mana: " + s.manaCost + " | DMG: " + s.damage + (s.heal ? " | Heal: " + s.heal : ""));
        lines.push("   " + s.desc);
      });
      lines.push("", "Ketik .rpgspell learn untuk belajar spell random");
      return m.reply(claraWrap("RPG Spell", lines));
    }

    // LEARN
    if (sub === "learn" || sub === "belajar") {
      if ((user.energi || 0) < pluginConfig.energi) {
        return m.reply(claraWrap("RPG Spell", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
      }
      if (!user.spells) user.spells = [];
      const unknown = SPELLS.filter((s) => !user.spells.find((us) => us.name === s.name));
      if (unknown.length === 0) {
        return m.reply(claraWrap("RPG Spell", "Kamu sudah menguasai semua spell!"));
      }
      const learn = unknown[Math.floor(Math.random() * unknown.length)];
      user.energi -= pluginConfig.energi;
      user.spells.push(learn);
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Spell", [
        "SPELL BARU DIPELAJARI!",
        "",
        "Nama: " + learn.name,
        "Elemen: " + learn.element,
        "Level: " + learn.level,
        "Mana cost: " + learn.manaCost,
        "Damage: " + learn.damage + (learn.heal ? " | Heal: " + learn.heal : ""),
        "",
        learn.desc,
        "",
        "Energi tersisa: " + user.energi,
        "Total spell: " + user.spells.length + "/" + SPELLS.length,
      ], "success"));
    }

    // CAST
    if (sub === "cast" || sub === "lempar") {
      const spellName = args.slice(1).join(" ").trim().toLowerCase();
      if (!spellName) return m.reply(claraWrap("RPG Spell", "Masukkan nama spell!\nContoh: .rpgspell cast fireball"));
      const known = user.spells || [];
      const spell = known.find((s) => s.name.toLowerCase() === spellName);
      if (!spell) return m.reply(claraWrap("RPG Spell", "Kamu belum menguasai spell '" + spellName + "'.\nKetik .rpgspell list untuk lihat spell kamu."));
      if ((user.mana || 0) < spell.manaCost) {
        return m.reply(claraWrap("RPG Spell", "Mana tidak cukup!\nButuh: " + spell.manaCost + " | Mana kamu: " + (user.mana || 0)));
      }
      user.mana = (user.mana || 0) - spell.manaCost;
      // Cast effect
      if (spell.heal) {
        user.hp = Math.min((user.maxHp || 100), (user.hp || 100) + spell.heal);
        db.data.users[sender] = user;
        await db.save();
        return m.reply(claraWrap("RPG Spell", [
          "SPELL CAST: " + spell.name + "!",
          "",
          "Efek: Heal +" + spell.heal + " HP",
          "HP sekarang: " + user.hp + "/" + (user.maxHp || 100),
          "Mana tersisa: " + user.mana,
        ], "success"));
      } else {
        // Damage ke monster acak
        const monsters = ["Goblin", "Slime", "Wolf", "Bandit", "Orc", "Skeleton", "Dark Knight"];
        const monster = monsters[Math.floor(Math.random() * monsters.length)];
        const monsterHp = Math.floor(Math.random() * 50) + 30;
        const killed = spell.damage >= monsterHp;
        let reward = 0;
        if (killed) {
          reward = Math.floor(Math.random() * 200) + 50;
          user.koin = (user.koin || 0) + reward;
          user.exp = (user.exp || 0) + Math.floor(reward / 10);
        }
        db.data.users[sender] = user;
        await db.save();

        return m.reply(claraWrap("RPG Spell", [
          "SPELL CAST: " + spell.name + "!",
          "",
          "Target: " + monster + " (HP: " + monsterHp + ")",
          "Damage: " + spell.damage + " (" + spell.element + ")",
          killed ? "MONSTER TERKALAHKAN!" : "Monster masih hidup (HP tersisa: " + Math.max(0, monsterHp - spell.damage) + ")",
          killed ? "Reward: " + reward + " koin, +" + Math.floor(reward / 10) + " exp" : "",
          "",
          "Mana tersisa: " + user.mana,
        ], killed ? "success" : "warn"));
      }
    }

    // HELP
    return m.reply(claraWrap("RPG Spell", [
      "Belajar dan cast spell/magic RPG",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgspell learn — Belajar spell random (cost " + pluginConfig.energi + " energi)",
      usedPrefix + "rpgspell cast <nama> — Cast spell ke musuh",
      usedPrefix + "rpgspell list — Lihat spell yang kamu kuasai",
      usedPrefix + "rpgspell info — Lihat semua spell yang tersedia",
      "",
      "CONTOH:",
      usedPrefix + "rpgspell learn",
      usedPrefix + "rpgspell cast fireball",
      usedPrefix + "rpgspell cast heal",
    ]));
  } catch (e) {
    console.error("[RPG Spell]", e);
    m.reply(claraWrap("RPG Spell", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
