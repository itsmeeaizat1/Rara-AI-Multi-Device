// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "darkmarket",
  alias: ["pasar Gelap", "darkmarket", "pasargelap", "blackmarket"],
  category: "game",
  description: "Pasar gelap eksklusif premium (stok random tiap 6 jam)",
  usage: ".darkmarket (lihat stok) / .darkmarket buy <item>",
  example: ".darkmarket\n.darkmarket buy crystalmythic",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Pool item darkmarket (langka, harga lebih murah dari shop biasa)
const DARK_ITEMS = [
  { key: "crystalbiasa", name: "Crystal Biasa", emoji: "💎", basePrice: 3000, maxStock: 10 },
  { key: "crystallangka", name: "Crystal Langka", emoji: "🔷", basePrice: 8000, maxStock: 8 },
  { key: "crystalepic", name: "Crystal Epic", emoji: "🟣", basePrice: 20000, maxStock: 6 },
  { key: "crystallegendary", name: "Crystal Legendary", emoji: "🟡", basePrice: 50000, maxStock: 4 },
  { key: "crystalmythic", name: "Crystal Mythic", emoji: "🔴", basePrice: 120000, maxStock: 3 },
  { key: "essencemagic", name: "Essence Magic", emoji: "✨", basePrice: 6000, maxStock: 8 },
  { key: "dragonscale", name: "Dragon Scale", emoji: "🐲", basePrice: 25000, maxStock: 5 },
  { key: "phoenixfeather", name: "Phoenix Feather", emoji: "🔥", basePrice: 40000, maxStock: 4 },
  { key: "soulstone", name: "Soul Stone", emoji: "👻", basePrice: 35000, maxStock: 4 },
  { key: "rarepotion", name: "Rare Potion", emoji: "🧪", basePrice: 500, maxStock: 15 },
  { key: "elixir", name: "Elixir", emoji: "⚗️", basePrice: 3000, maxStock: 10 },
  { key: "mithril", name: "Mithril Ore", emoji: "⚔️", basePrice: 15000, maxStock: 6 },
  { key: "ancientscroll", name: "Ancient Scroll", emoji: "📜", basePrice: 18000, maxStock: 5 },
  { key: "darkorb", name: "Dark Orb", emoji: "🔮", basePrice: 22000, maxStock: 5 },
  { key: "holywater", name: "Holy Water", emoji: "💧", basePrice: 2500, maxStock: 12 },
];

// Discount range: 20% - 60% cheaper than base price
const MIN_DISCOUNT = 0.4; // 60% of base (40% off)
const MAX_DISCOUNT = 0.8; // 80% of base (20% off)

// Restock interval: 6 jam
const RESTOCK_INTERVAL = 6 * 60 * 60 * 1000;

function getRestockKey() {
  return Math.floor(Date.now() / RESTOCK_INTERVAL);
}

function generateStock() {
  const key = getRestockKey();
  const stock = {};

  // Pilih 8-10 item random dari pool
  const itemCount = 8 + Math.floor(Math.random() * 3); // 8-10
  const shuffled = [...DARK_ITEMS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, itemCount);

  for (const item of selected) {
    const stockQty = 1 + Math.floor(Math.random() * item.maxStock);
    const discount = MIN_DISCOUNT + Math.random() * (MAX_DISCOUNT - MIN_DISCOUNT);
    const price = Math.floor(item.basePrice * discount);

    stock[item.key] = {
      ...item,
      stockQty,
      price,
      originalPrice: item.basePrice,
      discount: Math.round((1 - discount) * 100),
    };
  }

  return stock;
}

function getMarketState(db) {
  if (!db.db.data.darkmarket) db.db.data.darkmarket = {};
  const market = db.db.data.darkmarket;
  const currentKey = getRestockKey();

  if (market.restockKey !== currentKey) {
    market.restockKey = currentKey;
    market.stock = generateStock();
    market.restockAt = (currentKey + 1) * RESTOCK_INTERVAL;
    db.save();
  }

  if (!market.stock) {
    market.stock = generateStock();
    market.restockAt = (currentKey + 1) * RESTOCK_INTERVAL;
    db.save();
  }

  return market;
}

