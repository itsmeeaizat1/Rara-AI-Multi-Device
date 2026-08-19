// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgsummon",
  alias: ["summon", "summonrpg", "panggil"],
  category: "rpg",
  description: "Summon spirit/elemental random untuk bantu petualangan RPG",
  usage: ".rpgsummon | .rpgsummon list | .rpgsummon release <id>",
  example: ".rpgsummon",
  isGroup: true,
  isPremium: false,
  cooldown: 60,
  energi: 15,
  isEnabled: true,
};

const SPIRITS = [
  { name: "Api Ifrit", element: "Api", rarity: "Legendary", power: 85, desc: "Spirit api legendaris yang membakar musuh dengan api abadi." },
  { name: "Air Leviathan", element: "Air", rarity: "Legendary", power: 82, desc: "Raksasa air yang menguasai samudra dan menghancurkan armada." },
  { name: "Angin Sylphid", element: "Angin", rarity: "Epic", power: 68, desc: "Spirit angin cepat yang memotong musuh dengan badai." },
  { name: "Bumi Titan", element: "Bumi", rarity: "Legendary", power: 88, desc: "Raksasa bumi yang tak tergoyahkan, pertahanan terkuat." },
  { name: "Petir Zeus", element: "Petir", rarity: "Mythic", power: 95, desc: "Spirit petir dewa yang menghancurkan apapun dengan satu sambaran." },
  { name: "Es Shiva", element: "Es", rarity: "Epic", power: 72, desc: "Spirit es yang membekukan medan perang seluruhnya." },
  { name: "Gelap Hades", element: "Gelap", rarity: "Mythic", power: 92, desc: "Penguasa underworld yang menyerap nyawa musuh." },
  { name: "Terang Apollo", element: "Terang", rarity: "Mythic", power: 90, desc: "Spirit cahaya yang menyembuhkan dan melindungi." },
  { name: "Racun Nidhogg", element: "Racun", rarity: "Epic", power: 70, desc: "Ular beracun yang melumpuhkan musuh perlahan." },
  { name: "Metal Golem", element: "Logam", rarity: "Rare", power: 55, desc: "Golem besi kokoh dengan serangan fisik brutal." },
  { name: "Hutan Dryad", element: "Alam", rarity: "Rare", power: 45, desc: "Spirit hutan yang memulihkan stamina dan HP." },
  { name: "Angin Zephyr", element: "Angin", rarity: "Rare", power: 42, desc: "Spirit angin ringan yang meningkatkan kecepatan." },
  { name: "Api Salamander", element: "Api", rarity: "Rare", power: 50, desc: "Spirit api kecil tapi agresif." },
  { name: "Air Undine", element: "Air", rarity: "Rare", power: 48, desc: "Spirit air yang menyembuhkan luka." },
  { name: "Es Frost", element: "Es", rarity: "Common", power: 30, desc: "Spirit es dasar untuk pemula." },
  { name: "Api Spark", element: "Api", rarity: "Common", power: 25, desc: "Spirit api terlemah tapi tetap berguna." },
  { name: "Bumi Pebble", element: "Bumi", rarity: "Common", power: 28, desc: "Spirit batu kecil untuk pertahanan dasar." },
  { name: "Angin Breeze", element: "Angin", rarity: "Common", power: 22, desc: "Spirit angin terkecil." },
  { name: "Petir Spark", element: "Petir", rarity: "Common", power: 35, desc: "Spirit petir kecil tapi menyakitkan." },
  { name: "Gelap Wisp", element: "Gelap", rarity: "Common", power: 32, desc: "Spirit gelap misterius." },
];

const RARITY_RATES = { Mythic: 2, Legendary: 8, Epic: 20, Rare: 35, Common: 100 };

function rollSummon() {
  const roll = Math.random() * 100;
  let rarity;
  if (roll < 2) rarity = "Mythic";
  else if (roll < 10) rarity = "Legendary";
  else if (roll < 30) rarity = "Epic";
  else if (roll < 65) rarity = "Rare";
  else rarity = "Common";

  const pool = SPIRITS.filter((s) => s.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // LIST
    if (sub === "list" || sub === "daftar") {
      const summons = user.summons || [];
      if (summons.length === 0) {
        return m.reply(claraWrap("RPG Summon", "Kamu belum punya spirit. Ketik .rpgsummon untuk memanggil!"));
      }
      let lines = ["Daftar Spirit Kamu (" + summons.length + "):", ""];
      summons.forEach((s, i) => {
        lines.push((i + 1) + ". " + s.name + " [" + s.element + "]");
        lines.push("   Rarity: " + s.rarity + " | Power: " + s.power);
      });
      lines.push("", "Total Power: " + summons.reduce((a, b) => a + b.power, 0));
      lines.push("", "Ketik .rpgsummon release <nomor> untuk lepaskan");
      return m.reply(claraWrap("RPG Summon", lines));
    }

    // RELEASE
    if (sub === "release" || sub === "lepas") {
      const idx = parseInt(args[1]) - 1;
      const summons = user.summons || [];
      if (isNaN(idx) || idx < 0 || idx >= summons.length) {
        return m.reply(claraWrap("RPG Summon", "Nomor tidak valid. Ketik .rpgsummon list untuk lihat daftar."));
      }
      const released = summons[idx];
      summons.splice(idx, 1);
      user.summons = summons;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Summon", "Spirit " + released.name + " dilepaskan kembali ke alam.", "success"));
    }

    // SUMMON
    if (user.energi < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Summon", "Energi kurang! Butuh " + pluginConfig.energi + " energi.\nEnergi kamu: " + (user.energi || 0)));
    }

    user.energi -= pluginConfig.energi;
    const spirit = rollSummon();
    if (!user.summons) user.summons = [];
    user.summons.push({ ...spirit, id: Date.now() });
    db.data.users[sender] = user;
    await db.save();

    const rarityEmoji = { Mythic: "??? MYTHIC", Legendary: "!! LEGENDARY", Epic: "! EPIC", Rare: "RARE", Common: "COMMON" };

    return m.reply(claraWrap("RPG Summon", [
      "SUMMON BERHASIL!",
      "",
      "Nama: " + spirit.name,
      "Elemen: " + spirit.element,
      "Rarity: " + spirit.rarity,
      "Power: " + spirit.power,
      "",
      "Deskripsi: " + spirit.desc,
      "",
      rarityEmoji[spirit.rarity] + " rarity terpanggil!",
      "Energi tersisa: " + user.energi,
      "",
      "Total spirit: " + user.summons.length,
      "Total power: " + user.summons.reduce((a, b) => a + b.power, 0),
    ], spirit.rarity === "Mythic" || spirit.rarity === "Legendary" ? "success" : "info"));
  } catch (e) {
    console.error("[RPG Summon]", e);
    m.reply(claraWrap("RPG Summon", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
