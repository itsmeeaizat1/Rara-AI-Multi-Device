// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Auction — Lelang item langka, bid melawan NPC, menang = item murah
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgauction",
  alias: ["auction", "lelang", "rpglelang", "rpgbid"],
  category: "rpg",
  description: "RPG Auction — lelang item langka, bid melawan NPC, menang dapat item murah!",
  usage: ".rpgauction | .rpgauction list | .rpgauction bid <nomor> <harga>",
  example: ".rpgauction\n.rpgauction bid 1 5000",
  isGroup: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const AUCTION_ITEMS = [
  { name: "Pedang Legendaris Excalibur", rarity: "Mythic", basePrice: 5000, stat: "Attack +50", desc: "Pedang suci yang bersinar dalam gelap." },
  { name: "Armor Dragon Scale", rarity: "Legendary", basePrice: 3000, stat: "Defense +40", desc: "Baju zirah dari sisik naga merah." },
  { name: "Boots of Hermes", rarity: "Epic", basePrice: 2000, stat: "Speed +30", desc: "Sepatu terbang dari dewa Hermes." },
  { name: "Amulet of Phoenix", rarity: "Legendary", basePrice: 3500, stat: "HP +200", desc: "Jimat kebangkitan phoenix." },
  { name: "Ring of Wisdom", rarity: "Epic", basePrice: 2500, stat: "EXP +20%", desc: "Cincin yang menambah EXP." },
  { name: "Crystal Staff", rarity: "Epic", basePrice: 2200, stat: "Mana +50", desc: "Tongkat kristal penambah mana." },
  { name: "Dark Cloak", rarity: "Rare", basePrice: 800, stat: "Defense +15", desc: "Jubah gelap penambah pertahanan." },
  { name: "Lucky Charm", rarity: "Rare", basePrice: 600, stat: "Luck +10%", desc: "Jimat keberuntungan." },
  { name: "Iron Helmet", rarity: "Rare", basePrice: 500, stat: "Defense +10", desc: "Helm besi kokoh." },
  { name: "Health Ring", rarity: "Common", basePrice: 200, stat: "HP +50", desc: "Cincin kesehatan dasar." },
];

const NPC_NAMES = ["Merchant Aldo", "Collector Mira", "Trader Budi", "Noble Sasuke", "Adventurer Rina"];

let currentAuctions = {};

