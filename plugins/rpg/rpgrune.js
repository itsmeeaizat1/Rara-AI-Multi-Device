// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgrune",
  alias: ["rune", "runerpg", "simbol"],
  category: "rpg",
  description: "Koleksi dan fuse rune kuno untuk upgrade equipment RPG",
  usage: ".rpgrune | .rpgrune list | .rpgrune fuse <id1> <id2> | .rpgrune attach <id> | .rpgrune sell <id>",
  example: ".rpgrune\n.rpgrune fuse 1 2",
  isGroup: true,
  isPremium: false,
  cooldown: 60,
  energi: 12,
  isEnabled: true,
};

const RUNES = [
  // Tier 1
  { name: "Rune Api I", tier: 1, element: "Api", boost: 5, stat: "attack", color: "Merah" },
  { name: "Rune Air I", tier: 1, element: "Air", boost: 5, stat: "hp", color: "Biru" },
  { name: "Rune Bumi I", tier: 1, element: "Bumi", boost: 5, stat: "defense", color: "Coklat" },
  { name: "Rune Angin I", tier: 1, element: "Angin", boost: 5, stat: "speed", color: "Hijau" },
  { name: "Rune Petir I", tier: 1, element: "Petir", boost: 7, stat: "attack", color: "Kuning" },
  // Tier 2 (fuse result)
  { name: "Rune Api II", tier: 2, element: "Api", boost: 15, stat: "attack", color: "Merah" },
  { name: "Rune Air II", tier: 2, element: "Air", boost: 15, stat: "hp", color: "Biru" },
  { name: "Rune Bumi II", tier: 2, element: "Bumi", boost: 15, stat: "defense", color: "Coklat" },
  { name: "Rune Angin II", tier: 2, element: "Angin", boost: 15, stat: "speed", color: "Hijau" },
  { name: "Rune Petir II", tier: 2, element: "Petir", boost: 18, stat: "attack", color: "Kuning" },
  // Tier 3 (fuse result)
  { name: "Rune Inferno III", tier: 3, element: "Api", boost: 35, stat: "attack", color: "Merah" },
  { name: "Rune Tsunami III", tier: 3, element: "Air", boost: 35, stat: "hp", color: "Biru" },
  { name: "Rune Gaia III", tier: 3, element: "Bumi", boost: 35, stat: "defense", color: "Coklat" },
  { name: "Rune Tempest III", tier: 3, element: "Angin", boost: 35, stat: "speed", color: "Hijau" },
  { name: "Rune Zeus III", tier: 3, element: "Petir", boost: 40, stat: "attack", color: "Kuning" },
  // Tier 4 (fuse 2x tier 3)
  { name: "Rune Genesis IV", tier: 4, element: "Ultimate", boost: 70, stat: "all", color: "Emas" },
];

const RUNE_PRICES = { 1: 500, 2: 2000, 3: 10000, 4: 50000 };

