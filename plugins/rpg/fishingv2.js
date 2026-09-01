// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fishingv2.js — Fishing v2 dengan rods & bait system
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fishingv2",
  alias: ["fishingv2", "fish2", "mancingv2", "pancing2"],
  category: "rpg",
  description: "Fishing v2 — rods & bait system dengan 15 jenis ikan",
  usage: ".fishingv2 (pancing)\n.fishingv2 shop (beli rod/bait)\n.fishingv2 inv (cek koleksi)",
  example: ".fishingv2\n.fishingv2 shop",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const RODS = [
  { name: "Basic Rod", price: 0, bonus: 0, emoji: "🎣" },
  { name: "Iron Rod", price: 1000, bonus: 10, emoji: "🪝" },
  { name: "Steel Rod", price: 3000, bonus: 20, emoji: "🔱" },
  { name: "Mythic Rod", price: 10000, bonus: 35, emoji: "⚜️" },
];

const BAITS = [
  { name: "Worm", price: 10, bonus: 0, emoji: "🪱" },
  { name: "Shrimp", price: 50, bonus: 8, emoji: "🦐" },
  { name: "Golden Bait", price: 200, bonus: 20, emoji: "✨" },
];

const FISH = [
  { name: "Ikan Lele", rarity: "C", emoji: "🐟", price: 50, weight: 35 },
  { name: "Ikan Nila", rarity: "C", emoji: "🐟", price: 80, weight: 30 },
  { name: "Ikan Mas", rarity: "C", emoji: "🐠", price: 100, weight: 20 },
  { name: "Ikan Bawal", rarity: "B", emoji: "🐠", price: 250, weight: 12 },
  { name: "Ikan Tuna", rarity: "B", emoji: "🐡", price: 400, weight: 8 },
  { name: "Ikan Salmon", rarity: "A", emoji: "🦈", price: 800, weight: 5 },
  { name: "Ikan Paus", rarity: "S", emoji: "🐋", price: 2000, weight: 2 },
  { name: "Hiu Emas", rarity: "SS", emoji: "🦈", price: 5000, weight: 0.8 },
  { name: "Kraken", rarity: "SSS", emoji: "🐙", price: 15000, weight: 0.2 },
  { name: "Sampah", rarity: "Trash", emoji: "🗑️", price: 5, weight: 15 },
  { name: "Ikan Koi", rarity: "A", emoji: "🎏", price: 600, weight: 4 },
  { name: "Ikan Kerapu", rarity: "B", emoji: "🐟", price: 300, weight: 10 },
  { name: "Ikan Kakap", rarity: "A", emoji: "🐠", price: 700, weight: 3 },
  { name: "Belut Listrik", rarity: "SS", emoji: "⚡", price: 4000, weight: 1 },
  { name: "Ikan Dewa", rarity: "SSS", emoji: "🐲", price: 20000, weight: 0.1 },
];

function weightedCatch(rodBonus, baitBonus) {
  const total = FISH.reduce((s, f) => s + f.weight, 0);
  let roll = Math.random() * total;
  for (const f of FISH) {
    roll -= f.weight;
    if (roll <= 0) return f;
  }
  return FISH[0];
}

