// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "personacard",
  alias: ["personacard"],
  category: "future",
  description: "RPG Persona Card - bikin kartu karakter dari statistik user",
  usage: ".personacard [target]",
  example: ".personacard",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const RACES = [
  { name: "Human", bonus: "balanced", desc: "Seimbang di semua aspek" },
  { name: "Elf", bonus: "agility", desc: "Cepat dan lincah" },
  { name: "Orc", bonus: "strength", desc: "Kuat dan tangguh" },
  { name: "Dwarf", bonus: "defense", desc: "Pertahanan tinggi" },
  { name: "Spirit", bonus: "magic", desc: "Magic kuat" },
  { name: "Dragonborn", bonus: "all", desc: "Semua stat naik" },
];

const CLASSES = [
  { name: "Warrior", stat: "strength", weapon: "Greatsword", emoji: "Knight" },
  { name: "Mage", stat: "magic", weapon: "Staff", emoji: "Mage" },
  { name: "Rogue", stat: "agility", weapon: "Daggers", emoji: "Assassin" },
  { name: "Paladin", stat: "defense", weapon: "Shield", emoji: "Paladin" },
  { name: "Berserker", stat: "strength", weapon: "Battle Axe", emoji: "Berserker" },
  { name: "Necromancer", stat: "magic", weapon: "Dark Tome", emoji: "Witch" },
  { name: "Archer", stat: "agility", weapon: "Long Bow", emoji: "Archer" },
  { name: "Samurai", stat: "balanced", weapon: "Katana", emoji: "Samurai" },
];

const TITLES = [
  { min: 1, max: 5, title: "Newbie Adventurer" },
  { min: 6, max: 10, title: "Rookie Fighter" },
  { min: 11, max: 20, title: "Skilled Warrior" },
  { min: 21, max: 35, title: "Veteran Hero" },
  { min: 36, max: 50, title: "Elite Champion" },
  { min: 51, max: 75, title: "Legendary Knight" },
  { min: 76, max: 100, title: "Mythic Sovereign" },
  { min: 101, max: 999, title: "GOD TIER" },
];

const PERSONALITY = [
  "Cool & Collected", "Hot-Blooded", "Mysterious", "Cheerful", "Dark & Edgy",
  "Wise Sage", "Trickster", "Lone Wolf", "Team Player", "Overconfident",
  "Silent but Deadly", "Chaos Incarnate", "Calm under Pressure", "Wildcard",
];

const SIGNATURE_MOVES = [
  "Nova Strike", "Eclipse Slash", "Thunder Pierce", "Shadowstep", "Holy Smite",
  "Dragon Fury", "Void Slash", "Frost Wall", "Soul Drain", "Star Burst",
  "Blade Storm", "Phantom Dash", "Inferno Blast", "Moonfall", "Ragnarok",
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTitle(level) {
  return TITLES.find(t => level >= t.min && level <= t.max)?.title || "Unknown";
}

function getConfig(db, gid) {
  const all = db.setting("personacard") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("personacard") || {};
  all[gid] = data;
  db.setting("personacard", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const gid = m.chat;
  const target = (m.mentionedJid && m.mentionedJid.length > 0) ? m.mentionedJid[0] : m.sender;
  const user = db.getUser(target);
  const cfg = getConfig(db, gid);

  // Generate card from user stats (deterministic based on jid + stats)
  const seed = hashString(target + (user?.level || 1) + (user?.totalCommands || 0));
  const raceIdx = seed % RACES.length;
  const classIdx = (seed >> 3) % CLASSES.length;
  const personalityIdx = (seed >> 6) % PERSONALITY.length;
  const moveIdx = (seed >> 9) % SIGNATURE_MOVES.length;

  const race = RACES[raceIdx];
  const charClass = CLASSES[classIdx];
  const personality = PERSONALITY[personalityIdx];
  const signatureMove = SIGNATURE_MOVES[moveIdx];
  const level = user?.level || 1;
  const title = getTitle(level);

  // Calculate stats
  const baseStats = {
    strength: 10 + Math.floor(level * 1.5),
    agility: 10 + Math.floor(level * 1.2),
    magic: 10 + Math.floor(level * 1.3),
    defense: 10 + Math.floor(level * 1.1),
    hp: 100 + (level * 20),
    mp: 50 + (level * 10),
  };

  // Apply race bonus
  if (race.bonus === "strength") baseStats.strength += 20;
  else if (race.bonus === "agility") baseStats.agility += 20;
  else if (race.bonus === "magic") baseStats.magic += 20;
  else if (race.bonus === "defense") baseStats.defense += 20;
  else if (race.bonus === "all") { baseStats.strength += 5; baseStats.agility += 5; baseStats.magic += 5; baseStats.defense += 5; }

  // Apply class bonus
  if (charClass.stat === "strength") baseStats.strength += 15;
  else if (charClass.stat === "magic") baseStats.magic += 15;
  else if (charClass.stat === "agility") baseStats.agility += 15;
  else if (charClass.stat === "defense") baseStats.defense += 15;

  const totalPower = baseStats.strength + baseStats.agility + baseStats.magic + baseStats.defense + Math.floor(baseStats.hp / 10) + Math.floor(baseStats.mp / 10);

  // Save card
  cfg[target] = {
    race: race.name,
    class: charClass.name,
    personality,
    signatureMove,
    title,
    level,
    stats: baseStats,
    totalPower,
    generatedAt: Date.now(),
  };
  saveConfig(db, gid, cfg);

  const stars = "★".repeat(Math.min(5, Math.ceil(level / 20)));
  const bar = (stat, max) => "▰".repeat(Math.min(10, Math.floor(stat / max * 10))) + "▱".repeat(10 - Math.min(10, Math.floor(stat / max * 10)));

  await m.reply(claraWrap("Persona Card", [
    (target === m.sender ? "" : "@" + target.split("@")[0] + " - "),
    title,
    stars,
    "",
    "Race: " + race.name + " (" + race.desc + ")",
    "Class: " + charClass.name,
    "Weapon: " + charClass.weapon,
    "Personality: " + personality,
    "",
    "Level: " + level,
    "HP: " + baseStats.hp + " | MP: " + baseStats.mp,
    "",
    "STR: " + baseStats.strength + " [" + bar(baseStats.strength, 100) + "]",
    "AGI: " + baseStats.agility + " [" + bar(baseStats.agility, 100) + "]",
    "MAG: " + baseStats.magic + " [" + bar(baseStats.magic, 100) + "]",
    "DEF: " + baseStats.defense + " [" + bar(baseStats.defense, 100) + "]",
    "",
    "Signature Move: " + signatureMove,
    "Total Power: " + totalPower,
    "",
    "Naik level buat upgrade kartu!",
  ].join("\n")), { mentions: target === m.sender ? [] : [target] });
  return { handled: true };
}

export { pluginConfig as config, handler };
