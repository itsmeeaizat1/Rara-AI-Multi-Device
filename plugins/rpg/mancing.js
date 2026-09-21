// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mancing.js — Mancing RPG (pancing ikan, rarity, sell) — dari kode owner
// Rombak khas 9 Sep 2026 (batch #2 antrean animasi per-game):
// - Animasi bentuk baru RIAK & TARIKAN (riak melebar + float tenggelem + tensi)
// - Item khas: 🐚 Mutiara (drop dari pancingan sendiri) → upgrade 🎣 Joran
// - Result box rapih novaRpgBox
// CATATAN: db key "fishing" DIBIARKAN (kontinuitas data koleksi ikan/joran).
import { getDatabase } from "../../src/lib/nova-database.js";
import { shapeFishing } from "../../src/lib/nova-rpg-shapes.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
import { ensureRpg, spendCash, getCash, formatRp } from "../../src/lib/nova-rpg-service.js";
import { getRpgWeather, applyWeatherToFishWeights, rpgWeatherTag } from "../../src/lib/nova-rpg-weather.js";

const pluginConfig = {
  name: "fishing",
  alias: ["mancing", "fish", "memancing", "fishrpg"],
  category: "rpg",
  description: "Mancing RPG — pancing ikan dengan rarity, kumpulkan Mutiara, upgrade Joran",
  usage: ".mancing (pancing)\n.mancing inventory (cek koleksi)\n.mancing sell (jual semua ikan)\n.mancing joran (status joran)\n.mancing upgrade (upgrade joran)",
  example: ".mancing",
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

// ─── KHAS FISHING: joran level (rods) ngaruh ke pool & harga ───
const PEARL_CHANCE = 5;          // % per pancing
const PEARL_RARE_BONUS = 1;      // ikan S/SS/SSS = +1 mutiara guaranteed
const ROD_TRASH_DOWN = 0.2;     // tiap level: peluang sampah −20%
const ROD_RARE_UP = 0.25;        // tiap level: peluang ikan langka +25%
const ROD_PRICE_UP = 0.1;        // tiap level: harga jual ikan +10%
const ROD_RP_COST = (lv) => 30000 * lv;   // upgrade ke lv+1
const ROD_PEARL_COST = (lv) => lv;        // upgrade ke lv+1

function weightedFish(rodLv = 1, weather = getRpgWeather()) {
  const mult = Math.max(0, rodLv - 1);
  // 🌦️ CUACA: multiplier bobot ikan langka/sampah (hujan/badai = langka naik)
  const weatherWeights = applyWeatherToFishWeights(FISH_TYPES.map((f) => {
    let w = f.weight;
    if (f.rarity === "Trash") w = Math.max(0, w * (1 - ROD_TRASH_DOWN * mult));
    if (["S", "SS", "SSS"].includes(f.rarity)) w = w * (1 + ROD_RARE_UP * mult);
    return { ...f, w };
  }), weather.fish).map((f) => ({ ...f, weight: f.w ?? f.weight }));
  const total = weatherWeights.reduce((s, f) => s + f.weight, 0);
  let roll = Math.random() * total;
  for (const f of weatherWeights) {
    roll -= f.weight;
    if (roll <= 0) return FISH_TYPES.find(x => x.name === f.name);
  }
  return FISH_TYPES[0];
}

const fishPrice = (fish, rodLv = 1) => Math.floor(fish.price * (1 + ROD_PRICE_UP * Math.max(0, rodLv - 1)));

async function getFishData(db, sender) {
  const d = await db.getPlayerData?.(sender, "fishing") || {};
  d.catches = d.catches || [];
  d.totalCaught = d.totalCaught || 0;
  d.bestCatch = d.bestCatch || null;
  d.rods = d.rods || 1;
  d.pearls = d.pearls || 0;
  return d;
}

async function handler(m, { sock }) {
  try {
    const sub = (m.args?.[0] || "").toLowerCase();
    const db = getDatabase();
    const data = await getFishData(db, m.sender);
    const rodLv = data.rods || 1;

    // ══════ INVENTORY ══════
    if (sub === "inventory" || sub === "koleksi") {
      if (data.catches.length === 0) {
        return m.reply(novaRpgBox("mancing", `Belum ada tangkapan 🥲\nMulai memancing: ${m.prefix}mancing`, "guide"));
      }
      const grouped = {};
      data.catches.forEach((f) => { grouped[f.name] = (grouped[f.name] || 0) + 1; });
      let list = Object.entries(grouped)
        .sort((a, b) => (FISH_TYPES.find(f => f.name === b[0])?.price || 0) - (FISH_TYPES.find(f => f.name === a[0])?.price || 0))
        .map(([name, count]) => {
          const fish = FISH_TYPES.find((f) => f.name === name);
          return `• ${fish?.emoji || "🐟"} ${name} x${count} (${fish?.rarity || "?"})`;
        }).join("\n");
      return m.reply(novaRpgBox("mancing",
        `📦 KOLEKSI TANGKAPAN\n\n${list}\n\n` +
        `🐟 Total : ${data.totalCaught} ikan\n🏆 Best catch : ${data.bestCatch || "-"}\n🐚 Mutiara : ${data.pearls}x\n\n` +
        `💡 .fishing sell — jual semua ikan`));
    }

    // ══════ SELL ══════
    if (sub === "sell" || sub === "jual") {
      if (data.catches.length === 0) {
        return m.reply(novaRpgBox("mancing", "Tidak ada ikan untuk dijual 🥲", "warn"));
      }
      const totalGold = data.catches.reduce((s, f) => s + fishPrice(FISH_TYPES.find(ft => ft.name === f.name) || { price: 0 }, rodLv), 0);
      try { await db.addGold?.(m.sender, totalGold); } catch {}
      data.catches = [];
      await db.setPlayerData(m.sender, "fishing", data);
      await m.react("🐣");
      return m.reply(novaRpgBox("mancing",
        `💰 TERJUAL SEMUA IKAN!\n\n` +
        `🐟 Dijual : ${data.totalCaught} total tangkapan\n💰 Gold : +${totalGold.toLocaleString()}\n🎣 Joran : Lv.${rodLv} (+${10 * (rodLv - 1)}% harga)`));
    }

    // ══════ JORAN STATUS ══════
    if (sub === "joran" || sub === "status") {
      return m.reply(novaRpgBox("mancing",
        `🎣 JORAN KAMU\n\n` +
        `Level : *Lv.${rodLv}*\n🗑️ Peluang sampah : −${20 * (rodLv - 1)}%\n✨ Peluang ikan langka : +${25 * (rodLv - 1)}%\n💰 Harga jual ikan : +${10 * (rodLv - 1)}%\n\n` +
        `🐚 Mutiara : ${data.pearls}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${rodLv + 1}: ${ROD_PEARL_COST(rodLv)}x Mutiara + ${formatRp(ROD_RP_COST(rodLv))}\nKetik: .fishing upgrade`));
    }

    // ══════ UPGRADE ══════
    if (sub === "upgrade" || sub === "upjoran") {
      const needPearl = ROD_PEARL_COST(rodLv);
      const needRp = ROD_RP_COST(rodLv);
      if (data.pearls < needPearl) {
        return m.reply(novaRpgBox("mancing",
          `🐚 Upgrade Joran ke Lv.${rodLv + 1} butuh:\n\n• Mutiara : ${needPearl}x (punya ${data.pearls}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Mutiara didapat dari .fishing sendiri — 5% per pancing, ikan langka (S+) dijamin dapat!`, "warn"));
      }
      ensureRpg(m, m.pushName);
      if (!spendCash(m, needRp)) {
        return m.reply(novaRpgBox("mancing", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = await getFishData(db, m.sender);
      fresh.pearls -= needPearl;
      fresh.rods = (fresh.rods || 1) + 1;
      await db.setPlayerData(m.sender, "fishing", fresh);
      await m.react("🐣");
      return m.reply(novaRpgBox("mancing",
        `🎣 JORAN UPGRADED!\n\nLevel : Lv.${rodLv} → Lv.${rodLv + 1}\n🗑️ Peluang sampah : −${20 * rodLv}%\n✨ Peluang ikan langka : +${25 * rodLv}%\n💰 Harga jual ikan : +${10 * rodLv}%\n\n🐚 Material : −${needPearl} Mutiara\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    // ══════ FISHING (default) ══════
    await m.react("🕒");
    // Animasi khas fishing: RIAK & TARIKAN
    await shapeFishing(m, sock);

    const weather = getRpgWeather();
    const fish = weightedFish(rodLv, weather);
    const fresh = await getFishData(db, m.sender);
    fresh.catches.push({ name: fish.name, time: Date.now() });
    fresh.totalCaught++;

    // Best catch tracking
    if (!fresh.bestCatch || (FISH_TYPES.find((f) => f.name === fish.name)?.price || 0) > (FISH_TYPES.find((f) => f.name === fresh.bestCatch)?.price || 0)) {
      fresh.bestCatch = fish.name;
    }

    // 🐚 Mutiara — item khas fishing
    let pearlGain = 0;
    if (["S", "SS", "SSS"].includes(fish.rarity)) {
      pearlGain = 1 + PEARL_RARE_BONUS; // langka = dijamin + bonus
    } else if (Math.random() * 100 < PEARL_CHANCE * weather.fish) {
      pearlGain = 1;
    }
    if (pearlGain > 0) fresh.pearls += pearlGain;

    await db.setPlayerData(m.sender, "fishing", fresh);
    await m.react("🐣");

    const isRare = ["S", "SS", "SSS"].includes(fish.rarity);
    return m.reply(novaRpgBox("mancing",
      `${isRare ? "✨ TANGKAPAN LANGKA!" : "🎣 TANGKAPAN BERHASIL!"}\n\n` +
      `${fish.emoji} *${fish.name}*\n` +
      `Rarity : *${fish.rarity}* | Harga : *${fishPrice(fish, rodLv).toLocaleString()} gold*\n\n` +
      `🐟 Total tangkapan : ${fresh.totalCaught}\n🏆 Best catch : ${fresh.bestCatch || "-"}\n` +
      (pearlGain ? `🐚 Mutiara : +${pearlGain}x (total ${fresh.pearls}x)\n` : `🐚 Mutiara : ${fresh.pearls}x\n`) +
      `\n${rpgWeatherTag(weather)}\n🎣 Joran : Lv.${rodLv}\n💡 .weathersystemrpg — cek cuaca | .fishing sell — jual semua ikan`, isRare ? "success" : "success"));
  } catch (err) {
    console.error("fishing error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("mancing", err?.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