async function getData(db, sender) {
  return await db.getPlayerData?.(sender, "fishingv2") || { rod: 0, baits: { Worm: 0, Shrimp: 0, "Golden Bait": 0 }, catches: [], totalCaught: 0, bestCatch: null };
}
async function saveData(db, sender, data) {
  await db.setPlayerData?.(sender, "fishingv2", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getData(db, m.sender);

    if (subCmd === "shop" || subCmd === "toko") {
      let msg = `╭─「 ғɪsʜɪɴɢ sʜᴏᴘ 」\n`;
      msg += `│ 🎣 *RODS:*\n`;
      RODS.forEach((r, i) => msg += `│ ${r.emoji} ${r.name} - ${r.price === 0 ? "FREE" : r.price + "g"} (+${r.bonus}% catch)\n`);
      msg += `│\n`;
      msg += `│ 🪱 *BAITS:*\n`;
      BAITS.forEach(b => msg += `│ ${b.emoji} ${b.name} - ${b.price}g (+${b.bonus}% rarity)\n`);
      msg += `│\n`;
      msg += `│ ${m.prefix}fishingv2 buy rod <nama>\n`;
      msg += `│ ${m.prefix}fishingv2 buy bait <nama> <qty>\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    if (subCmd === "buy" || subCmd === "beli") {
      const type = (m.args[1] || "").toLowerCase();
      const itemName = m.args.slice(2).join(" ").trim();
      const qty = parseInt(m.args[m.args.length - 1]) || 1;

      if (type === "rod") {
        const rod = RODS.find(r => r.name.toLowerCase() === itemName.toLowerCase());
        if (!rod) return m.reply(claraWrap("fishingv2", "Rod tidak ditemukan.", "error"));
        try {
          const gold = await db.getGold?.(m.sender) || 0;
          if (gold < rod.price) return m.reply(claraWrap("fishingv2", `Gold kurang! Butuh ${rod.price}g.`, "error"));
          await db.minGold?.(m.sender, rod.price);
        } catch {}
        data.rod = RODS.indexOf(rod);
        await saveData(db, m.sender, data);
        await m.react("🐣");
        return m.reply(claraWrap("fishingv2", `${rod.emoji} Berhasil beli *${rod.name}*! (+${rod.bonus}% catch rate)`));
      } else if (type === "bait") {
        const bait = BAITS.find(b => b.name.toLowerCase() === itemName.toLowerCase().replace(/\d+$/, "").trim());
        if (!bait) return m.reply(claraWrap("fishingv2", "Bait tidak ditemukan.", "error"));
        const cost = bait.price * qty;
        try {
          const gold = await db.getGold?.(m.sender) || 0;
          if (gold < cost) return m.reply(claraWrap("fishingv2", `Gold kurang! Butuh ${cost}g.`, "error"));
          await db.minGold?.(m.sender, cost);
        } catch {}
        data.baits[bait.name] = (data.baits[bait.name] || 0) + qty;
        await saveData(db, m.sender, data);
        await m.react("🐣");
        return m.reply(claraWrap("fishingv2", `${bait.emoji} Beli *${bait.name}* x${qty} (${cost}g)!`));
      }
      return m.reply(claraWrap("fishingv2", `Format: ${m.prefix}fishingv2 buy rod/bait <nama>`, "guide"));
    }

    if (subCmd === "inv" || subCmd === "koleksi") {
      const rod = RODS[data.rod || 0];
      let msg = `╭─「 ғɪsʜɪɴɢ ɪɴᴠ 」\n`;
      msg += `│ Rod: ${rod.emoji} *${rod.name}*\n`;
      msg += `│ Baits: 🪱Worm:${data.baits?.Worm||0} 🦐Shrimp:${data.baits?.Shrimp||0} ✨Golden:${data.baits?.["Golden Bait"]||0}\n`;
      msg += `│ Total Catch: *${data.totalCaught || 0}*\n`;
      msg += `│ Best: *${data.bestCatch || "-"}*\n`;
      if (data.catches?.length > 0) {
        msg += `│\n`;
        const grouped = {};
        data.catches.forEach(f => { grouped[f.name] = (grouped[f.name]||0) + 1; });
        for (const [name, count] of Object.entries(grouped)) {
          const fish = FISH.find(f => f.name === name);
          msg += `│ ${fish?.emoji||"🐟"} ${name} x${count} [${fish?.rarity||"?"}]\n`;
        }
      }
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // FISHING (default)
    await m.react("🕒");
    await m.reply("🎣 Melempar pancing...");
    await new Promise(r => setTimeout(r, 1500));

    const rod = RODS[data.rod || 0];
    // Auto-use best bait available
    let activeBait = BAITS[0];
    if ((data.baits?.["Golden Bait"]||0) > 0) { activeBait = BAITS[2]; data.baits["Golden Bait"]--; }
    else if ((data.baits?.Shrimp||0) > 0) { activeBait = BAITS[1]; data.baits.Shrimp--; }
    else if ((data.baits?.Worm||0) > 0) { activeBait = BAITS[0]; data.baits.Worm--; }

    const fish = weightedCatch(rod.bonus, activeBait.bonus);
    if (!data.catches) data.catches = [];
    data.catches.push({ name: fish.name, time: Date.now() });
    data.totalCaught = (data.totalCaught || 0) + 1;
    if (!data.bestCatch) data.bestCatch = fish.name;
    await saveData(db, m.sender, data);

    await m.react("🐣");
    const isRare = ["S","SS","SSS"].includes(fish.rarity);
    let msg = `╭─「 ғɪsʜɪɴɢ v2 」\n`;
    msg += `│ Rod: ${rod.emoji} ${rod.name} | Bait: ${activeBait.emoji} ${activeBait.name}\n`;
    msg += `│\n`;
    msg += `│ ${isRare ? "✨ TANGKAPAN LANGKA! ✨" : "Berhasil!"}\n`;
    msg += `│ ${fish.emoji} *${fish.name}*\n`;
    msg += `│ Rarity: *${fish.rarity}* | Price: *${fish.price}g*\n`;
    msg += `│ Total: *${data.totalCaught}* | Best: *${data.bestCatch}*\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("fishingv2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("fishingv2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
