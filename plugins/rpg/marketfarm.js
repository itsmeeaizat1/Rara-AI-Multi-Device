// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "marketfarm",
  alias: ["marketv2", "marketfarm", "pasarv2"],
  category: "rpg",
  description: "Pasar hasil panen dengan harga yang naik turun tiap hari",
  usage: ".marketfarm <price/sell/status/trend>",
  example: ".marketfarm sell padi 5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Base prices (sama kayak coopfarm sellPrice)
const BASE_PRICES = {
  padi: { name: "Padi", emoji: "🌾", base: 150 },
  jagung: { name: "Jagung", emoji: "🌽", base: 300 },
  tomat: { name: "Tomat", emoji: "🍅", base: 550 },
  wortel: { name: "Wortel", emoji: "🥕", base: 900 },
  strawberry: { name: "Stroberi", emoji: "🍓", base: 1800 },
  melon: { name: "Melon", emoji: "🍈", base: 3500 },
  labu: { name: "Labu", emoji: "🎃", base: 6000 },
  anggur: { name: "Anggur", emoji: "🍇", base: 12000 },
};

// Event pasar yang bisa terjadi
const MARKET_EVENTS = [
  { name: "Normal", modifier: 1.0, desc: "Harga pasar normal" },
  { name: "Lonjakan Permintaan", modifier: 1.5, desc: "Harga naik 50%!" },
  { name: "Panen Raya", modifier: 0.6, desc: "Harga turun 40% (overstock)" },
  { name: "Festival Kuliner", modifier: 2.0, desc: "Harga 2x lipat! (event langka)" },
  { name: "Krisis Pangan", modifier: 3.0, desc: "Harga 3x lipat! (super langka)" },
  { name: "Import Murah", modifier: 0.5, desc: "Harga turun 50% (kompetisi import)" },
  { name: "Ekspor Meningkat", modifier: 1.8, desc: "Harga naik 80%" },
  { name: "Musim Panen", modifier: 0.7, desc: "Harga turun 30%" },
];

function getDay() {
  return Math.floor(Date.now() / 86400000);
}

function getMarketState(db) {
  if (!db.db.data.marketfarm) db.db.data.marketfarm = {};
  const today = getDay();
  const market = db.db.data.marketfarm;

  // Per-crop event
  if (!market.cropEvents || market.day !== today) {
    market.day = today;
    market.cropEvents = {};
    for (const crop of Object.keys(BASE_PRICES)) {
      const eventIdx = Math.floor(Math.random() * MARKET_EVENTS.length);
      market.cropEvents[crop] = {
        event: MARKET_EVENTS[eventIdx],
        trend: Math.random() > 0.5 ? "naik" : "turun",
      };
    }
    // 1-2 crop dapat event langka (Festival/Krisis)
    const allCrops = Object.keys(BASE_PRICES);
    const rare1 = allCrops[Math.floor(Math.random() * allCrops.length)];
    const rare2 = allCrops[Math.floor(Math.random() * allCrops.length)];
    const rareEvents = [3, 4]; // Festival Kuliner, Krisis Pangan
    market.cropEvents[rare1].event = MARKET_EVENTS[rareEvents[Math.floor(Math.random() * 2)]];
    if (rare2 !== rare1) {
      market.cropEvents[rare2].event = MARKET_EVENTS[rareEvents[Math.floor(Math.random() * 2)]];
    }
    db.db.write();
  }

  return market;
}

function getCurrentPrice(cropKey) {
  const market = getMarketState(getDatabase());
  const base = BASE_PRICES[cropKey];
  if (!base) return 0;
  const event = market.cropEvents?.[cropKey];
  const mod = event ? event.event.modifier : 1.0;
  return Math.floor(base.base * mod);
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const market = getMarketState(db);
  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action || action === "status" || action === "price") {
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Harga Hari Ini:  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "Trend harga tiap tanaman:\n\n";

    for (const [key, crop] of Object.entries(BASE_PRICES)) {
      const event = market.cropEvents?.[key];
      if (!event) continue;
      const trendIcon = event.trend === "naik" ? "📈 naik" : "📉 turun";
      txt += crop.emoji + " " + crop.name + ": " + trendIcon + " (" + event.event.name + ")\n";
    }

    txt += "\nCat: Ramalan bisa berubah besok!\n";
    txt += "Strategi: simpan stok pas trend naik, jual pas event tinggi";
    return await sendReplyWithNav(sock, m, txt, "marketfarm");
  }

  if (action === "sell") {
    const cropName = args[1];
    const qty = parseInt(args[2]) || 1;

    if (!cropName) {
      return m.reply(claraWrap("Marketfarm", "Jual apa?\nContoh: .marketfarm sell padi 10"));
    }

    const crop = BASE_PRICES[cropName];
    if (!crop) {
      return sendReplyWithNav(sock, m, "Tanaman *" + cropName + "* tidak ada di pasar!\nLihat: .marketfarm price", "marketfarm");
    }

    const user = db.getUser(m.sender);
    if ((user.inventory[cropName] || 0) < qty) {
      return sendReplyWithNav(sock, m, "Stok " + crop.name + " kurang!\nPunya: " + (user.inventory[cropName] || 0) + " | Mau jual: " + qty, "marketfarm");
    }

    const event = market.cropEvents?.[cropName];
    const currentPrice = Math.floor(crop.base * (event ? event.event.modifier : 1.0));
    const totalEarned = currentPrice * qty;

    user.inventory[cropName] -= qty;
    if (user.inventory[cropName] <= 0) delete user.inventory[cropName];
    user.koin = (user.koin || 0) + totalEarned;
    db.save();


    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀  100) + "%\n";
    }
    txt += "\nTotal diterima:   ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "*Daftar terjual:*\n";
    for (const s of soldItems) {
      txt += s + "\n";
    }
    txt += "\n*Total diterima: Rp " + totalEarned.toLocaleString("id-ID") + "*\n";
    txt += "Koin sekarang: Rp " + (user.koin || 0).toLocaleString("id-ID");
    return await sendReplyWithNav(sock, m, txt, "marketfarm");
  }

  return m.reply(claraWrap("Marketfarm", "Perintah tidak valid!\n\nKetik .marketfarm price buat lihat harga."));
}

export { pluginConfig as config, handler, getCurrentPrice };
