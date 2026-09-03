// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fishing.js — Fishing RPG (pancing ikan, rarity, sell)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGather } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "fishing",
  alias: ["fishing", "mancing2", "fishrpg", "memancing"],
  category: "rpg",
  description: "Fishing RPG — pancing ikan dengan rarity & sell system",
  usage: ".fishing (pancing)\n.fishing sell (jual semua ikan)\n.fishing inventory (cek koleksi)",
  example: ".fishing",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 2, isEnabled: true,
};

const FISH_TYPES = [
  { name: "Ikan Lele", rarity: "C", emoji: "🐟", price: 50, weight: 40 },
  { name: "Ikan Nila", rarity: "C", emoji: "🐟", price: 80, weight: 35 },
  { name: "Ikan Mas", rarity: "C", emoji: "🐠", price: 100, weight: 25 },
  { name: "Ikan Bawal", rarity: "B", emoji: "🐠", price: 250, weight: 15 },
  { name: "Ikan Tuna", rarity: "B", emoji: "🐡", price: 400, weight: 10 },
  { name: "Ikan Salmon", rarity: "A", emoji: "🦈", price: 800, weight: 5 },
  { name: "Ikan Paus Mini", rarity: "S", emoji: "🐋", price: 2000, weight: 2 },
  { name: "Hiu Emas", rarity: "SS", emoji: "🦈", price: 5000, weight: 0.5 },
  { name: "Legehndary Kraken", rarity: "SSS", emoji: "🐙", price: 15000, weight: 0.1 },
  { name: "Sampah", rarity: "Trash", emoji: "🗑️", price: 5, weight: 20 },
];

function weightedFish() {
  const total = FISH_TYPES.reduce((s, f) => s + f.weight, 0);
  let roll = Math.random() * total;
  for (const f of FISH_TYPES) {
    roll -= f.weight;
    if (roll <= 0) return f;
  }
  return FISH_TYPES[0];
}

async function getFishData(db, sender) {
  return await db.getPlayerData?.(sender, "fishing") || { catches: [], totalCaught: 0, bestCatch: null, rods: 1 };
}

async function saveFishData(db, sender, data) {
  await db.setPlayerData?.(sender, "fishing", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    if (subCmd === "inventory" || subCmd === "koleksi") {
      const data = await getFishData(db, m.sender);
      if (!data.catches || data.catches.length === 0) {
        return m.reply(claraWrap("fishing", `Belum ada tangkapan. Mulai memancing: ${m.prefix}fishing`, "guide"));
      }
      const grouped = {};
      data.catches.forEach(f => { grouped[f.name] = (grouped[f.name] || 0) + 1; });
      let msg = "";
      msg += `Total: *${data.totalCaught}*\n`;
      msg += `
`;
      for (const [name, count] of Object.entries(grouped)) {
        const fish = FISH_TYPES.find(f => f.name === name);
        msg += `${fish?.emoji || "🐟"} ${name} x${count} (${fish?.rarity || "?"})\n`;
      }
            return m.reply(msg);
    }

    if (subCmd === "sell" || subCmd === "jual") {
      const data = await getFishData(db, m.sender);
      if (!data.catches || data.catches.length === 0) {
        return m.reply(claraWrap("fishing", "Tidak ada ikan untuk dijual.", "error"));
      }
      const totalGold = data.catches.reduce((s, f) => {
        const fish = FISH_TYPES.find(ft => ft.name === f.name);
        return s + (fish?.price || 0);
      }, 0);
      try { await db.addGold?.(m.sender, totalGold); } catch {}
      data.catches = [];
      await saveFishData(db, m.sender, data);
      await m.react("🐣");
      return m.reply(claraWrap("fishing", `💰 Terjual semua ikan!\nTotal: +${totalGold} gold`));
    }

    // FISHING
    await m.react("🕒");

    // Animasi
    const messages = ["🎣 Melempar pancing...", "🌊 Menunggu ikan...", "⚓ Tarikan terasa..."];
    const waitMsg = messages[Math.floor(Math.random() * messages.length)];
    await m.reply(waitMsg);
    await new Promise(r => setTimeout(r, 1500));

    const fish = weightedFish();
    const data = await getFishData(db, m.sender);
    if (!data.catches) data.catches = [];
    if (!data.totalCaught) data.totalCaught = 0;
    data.catches.push({ name: fish.name, time: Date.now() });
    data.totalCaught++;

    // Best catch tracking
    if (!data.bestCatch || (FISH_TYPES.find(f => f.name === fish.name)?.price || 0) > (FISH_TYPES.find(f => f.name === data.bestCatch)?.price || 0)) {
      data.bestCatch = fish.name;
    }
    await saveFishData(db, m.sender, data);

    await m.react("🐣");
    const isRare = fish.rarity === "S" || fish.rarity === "SS" || fish.rarity === "SSS";
    let msg = "";
    msg += `${isRare ? " TANGKAPAN BERHASIL! " : "Berhasil menangkap!"}\n`;
    msg += `
`;
    msg += `${fish.emoji} *${fish.name}*\n`;
    msg += `Rarity: *${fish.rarity}*\n`;
    msg += `Price: *${fish.price} gold*\n`;
    msg += `
`;
    msg += `Total tangkapan: *${data.totalCaught}*\n`;
    msg += `Best catch: *${data.bestCatch || "-"}*\n`;
    msg += `
`;
    msg += `${m.prefix}fishing sell - jual semua ikan\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("fishing error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fishing", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