function generateAuction() {
  const item = AUCTION_ITEMS[Math.floor(Math.random() * AUCTION_ITEMS.length)];
  const npc = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
  const npcBudget = Math.floor(item.basePrice * (1.2 + Math.random() * 0.8)); // NPC willing to pay up to 1.2x-2x
  return {
    item,
    npc,
    npcBudget,
    currentBid: item.basePrice,
    currentBidder: null,
    bids: 0,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // Generate auction if none exists
    if (!currentAuctions[sender] || currentAuctions[sender].expires < Date.now()) {
      currentAuctions[sender] = generateAuction();
    }
    const auction = currentAuctions[sender];

    // LIST
    if (sub === "list" || sub === "daftar" || sub === "" || sub === "cek") {
      const timeLeft = Math.max(0, Math.ceil((auction.expires - Date.now()) / 1000));
      let lines = [
        "RPG AUCTION HOUSE",
        "",
        "Item: " + auction.item.name,
        "Rarity: " + auction.item.rarity,
        "Stat: " + auction.item.stat,
        "Deskripsi: " + auction.item.desc,
        "",
        "Harga awal: " + auction.item.basePrice + " koin",
        "Bid sekarang: " + auction.currentBid + " koin",
        "Pembidik: " + (auction.currentBidder ? "Kamu" : auction.npc + " (NPC)"),
        "Total bid: " + auction.bids,
        "",
        "NPC Bersaing: " + auction.npc,
        "Waktu tersisa: " + Math.floor(timeLeft / 60) + "m " + (timeLeft % 60) + "s",
        "",
        "Ketik: .rpgauction bid <harga>",
        "Contoh: .rpgauction bid " + (auction.currentBid + 500),
        "",
        "Koin kamu: " + (user.koin || 0),
      ];
      return m.reply(claraWrap("RPG Auction", lines));
    }

    // BID
    if (sub === "bid" || sub === "tawar") {
      const bidAmount = parseInt(args[1]);
      if (isNaN(bidAmount) || bidAmount <= 0) {
        return m.reply(claraWrap("RPG Auction", "Masukkan harga yang valid!\nContoh: .rpgauction bid " + (auction.currentBid + 500)));
      }
      if (bidAmount <= auction.currentBid) {
        return m.reply(claraWrap("RPG Auction", "Bid harus lebih tinggi dari " + auction.currentBid + " koin!"));
      }
      if (bidAmount > (user.koin || 0)) {
        return m.reply(claraWrap("RPG Auction", "Koin tidak cukup! Kamu punya " + (user.koin || 0) + " koin."));
      }

      // NPC counter-bid
      auction.bids++;

      if (bidAmount >= auction.npcBudget) {
        // NPC gives up, user wins
        user.koin = (user.koin || 0) - bidAmount;
        if (!user.auctionItems) user.auctionItems = [];
        user.auctionItems.push({ ...auction.item, buyPrice: bidAmount, date: Date.now() });
        user.auctionWins = (user.auctionWins || 0) + 1;
        user.auctionSpent = (user.auctionSpent || 0) + bidAmount;
        db.data.users[sender] = user;
        await db.save();

        const wonItem = auction.item;
        delete currentAuctions[sender];

        return m.reply(claraWrap("RPG Auction", [
          "LELANG DIMENANGKAN!",
          "",
          "Item: " + wonItem.name,
          "Rarity: " + wonItem.rarity,
          "Stat: " + wonItem.stat,
          "Harga menang: " + bidAmount + " koin",
          "NPC " + auction.npc + " menyerah!",
          "",
          "Item tersimpan di inventory.",
          "Ketik .rpgauction untuk lelang baru!",
        ], "success"));
      } else {
        // NPC counters
        auction.currentBid = Math.min(auction.npcBudget, bidAmount + Math.floor(auction.item.basePrice * 0.2));
        auction.currentBidder = auction.npc;
        auction.bids++;

        return m.reply(claraWrap("RPG Auction", [
          "BID DIKIRIM!",
          "",
          "Bid kamu: " + bidAmount + " koin",
          auction.npc + " counter-bid: " + auction.currentBid + " koin!",
          "",
          "Bid sekarang: " + auction.currentBid + " koin",
          "Pembidik: " + auction.npc,
          "",
          "Ketik: .rpgauction bid " + (auction.currentBid + Math.floor(auction.item.basePrice * 0.2)),
          "Koin kamu: " + (user.koin || 0),
        ], "warn"));
      }
    }

    // MY ITEMS
    if (sub === "items" || sub === "milik") {
      const items = user.auctionItems || [];
      if (items.length === 0) {
        return m.reply(claraWrap("RPG Auction", "Belum punya item dari lelang. Ketik .rpgauction untuk mulai!"));
      }
      let lines = ["Item Lelang Kamu (" + items.length + "):", ""];
      items.forEach((item, i) => {
        lines.push((i + 1) + ". " + item.name + " [" + item.rarity + "]");
        lines.push("   " + item.stat + " | Beli: " + item.buyPrice + " koin");
      });
      return m.reply(claraWrap("RPG Auction", lines));
    }

    // HELP
    return m.reply(claraWrap("RPG Auction", [
      "Lelang item langka melawan NPC",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgauction — Lihat lelang sekarang",
      usedPrefix + "rpgauction bid <harga> — Bid harga",
      usedPrefix + "rpgauction items — Lihat item yang dimenangkan",
      "",
      "NPC akan counter-bid sampai mereka kehabisan budget!",
      "Taktik: bid tinggi langsung untuk bikin NPC surrender!",
    ]));
  } catch (e) {
    console.error("[RPG Auction]", e);
    m.reply(claraWrap("RPG Auction", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