function timeUntilRestock(restockAt) {
  const diff = restockAt - Date.now();
  if (diff <= 0) return "Restock segera";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}j ${m}m ${s}d`;
}

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];

  if (!user.inventory) user.inventory = {};

  const market = getMarketState(db);
  const stock = market.stock || {};
  const subCmd = args[0]?.toLowerCase();

  // Buy
  if (subCmd === "buy" || subCmd === "beli") {
    const itemKey = args[1]?.toLowerCase();
    const qty = Math.max(1, parseInt(args[2]) || 1);

    if (!itemKey) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Dark Market", [`Sebut nama item!`,
          `Contoh: \`${prefix}darkmarket buy crystalbiasa 5\``].join("\n")) + "\n\n" + tipText(`Ketik \`${prefix}darkmarket\` buat lihat stok`),
        "darkmarket"
      );
    }

    const item = stock[itemKey];
    if (!item) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Dark Market", [`Item tidak tersedia di dark market`,
          `Atau stok sudah habis`].join("\n")) + "\n\n" + tipText(`Stok berubah tiap 6 jam. Cek \`${prefix}darkmarket\``),
        "darkmarket"
      );
    }

    if (item.stockQty <= 0) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Dark Market", [`${item.emoji} *${item.name}*`,
          `Stok sudah habis untuk periode ini`].join("\n")) + "\n\n" + tipText(`Restock dalam: ${timeUntilRestock(market.restockAt)}`),
        "darkmarket"
      );
    }

    if (qty > item.stockQty) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Dark Market", [`${item.emoji} *${item.name}*`,
          `Stok tersedia: *${item.stockQty}*`,
          `Kamu mau beli: *${qty}*`].join("\n")) + "\n\n" + tipText(`Maksimal beli ${item.stockQty} pcs`),
        "darkmarket"
      );
    }

    const totalPrice = item.price * qty;
    if ((user.koin || 0) < totalPrice) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Dark Market", [`${item.emoji} *${item.name}* x${qty}`,
          `Harga: *${totalPrice.toLocaleString("id-ID")}*`,
          `Gold kamu: *${(user.koin || 0).toLocaleString("id-ID")}*`,
          `Kurang: *${(totalPrice - (user.koin || 0)).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" + tipText(`Kumpulin gold lewat \`${prefix}hunt\` atau \`${prefix}daily\``),
        "darkmarket"
      );
    }

    // Execute purchase
    user.koin = (user.koin || 0) - totalPrice;
    const invKey = item.name.replace(/\s/g, "");
    user.inventory[invKey] = (user.inventory[invKey] || 0) + qty;
    stock[itemKey].stockQty -= qty;

    db.save();

    await m.react("✅");

    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Dark Market", [`  ┊  ➶ Item: *${item.emoji} ${item.name}*`,
        `  ┊  ➶ Jumlah: *${qty} pcs*`,
        `  ┊  ➶ Harga/pcs: *${item.price.toLocaleString("id-ID")}*`,
        `  ┊  ➶ Total: *-${totalPrice.toLocaleString("id-ID")}*`,
        `  ┊  ➶ Discount: *${item.discount}% off*`,
        `  ┊  ➶ Sisa stok: *${stock[itemKey].stockQty} pcs*`,
        `  ┊  ➶ Gold tersisa: *${user.koin.toLocaleString("id-ID")}*`].join("\n")) + "\n" +
      tipText(`Item masuk inventory. Cek \`${prefix}inventory\``) + "\n" +
      tipText(`Restock dalam: ${timeUntilRestock(market.restockAt)}`),
      "darkmarket"
    );
  }

  // Show market
  let text =
    claraWrap("Dark Market", [`  ┊  ➶ Eksklusif: *Premium only*`,
      `  ┊  ➶ Stok random tiap: *6 jam*`,
      `  ┊  ➶ Restock dalam: *${timeUntilRestock(market.restockAt)}*`,
      `  ┊  ➶ Gold kamu: *${(user.koin || 0).toLocaleString("id-ID")}*`].join("\n")) + "\n" +
    "STOK HARI INI:\n\n";

  const stockList = Object.values(stock);
  if (stockList.length === 0) {
    text += "> Stok kosong. Tunggu restock.\n";
  } else {
    for (const item of stockList) {
      const stockBar = item.stockQty > 0
        ? `${item.stockQty} pcs`
        : "HABIS";
      text += `${item.emoji} *${item.name}*\n`;
      text += `Harga: *${item.price.toLocaleString("id-ID")}* (~${item.discount}% off)\n`;
      text += `Stok: *${stockBar}*\n`;
      text += `Beli: \`${prefix}darkmarket buy ${item.key}\`\n\n`;
    }
  }

  text +=
    separator("━", 22) + "\n" +
    tipText(`Beli: \`${prefix}darkmarket buy <item> [qty]\``) + "\n" +
    tipText(`Stok & harga berubah tiap 6 jam!`);

  return sendReplyWithNav(sock, m, text, "darkmarket");
}

export { pluginConfig as config, handler };
