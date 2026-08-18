// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "grupshop",
  aliases: ["grupshop", "gshop", "grupstore"],
  category: "group",
  description: "Mini economy grup: koin dari aktivitas, tukar badge/privilege",
  usage: ".grupshop | .grupshop buy <id> | .grupshop add <item> <price> <type> | .grupshop coins | .grupshop leaderboard",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();
    const isOwner = conn.user?.jid?.split("@")[0] === sender.split("@")[0] || m.isOwner;

    if (!db.data.grupShop) db.data.grupShop = {};
    if (!db.data.grupShop[groupId]) {
      db.data.grupShop[groupId] = {
        items: [
          { id: 1, name: "Custom Badge", price: 50, type: "badge", desc: "Badge custom di profil grup" },
          { id: 2, name: "Custom Title", price: 100, type: "title", desc: "Title custom di grup" },
          { id: 3, name: "Skip Anti-Link 1x", price: 150, type: "privilege", desc: "Bebas kena anti-link 1 kali" },
          { id: 4, name: "VIP Color Name", price: 200, type: "cosmetic", desc: "Warna nama special di grup" },
          { id: 5, name: "Immunity Mute 1h", price: 300, type: "privilege", desc: "Kebal dari mute 1 jam" },
        ],
        wallet: {},
        pendingId: 6,
      };
      await db.save();
    }

    const shop = db.data.grupShop[groupId];

    if (!shop.wallet[sender]) {
      shop.wallet[sender] = { coins: 0, badges: [], titles: [], privileges: [] };
      await db.save();
    }

    const wallet = shop.wallet[sender];

    if (sub === "coins" || sub === "balance") {
      return m.reply(claraWrap("Group Shop", [
        `Wallet: @${sender.split("@")[0]}`,
        `Koin: ${wallet.coins}`,
        `Badge: ${wallet.badges.length > 0 ? wallet.badges.join(", ") : "Belum ada"}`,
        `Title: ${wallet.titles.length > 0 ? wallet.titles.join(", ") : "Belum ada"}`,
        `Privilege: ${wallet.privileges.length > 0 ? wallet.privileges.join(", ") : "Belum ada"}`,
        "",
        `Dapat koin dari: chat aktif, bantu member, menang game`,
      ].join("\n")));
    }

    if (sub === "buy") {
      const itemId = parseInt(args[1]);
      if (!itemId) return m.reply(`Cara: ${usedPrefix}grupshop buy <id>`);
      const item = shop.items.find(i => i.id === itemId);
      if (!item) return m.reply(`Item ID ${itemId} tidak ditemukan.`);
      if (wallet.coins < item.price) return m.reply(`Koin kurang! Butuh ${item.price}, kamu punya ${wallet.coins}.`);
      wallet.coins -= item.price;
      if (item.type === "badge") wallet.badges.push(item.name);
      else if (item.type === "title") wallet.titles.push(item.name);
      else if (item.type === "privilege") wallet.privileges.push(item.name);
      else wallet.badges.push(item.name);
      await db.save();
      return m.reply(claraWrap("Group Shop", [
        `Berhasil membeli!`,
        `Item: ${item.name}`,
        `Harga: ${item.price} koin`,
        `Sisa koin: ${wallet.coins}`,
      ].join("\n")));
    }

    if (sub === "add" && isOwner) {
      const itemName = args.slice(1, -2).join(" ").trim();
      const price = parseInt(args[args.length - 2]);
      const type = (args[args.length - 1] || "").toLowerCase();
      if (!itemName || !price || !type) {
        return m.reply(`Cara: ${usedPrefix}grupshop add <item> <price> <type>\nType: badge, title, privilege, cosmetic`);
      }
      const newId = shop.pendingId++;
      shop.items.push({ id: newId, name: itemName, price, type, desc: "Custom item" });
      await db.save();
      return m.reply(claraWrap("Group Shop", `Item ditambahkan: ${itemName} (${price} koin, type: ${type}, ID: ${newId})`));
    }

    if (sub === "leaderboard") {
      const sorted = Object.entries(shop.wallet)
        .sort((a, b) => (b[1].coins || 0) - (a[1].coins || 0))
        .slice(0, 10);
      if (sorted.length === 0) return m.reply(claraWrap("Group Shop", "Belum ada member dengan koin."));
      const lb = sorted.map(([jid, w], i) => `${i + 1}. @${jid.split("@")[0]} - ${w.coins} koin`).join("\n");
      return m.reply(claraWrap("Group Shop", `Top Coin Holders:\n\n${lb}`));
    }

    if (sub === "give" && isOwner) {
      const target = m.mentionedJid?.[0] || args[1]?.replace(/[@.]/g, "") + "@s.whatsapp.net";
      const amount = parseInt(args[2]);
      if (!target || !amount) return m.reply(`Cara: ${usedPrefix}grupshop give @user <amount>`);
      if (!shop.wallet[target]) shop.wallet[target] = { coins: 0, badges: [], titles: [], privileges: [] };
      shop.wallet[target].coins += amount;
      await db.save();
      return m.reply(claraWrap("Group Shop", `Berhasil kasih ${amount} koin ke @${target.split("@")[0]}`));
    }

    const itemList = shop.items.map(i => `${i.id}. ${i.name} - ${i.price} koin (${i.type})`).join("\n");
    return m.reply(claraWrap("Group Shop", [
      `Group Shop - ${groupId.split("@")[0]}`,
      `Koin kamu: ${wallet.coins}`,
      "",
      "Item Tersedia:",
      itemList,
      "",
      `Command:`,
      `${usedPrefix}grupshop buy <id>`,
      `${usedPrefix}grupshop coins`,
      `${usedPrefix}grupshop leaderboard`,
      isOwner ? `${usedPrefix}grupshop add <item> <price> <type>` : "",
      isOwner ? `${usedPrefix}grupshop give @user <amount>` : "",
    ].filter(Boolean).join("\n")));
  } catch (e) {
    console.error("grupshop error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
