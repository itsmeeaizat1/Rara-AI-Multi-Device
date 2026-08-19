// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgartifact",
  alias: ["artifact", "artifaktrpg", "artifak"],
  category: "rpg",
  description: "Cari dan koleksi artifact kuno untuk boost power RPG",
  usage: ".rpgartifact | .rpgartifact list | .rpgartifact equip <nomor> | .rpgartifact sell <nomor>",
  example: ".rpgartifact",
  isGroup: true,
  isPremium: false,
  cooldown: 90,
  energi: 10,
  isEnabled: true,
};

const ARTIFACTS = [
  { name: "Excalibur", rarity: "Mythic", stat: "attack", boost: 50, desc: "Pedang suci yang hanya bisa dipegang oleh yang terpilih." },
  { name: "Aegis Shield", rarity: "Legendary", stat: "defense", boost: 45, desc: "Perisai dewa yang menahan segala serangan." },
  { name: "Gungnir", rarity: "Legendary", stat: "attack", boost: 40, desc: "Tombak Odin yang tidak pernah meleset." },
  { name: "Mjolnir", rarity: "Legendary", stat: "attack", boost: 42, desc: "Palu Thor yang menghancurkan gunung." },
  { name: "Helm of Hades", rarity: "Epic", stat: "defense", boost: 30, desc: "Helm yang membuat pemakainya tak terlihat." },
  { name: "Boots of Hermes", rarity: "Epic", stat: "speed", boost: 35, desc: "Sepatu yang memberi kecepatan dewa." },
  { name: "Amulet of Isis", rarity: "Epic", stat: "hp", boost: 200, desc: "Jimat penyembuhan dari dewi Isis." },
  { name: "Dragon Scale Armor", rarity: "Epic", stat: "defense", boost: 28, desc: "Baju zirah dari sisik naga." },
  { name: "Phoenix Feather", rarity: "Epic", stat: "hp", boost: 150, desc: "Bulu phoenix yang memberi kebangkitan." },
  { name: "Crystal Sword", rarity: "Rare", stat: "attack", boost: 18, desc: "Pedang kristal tajam." },
  { name: "Iron Shield", rarity: "Rare", stat: "defense", boost: 15, desc: "Perisai besi kokoh." },
  { name: "Leather Boots", rarity: "Rare", stat: "speed", boost: 12, desc: "Sepatu kulit lincah." },
  { name: "Health Ring", rarity: "Rare", stat: "hp", boost: 80, desc: "Cincin penambah HP." },
  { name: "Wooden Sword", rarity: "Common", stat: "attack", boost: 8, desc: "Pedang kayu sederhana." },
  { name: "Wooden Shield", rarity: "Common", stat: "defense", boost: 5, desc: "Perisai kayu dasar." },
  { name: "Cloth Armor", rarity: "Common", stat: "defense", boost: 3, desc: "Baju kain untuk pemula." },
  { name: "Stone Ring", rarity: "Common", stat: "hp", boost: 30, desc: "Cincin batu biasa." },
  { name: "Rusty Dagger", rarity: "Common", stat: "attack", boost: 5, desc: "Pisau berkarat tapi masih tajam." },
  { name: "Magic Charm", rarity: "Common", stat: "speed", boost: 4, desc: "Jimat sederhana." },
  { name: "Ancient Coin", rarity: "Common", stat: "hp", boost: 20, desc: "Koin kuno misterius." },
];

const ARTIFACT_PRICES = { Mythic: 50000, Legendary: 25000, Epic: 10000, Rare: 3000, Common: 500 };

