// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Gem — Collect gems, fuse untuk naik tier, socket ke equipment
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpggem",
  alias: ["gem", "gemrpg", "rpgpermata", "permata"],
  category: "rpg",
  description: "RPG Gem — koleksi permata, fuse untuk naik tier, socket ke equipment untuk boost stat",
  usage: ".rpggem | .rpggem list | .rpggem fuse <id1> <id2> | .rpggem socket <id> | .rpggem mine",
  example: ".rpggem\n.rpggem fuse 1 2",
  isGroup: true,
  cooldown: 30,
  energi: 10,
  isEnabled: true,
};

const GEM_TYPES = {
  ruby: { name: "Ruby", color: "Merah", stat: "attack", icon: "R" },
  sapphire: { name: "Sapphire", color: "Biru", stat: "defense", icon: "S" },
  emerald: { name: "Emerald", color: "Hijau", stat: "hp", icon: "E" },
  topaz: { name: "Topaz", color: "Kuning", stat: "speed", icon: "T" },
  amethyst: { name: "Amethyst", color: "Ungu", stat: "mana", icon: "A" },
  diamond: { name: "Diamond", color: "Putih", stat: "luck", icon: "D" },
};

const TIER_BOOSTS = [5, 15, 35, 75, 150]; // Tier 1-5

