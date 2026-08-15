// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { delay } from "../../src/lib/nova-utils.js";

const pluginConfig = {
  name: "aigrouppet",
  alias: ["grouppet", "petgrup", "gpet"],
  category: "future",
  description: "Pet virtual kolaboratif yang tumbuh dari aktivitas grup",
  usage: ".grouppet <command>",
  example: ".grouppet",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const STAGES = [
  { name: "Telur", emoji: "🥚", minLevel: 0, desc: "Pet belum menetas" },
  { name: "Bayi", emoji: "🐣", minLevel: 1, desc: "Baru menetas, butuh perhatian" },
  { name: "Anak", emoji: "🐥", minLevel: 5, desc: "Sudah mulai aktif" },
  { name: "Remaja", emoji: "🐤", minLevel: 15, desc: "Tumbuh sehat dengan grup" },
  { name: "Dewasa", emoji: "🦅", minLevel: 30, desc: "Pet kuat dan mandiri" },
  { name: "Legendaris", emoji: "🐉", minLevel: 60, desc: "Pet puncak evolusi" },
];

function getPet(db, gid) {
  const all = db.setting("aigrouppet") || {};
  if (!all[gid]) {
    all[gid] = {
      name: "Nova Pet",
      level: 0,
      exp: 0,
      hp: 100,
      maxHp: 100,
      hunger: 0,
      mood: "happy",
      lastActive: Date.now(),
      totalMessages: 0,
      milestones: [],
      evolvedAt: Date.now(),
      fedBy: {},
    };
    db.setting("aigrouppet", all);
  }
  return all[gid];
}

function savePet(db, gid, data) {
  const all = db.setting("aigrouppet") || {};
  all[gid] = data;
  db.setting("aigrouppet", all);
  db.save();
}

function getStage(level) {
  let stage = STAGES[0];
  for (const s of STAGES) {
    if (level >= s.minLevel) stage = s;
  }
  return stage;
}

function getExpNeeded(level) {
  return 10 + level * 15;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  const pet = getPet(db, gid);

  // Decay check: hunger increases, mood drops if inactive
  const now = Date.now();
  const hoursPassed = (now - pet.lastActive) / 3600000;
  pet.hunger = Math.min(100, pet.hunger + Math.floor(hoursPassed * 2));
  if (pet.hunger > 80) pet.mood = "hungry";
  else if (pet.hunger > 50) pet.mood = "neutral";
  else pet.mood = "happy";

  // ==================== STATUS (default)
  if (!sub || sub === "status" || sub === "cek") {
    const stage = getStage(pet.level);
    const expNeeded = getExpNeeded(pet.level);
    const nextStage = STAGES.find(s => s.minLevel > pet.level);
    const progress = Math.floor((pet.exp / expNeeded) * 100);
    const hpBar = Math.floor((pet.hp / pet.maxHp) * 100);
    await m.reply(claraWrap("Group Pet", [
      stage.emoji + " " + pet.name + " [" + stage.name + "]",
      "",
      "Level: " + pet.level,
      "EXP: " + pet.exp + "/" + expNeeded + " (" + progress + "%)",
      "HP: " + pet.hp + "/" + pet.maxHp,
      "Hunger: " + pet.hunger + "/100",
      "Mood: " + pet.mood,
      "Total pesan grup: " + pet.totalMessages,
      "",
      nextStage ? "Next: " + nextStage.emoji + " " + nextStage.name + " (Lv " + nextStage.minLevel + ")" : "Max stage tercapai!",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== FEED
  if (sub === "feed" || sub === "makan" || sub === "kasihmakan") {
    pet.hunger = Math.max(0, pet.hunger - 30);
    pet.mood = "happy";
    pet.hp = Math.min(pet.maxHp, pet.hp + 10);
    pet.lastActive = now;
    pet.exp += 2;
    if (!pet.fedBy[m.sender]) pet.fedBy[m.sender] = 0;
    pet.fedBy[m.sender]++;

    // Level up check
    const needed = getExpNeeded(pet.level);
    if (pet.exp >= needed) {
      pet.exp -= needed;
      pet.level++;
      pet.maxHp += 20;
      pet.hp = pet.maxHp;
      const oldStage = getStage(pet.level - 1);
      const newStage = getStage(pet.level);
      savePet(db, gid, pet);
      if (newStage.name !== oldStage.name) {
        await m.reply(claraWrap("Group Pet", [
          pet.name + " LEVEL UP!",
          "Lv " + (pet.level - 1) + " -> " + pet.level,
          "",
          "EVOLUSI!",
          oldStage.emoji + " " + oldStage.name + " -> " + newStage.emoji + " " + newStage.name,
          newStage.desc,
        ].join("\n")));
      } else {
        await m.reply(claraWrap("Group Pet", "Makan diberikan! " + pet.name + " Level Up!\nLv " + (pet.level - 1) + " -> " + pet.level));
      }
    } else {
      savePet(db, gid, pet);
      await m.reply(claraWrap("Group Pet", pet.name + " diberi makan! +2 EXP\nHunger: " + pet.hunger + "/100\nMood: " + pet.mood));
    }
    return { handled: true };
  }

  // ==================== PET (interact)
  if (sub === "pet" || sub === "belai" || sub === "play") {
    pet.mood = "happy";
    pet.exp += 1;
    pet.lastActive = now;
    pet.hp = Math.min(pet.maxHp, pet.hp + 5);
    savePet(db, gid, pet);
    const stage = getStage(pet.level);
    const responses = [
      stage.emoji + " " + pet.name + " senang diajak main!",
      stage.emoji + " " + pet.name + " meringkik senang!",
      stage.emoji + " " + pet.name + " bertambah dekat dengan grup!",
    ];
    await m.reply(claraWrap("Group Pet", responses[Math.floor(Math.random() * responses.length)] + "\n+1 EXP"));
    return { handled: true };
  }

  // ==================== RENAME
  if (sub === "rename" || sub === "namain") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Group Pet", "Khusus admin/owner."));
      return { handled: true };
    }
    const name = args.slice(2).join(" ").trim();
    if (!name || name.length > 20) {
      await m.reply(claraWrap("Group Pet", "Format: " + prefix + "grouppet rename <nama max 20 huruf>"));
      return { handled: true };
    }
    pet.name = name;
    savePet(db, gid, pet);
    await m.reply(claraWrap("Group Pet", "Pet berganti nama: " + name));
    return { handled: true };
  }

  // ==================== STATS
  if (sub === "stats" || sub === "statistik") {
    const topFeeders = Object.entries(pet.fedBy)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([jid, count], i) => (i + 1) + ". @" + jid.split("@")[0] + " (" + count + "x)")
      .join("\n") || "(belum ada)";
    await m.reply(claraWrap("Group Pet Stats", [
      "Nama: " + pet.name,
      "Total pesan: " + pet.totalMessages,
      "Total level: " + pet.level,
      "Milestones: " + pet.milestones.length,
      "",
      "Top Feeder:",
      topFeeders,
    ].join("\n")), {
      mentions: Object.keys(pet.fedBy)
    });
    return { handled: true };
  }

  // ==================== RESET (owner)
  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Group Pet", "Khusus owner."));
      return { handled: true };
    }
    savePet(db, gid, {
      name: "Nova Pet",
      level: 0, exp: 0, hp: 100, maxHp: 100,
      hunger: 0, mood: "happy", lastActive: Date.now(),
      totalMessages: 0, milestones: [], evolvedAt: Date.now(), fedBy: {},
    });
    await m.reply(claraWrap("Group Pet", "Pet direset."));
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(claraWrap("Group Pet", [
    "GROUP PET - Pet virtual kolaboratif",
    "",
    "Cara pakai:",
    prefix + "grouppet - lihat status",
    prefix + "grouppet feed - beri makan",
    prefix + "grouppet play - ajak main",
    prefix + "grouppet rename <nama> (admin)",
    prefix + "grouppet stats - statistik",
    prefix + "grouppet reset (owner)",
    "",
    "Pet tumbuh dari aktivitas grup!",
    "Stages: Telur -> Bayi -> Anak -> Remaja -> Dewasa -> Legendaris",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