function rollArtifact() {
  const roll = Math.random() * 100;
  let rarity;
  if (roll < 3) rarity = "Mythic";
  else if (roll < 12) rarity = "Legendary";
  else if (roll < 32) rarity = "Epic";
  else if (roll < 65) rarity = "Rare";
  else rarity = "Common";
  const pool = ARTIFACTS.filter((a) => a.rarity === rarity);
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
      const artifacts = user.artifacts || [];
      if (artifacts.length === 0) {
        return m.reply(claraWrap("RPG Artifact", "Kamu belum punya artifact. Ketik .rpgartifact untuk mencari!"));
      }
      let lines = ["Daftar Artifact (" + artifacts.length + "):", ""];
      artifacts.forEach((a, i) => {
        const equipped = a.equipped ? " [EQUIPPED]" : "";
        lines.push((i + 1) + ". " + a.name + " [" + a.rarity + "]" + equipped);
        lines.push("   " + a.stat + " +" + a.boost + " | Jual: " + ARTIFACT_PRICES[a.rarity] + " koin");
      });
      const totalBoost = artifacts.filter((a) => a.equipped).reduce((acc, a) => { acc[a.stat] = (acc[a.stat] || 0) + a.boost; return acc; }, {});
      lines.push("", "Bonus aktif (equipped):");
      for (const [stat, val] of Object.entries(totalBoost)) lines.push(stat + ": +" + val);
      return m.reply(claraWrap("RPG Artifact", lines));
    }

    // EQUIP
    if (sub === "equip" || sub === "pakai") {
      const idx = parseInt(args[1]) - 1;
      const artifacts = user.artifacts || [];
      if (isNaN(idx) || idx < 0 || idx >= artifacts.length) {
        return m.reply(claraWrap("RPG Artifact", "Nomor tidak valid. Ketik .rpgartifact list."));
      }
      // Unequip semua yang sama stat
      const target = artifacts[idx];
      artifacts.forEach((a) => { if (a.stat === target.stat) a.equipped = false; });
      target.equipped = true;
      user.artifacts = artifacts;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Artifact", target.name + " di-equip!\nBonus: " + target.stat + " +" + target.boost, "success"));
    }

    // SELL
    if (sub === "sell" || sub === "jual") {
      const idx = parseInt(args[1]) - 1;
      const artifacts = user.artifacts || [];
      if (isNaN(idx) || idx < 0 || idx >= artifacts.length) {
        return m.reply(claraWrap("RPG Artifact", "Nomor tidak valid. Ketik .rpgartifact list."));
      }
      const sold = artifacts[idx];
      if (sold.equipped) return m.reply(claraWrap("RPG Artifact", "Unequip dulu sebelum menjual!"));
      const price = ARTIFACT_PRICES[sold.rarity] || 500;
      artifacts.splice(idx, 1);
      user.koin = (user.koin || 0) + price;
      user.artifacts = artifacts;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Artifact", sold.name + " dijual seharga " + price + " koin!", "success"));
    }

    // SEARCH/HUNT ARTIFACT
    if (user.energi < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Artifact", "Energi kurang! Butuh " + pluginConfig.energi + " energi.\nEnergi: " + (user.energi || 0)));
    }
    user.energi -= pluginConfig.energi;
    const artifact = rollArtifact();
    if (!user.artifacts) user.artifacts = [];
    user.artifacts.push({ ...artifact, id: Date.now(), equipped: false });
    db.data.users[sender] = user;
    await db.save();

    return m.reply(claraWrap("RPG Artifact", [
      "ARTIFACT DITEMUKAN!",
      "",
      "Nama: " + artifact.name,
      "Rarity: " + artifact.rarity,
      "Stat: " + artifact.stat + " +" + artifact.boost,
      "Nilai jual: " + (ARTIFACT_PRICES[artifact.rarity] || 500) + " koin",
      "",
      artifact.desc,
      "",
      "Energi tersisa: " + user.energi,
      "Total artifact: " + user.artifacts.length,
      "",
      "Ketik .rpgartifact equip <nomor> untuk pakai",
      "Ketik .rpgartifact sell <nomor> untuk jual",
    ], artifact.rarity === "Mythic" || artifact.rarity === "Legendary" ? "success" : "info"));
  } catch (e) {
    console.error("[RPG Artifact]", e);
    m.reply(claraWrap("RPG Artifact", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