function rollGem() {
  const types = Object.keys(GEM_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const roll = Math.random() * 100;
  let tier;
  if (roll < 5) tier = 5;
  else if (roll < 15) tier = 4;
  else if (roll < 35) tier = 3;
  else if (roll < 65) tier = 2;
  else tier = 1;
  return { type, tier, id: Date.now() + Math.random() };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // LIST
    if (sub === "list" || sub === "daftar") {
      const gems = user.gems || [];
      if (gems.length === 0) {
        return m.reply(claraWrap("RPG Gem", "Kamu belum punya permata. Ketik .rpggem untuk menambang!"));
      }
      let lines = ["Daftar Permata (" + gems.length + "):", ""];
      gems.forEach((g, i) => {
        const info = GEM_TYPES[g.type];
        const boost = TIER_BOOSTS[g.tier - 1] || 5;
        const socketed = g.socketed ? " [SOCKETED]" : "";
        lines.push((i + 1) + ". " + info.name + " T" + g.tier + " (" + info.color + ")" + socketed);
        lines.push("   Stat: " + info.stat + " +" + boost);
      });
      const socketedGems = gems.filter((g) => g.socketed);
      if (socketedGems.length > 0) {
        lines.push("", "Bonus aktif (socketed):");
        socketedGems.forEach((g) => {
          const info = GEM_TYPES[g.type];
          lines.push(info.stat + " +" + (TIER_BOOSTS[g.tier - 1] || 5));
        });
      }
      return m.reply(claraWrap("RPG Gem", lines));
    }

    // FUSE
    if (sub === "fuse" || sub === "gabung") {
      const idx1 = parseInt(args[1]) - 1;
      const idx2 = parseInt(args[2]) - 1;
      const gems = user.gems || [];
      if (isNaN(idx1) || isNaN(idx2) || idx1 < 0 || idx2 < 0 || idx1 >= gems.length || idx2 >= gems.length) {
        return m.reply(claraWrap("RPG Gem", "Nomor tidak valid. Contoh: .rpggem fuse 1 2"));
      }
      if (idx1 === idx2) return m.reply(claraWrap("RPG Gem", "Pilih 2 permata berbeda!"));
      const g1 = gems[idx1];
      const g2 = gems[idx2];
      if (g1.type !== g2.type) return m.reply(claraWrap("RPG Gem", "Kedua permata harus jenis sama! Ruby + Ruby, bukan Ruby + Sapphire."));
      if (g1.tier !== g2.tier) return m.reply(claraWrap("RPG Gem", "Kedua permata harus tier sama!"));
      if (g1.tier >= 5) return m.reply(claraWrap("RPG Gem", "Tier 5 adalah tier maksimal!"));

      if (g1.socketed || g2.socketed) return m.reply(claraWrap("RPG Gem", "Lepaskan socket dulu sebelum fuse!"));

      // Fuse success
      const newTier = g1.tier + 1;
      const ids = [Math.max(idx1, idx2), Math.min(idx1, idx2)];
      ids.forEach((i) => gems.splice(i, 1));
      gems.push({ type: g1.type, tier: newTier, id: Date.now() + Math.random(), socketed: false });
      user.gems = gems;
      user.gemFuses = (user.gemFuses || 0) + 1;
      db.data.users[sender] = user;
      await db.save();

      const info = GEM_TYPES[g1.type];
      return m.reply(claraWrap("RPG Gem", [
        "FUSE BERHASIL!",
        "",
        "Hasil: " + info.name + " Tier " + newTier + " (" + info.color + ")",
        "Stat: " + info.stat + " +" + TIER_BOOSTS[newTier - 1],
        "",
        "Total fuse: " + user.gemFuses,
      ], "success"));
    }

    // SOCKET
    if (sub === "socket" || sub === "pasang") {
      const idx = parseInt(args[1]) - 1;
      const gems = user.gems || [];
      if (isNaN(idx) || idx < 0 || idx >= gems.length) {
        return m.reply(claraWrap("RPG Gem", "Nomor tidak valid. Ketik .rpggem list."));
      }
      const target = gems[idx];
      if (target.socketed) return m.reply(claraWrap("RPG Gem", "Permata ini sudah terpasang!"));

      // Only 1 gem per stat type
      gems.forEach((g) => { if (g.type === target.type) g.socketed = false; });
      target.socketed = true;
      user.gems = gems;
      db.data.users[sender] = user;
      await db.save();

      const info = GEM_TYPES[target.type];
      return m.reply(claraWrap("RPG Gem", info.name + " T" + target.tier + " terpasang!\nBonus: " + info.stat + " +" + TIER_BOOSTS[target.tier - 1], "success"));
    }

    // UNSOCKET
    if (sub === "unsocket" || sub === "lepas") {
      const idx = parseInt(args[1]) - 1;
      const gems = user.gems || [];
      if (isNaN(idx) || idx < 0 || idx >= gems.length) {
        return m.reply(claraWrap("RPG Gem", "Nomor tidak valid."));
      }
      if (!gems[idx].socketed) return m.reply(claraWrap("RPG Gem", "Permata ini tidak terpasang."));
      gems[idx].socketed = false;
      user.gems = gems;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Gem", "Permata dilepas dari socket.", "success"));
    }

    // MINE / DEFAULT
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Gem", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    user.energi -= pluginConfig.energi;
    const gem = rollGem();
    if (!user.gems) user.gems = [];
    user.gems.push(gem);
    user.gemMined = (user.gemMined || 0) + 1;
    db.data.users[sender] = user;
    await db.save();

    const info = GEM_TYPES[gem.type];
    const boost = TIER_BOOSTS[gem.tier - 1];

    return m.reply(claraWrap("RPG Gem", [
      "PERMATA DITEMUKAN!",
      "",
      "Jenis: " + info.name + " (" + info.color + ")",
      "Tier: " + gem.tier + " / 5",
      "Stat: " + info.stat + " +" + boost,
      "",
      gem.tier >= 4 ? "PERMATA LANGKA!" : gem.tier >= 3 ? "Permata bagus!" : "Permata biasa.",
      "",
      "Energi tersisa: " + user.energi,
      "Total permata: " + user.gems.length,
      "Total ditambang: " + user.gemMined,
      "",
      "Fuse 2 permata jenis+tier sama untuk naik tier!",
      ".rpggem fuse <id1> <id2>",
      "Socket: .rpggem socket <id>",
    ], gem.tier >= 4 ? "success" : "info"));
  } catch (e) {
    console.error("[RPG Gem]", e);
    m.reply(claraWrap("RPG Gem", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