function rollRune() {
  const roll = Math.random() * 100;
  let tier;
  if (roll < 3) tier = 4;
  else if (roll < 15) tier = 3;
  else if (roll < 40) tier = 2;
  else tier = 1;
  const pool = RUNES.filter((r) => r.tier === tier);
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
      const runes = user.runes || [];
      if (runes.length === 0) {
        return m.reply(claraWrap("RPG Rune", "Kamu belum punya rune. Ketik .rpgrune untuk mencari!"));
      }
      let lines = ["Daftar Rune (" + runes.length + "):", ""];
      runes.forEach((r, i) => {
        const attached = r.attached ? " [ATTACHED]" : "";
        lines.push((i + 1) + ". " + r.name + " Tier " + r.tier + attached);
        lines.push("   " + r.stat + " +" + r.boost + " | " + r.element + " | Jual: " + (RUNE_PRICES[r.tier] || 500) + " koin");
      });
      return m.reply(claraWrap("RPG Rune", lines));
    }

    // FUSE
    if (sub === "fuse" || sub === "gabung") {
      const idx1 = parseInt(args[1]) - 1;
      const idx2 = parseInt(args[2]) - 1;
      const runes = user.runes || [];
      if (isNaN(idx1) || isNaN(idx2) || idx1 < 0 || idx2 < 0 || idx1 >= runes.length || idx2 >= runes.length) {
        return m.reply(claraWrap("RPG Rune", "Nomor tidak valid. Contoh: .rpgrune fuse 1 2"));
      }
      if (idx1 === idx2) return m.reply(claraWrap("RPG Rune", "Pilih 2 rune berbeda!"));
      const r1 = runes[idx1];
      const r2 = runes[idx2];
      if (r1.tier !== r2.tier) return m.reply(claraWrap("RPG Rune", "Kedua rune harus tier yang sama!"));
      if (r1.element !== r2.element) return m.reply(claraWrap("RPG Rune", "Kedua rune harus elemen yang sama!"));
      if (r1.tier >= 4) return m.reply(claraWrap("RPG Rune", "Rune tier 4 tidak bisa di-fuse lagi!"));

      // Fuse success
      const newTier = r1.tier + 1;
      const higherRunes = RUNES.filter((r) => r.tier === newTier && r.element === r1.element);
      if (higherRunes.length === 0) {
        // Cross-element fusion -> Genesis
        const genesis = RUNES.find((r) => r.tier === 4 && r.name === "Rune Genesis IV");
        if (genesis) {
          // Remove both, add genesis
          const ids = [Math.max(idx1, idx2), Math.min(idx1, idx2)];
          ids.forEach((i) => runes.splice(i, 1));
          runes.push({ ...genesis, id: Date.now(), attached: false });
          user.runes = runes;
          db.data.users[sender] = user;
          await db.save();
          return m.reply(claraWrap("RPG Rune", [
            "FUSE BERHASIL!",
            "",
            "Hasil: " + genesis.name + " (Tier 4 Ultimate!)",
            "Stat: ALL +" + genesis.boost,
            "Elemen: " + genesis.element,
            "",
            "Rune legendaris tercipta!",
          ], "success"));
        }
      }
      const newRune = higherRunes[0];
      // Remove both old runes
      const ids = [Math.max(idx1, idx2), Math.min(idx1, idx2)];
      ids.forEach((i) => runes.splice(i, 1));
      runes.push({ ...newRune, id: Date.now(), attached: false });
      user.runes = runes;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Rune", [
        "FUSE BERHASIL!",
        "",
        "Hasil: " + newRune.name + " (Tier " + newRune.tier + ")",
        "Stat: " + newRune.stat + " +" + newRune.boost,
        "Elemen: " + newRune.element,
      ], "success"));
    }

    // ATTACH
    if (sub === "attach" || sub === "pasang") {
      const idx = parseInt(args[1]) - 1;
      const runes = user.runes || [];
      if (isNaN(idx) || idx < 0 || idx >= runes.length) {
        return m.reply(claraWrap("RPG Rune", "Nomor tidak valid. Ketik .rpgrune list."));
      }
      const target = runes[idx];
      if (target.attached) return m.reply(claraWrap("RPG Rune", "Rune ini sudah ter-attach!"));
      runes.forEach((r) => { if (r.stat === target.stat) r.attached = false; });
      target.attached = true;
      user.runes = runes;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Rune", target.name + " di-attach!\nBonus: " + target.stat + " +" + target.boost, "success"));
    }

    // SELL
    if (sub === "sell" || sub === "jual") {
      const idx = parseInt(args[1]) - 1;
      const runes = user.runes || [];
      if (isNaN(idx) || idx < 0 || idx >= runes.length) {
        return m.reply(claraWrap("RPG Rune", "Nomor tidak valid. Ketik .rpgrune list."));
      }
      const sold = runes[idx];
      if (sold.attached) return m.reply(claraWrap("RPG Rune", "Detach dulu sebelum menjual!"));
      const price = RUNE_PRICES[sold.tier] || 500;
      runes.splice(idx, 1);
      user.koin = (user.koin || 0) + price;
      user.runes = runes;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Rune", sold.name + " dijual " + price + " koin!", "success"));
    }

    // SEARCH/HUNT RUNE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Rune", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }
    user.energi -= pluginConfig.energi;
    const rune = rollRune();
    if (!user.runes) user.runes = [];
    user.runes.push({ ...rune, id: Date.now(), attached: false });
    db.data.users[sender] = user;
    await db.save();

    return m.reply(claraWrap("RPG Rune", [
      "RUNE DITEMUKAN!",
      "",
      "Nama: " + rune.name,
      "Tier: " + rune.tier,
      "Elemen: " + rune.element + " (" + rune.color + ")",
      "Stat: " + rune.stat + " +" + rune.boost,
      "Nilai jual: " + (RUNE_PRICES[rune.tier] || 500) + " koin",
      "",
      "Energi tersisa: " + user.energi,
      "Total rune: " + user.runes.length,
      "",
      "Fuse 2 rune tier+elemen sama untuk upgrade!",
      ".rpgrune fuse <id1> <id2>",
    ], rune.tier >= 3 ? "success" : "info"));
  } catch (e) {
    console.error("[RPG Rune]", e);
    m.reply(claraWrap("RPG Rune", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
