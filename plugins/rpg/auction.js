import { getDatabase } from "../../src/lib/nova-database.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "auction",
  alias: ["auction", "lelang", "pasar"],
  category: "rpg",
  description: "Sistem Rumah Lelang untuk menawar item langka dan menjual barang",
  usage: ".auction <list|bid <id> <jumlah>|sell <nama_item> <harga_awal>>",
  example: ".auction bid AUC-101 6000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const DEFAULT_AUCTIONS = [
  {
    id: "AUC-101",
    item: "Excalibur [SSR]",
    seller: "NPC Merchant",
    currentBid: 5000,
    highestBidder: "NPC Arthur",
    endTime: Date.now() + 18 * 3600 * 1000 + 30 * 60 * 1000,
  },
  {
    id: "AUC-102",
    item: "Dragon Scale x5",
    seller: "NPC Hunter",
    currentBid: 2500,
    highestBidder: "NPC Drake",
    endTime: Date.now() + 12 * 3600 * 1000 + 15 * 60 * 1000,
  },
  {
    id: "AUC-103",
    item: "Phoenix Feather",
    seller: "NPC Mage",
    currentBid: 3500,
    highestBidder: "NPC Fawkes",
    endTime: Date.now() + 22 * 3600 * 1000 + 45 * 60 * 1000,
  },
  {
    id: "AUC-104",
    item: "Shadow Dagger [SR]",
    seller: "NPC Rogue",
    currentBid: 4000,
    highestBidder: "NPC Shade",
    endTime: Date.now() + 6 * 3600 * 1000 + 50 * 60 * 1000,
  },
];

function formatTimeRemaining(ms) {
  if (ms <= 0) return "Selesai";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${mins}m`;
}

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();

    // Get global/player auction house data
    let auctionData = (await db.getPlayerData?.("global", "auctions")) || {
      items: DEFAULT_AUCTIONS,
    };

    if (!auctionData.items || auctionData.items.length === 0) {
      auctionData.items = DEFAULT_AUCTIONS;
    }

    // Get user wallet
    let userWallet = (await db.getPlayerData?.(sender, "wallet")) || { gold: 10000 };

    if (subCmd === "list" || !subCmd) {
      let msg = "";
      msg += `Daftar Lelang Aktif Saat Ini:

`;

      auctionData.items.forEach((auc) => {
        const remaining = auc.endTime - Date.now();
        msg += `🏷️ *ID:* \`${auc.id}\`\n`;
        msg += `📦 *Item:* ${auc.item}\n`;
        msg += `👤 *Penjual:* ${auc.seller}\n`;
        msg += `💰 *Tawaran Tertinggi:* ${auc.currentBid} Gold (${auc.highestBidder})\n`;
        msg += `⏱️ *Sisa Waktu:* ${formatTimeRemaining(remaining)}

`;
      });

      msg += `*Cara Bid:* ${m.prefix}auction bid <ID> <jumlah_gold>\n`;
      msg += `*Cara Jual:* ${m.prefix}auction sell <nama_item> <harga_awal>\n`;
      
      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "bid") {
      const targetId = (m.args[1] || "").toUpperCase();
      const bidAmount = parseInt(m.args[2], 10);

      if (!targetId || isNaN(bidAmount) || bidAmount <= 0) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "auction",
            `Format bid tidak valid!\n\nContoh: ${m.prefix}auction bid AUC-101 6000`,
            "error"
          )
        );
      }

      const itemIndex = auctionData.items.findIndex((i) => i.id === targetId);
      if (itemIndex === -1) {
        await m.react('❌');
        return m.reply(novaRpgBox("auction", `Lelang dengan ID \`${targetId}\` tidak ditemukan!`, "error"));
      }

      const targetAuction = auctionData.items[itemIndex];

      if (Date.now() >= targetAuction.endTime) {
        await m.react('❌');
        return m.reply(novaRpgBox("auction", `Lelang \`${targetId}\` sudah berakhir!`, "error"));
      }

      if (bidAmount <= targetAuction.currentBid) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "auction",
            `Tawaran kamu (${bidAmount} Gold) harus lebih tinggi dari tawaran saat ini (${targetAuction.currentBid} Gold)!`,
            "error"
          )
        );
      }

      if ((userWallet.gold || 0) < bidAmount) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "auction",
            `Gold kamu tidak cukup untuk menawar ${bidAmount} Gold!\n\nGold kamu: ${userWallet.gold || 0} Gold`,
            "error"
          )
        );
      }

      // Update auction
      targetAuction.currentBid = bidAmount;
      const senderName = sender.split("@")[0];
      targetAuction.highestBidder = `@${senderName}`;

      await db.setPlayerData?.("global", "auctions", auctionData);

      let msg = "";
      msg += `🎯 Berhasil menawar item lelang!\n`;
      msg += `\n`;
      msg += `🏷️ *ID:* \`${targetAuction.id}\`\n`;
      msg += `📦 *Item:* ${targetAuction.item}\n`;
      msg += `💰 *Tawaran Baru:* ${bidAmount} Gold\n`;
      msg += `👑 *Penawar Tertinggi:* @${senderName}\n`;
      
      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "sell" || subCmd === "jual") {
      const startPrice = parseInt(m.args[m.args.length - 1], 10);
      const itemName = m.args.slice(1, m.args.length - 1).join(" ");

      if (!itemName || isNaN(startPrice) || startPrice <= 0) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "auction",
            `Format penjualan tidak valid!\n\nContoh: ${m.prefix}auction sell Cincin Emas 1000`,
            "error"
          )
        );
      }

      const newId = `AUC-${Math.floor(100 + Math.random() * 900)}`;
      const senderName = sender.split("@")[0];

      const newAuction = {
        id: newId,
        item: itemName,
        seller: `@${senderName}`,
        currentBid: startPrice,
        highestBidder: "Belum Ada",
        endTime: Date.now() + 24 * 3600 * 1000,
      };

      auctionData.items.push(newAuction);
      await db.setPlayerData?.("global", "auctions", auctionData);

      let msg = "";
      msg += `📢 Barang berhasil didaftarkan ke Rumah Lelang!\n`;
      msg += `\n`;
      msg += `🏷️ *ID Lelang:* \`${newId}\`\n`;
      msg += `📦 *Item:* ${itemName}\n`;
      msg += `💰 *Harga Awal:* ${startPrice} Gold\n`;
      msg += `⏱️ *Durasi:* 24 Jam Virtual\n`;
      
      await m.react('🐣');
      return m.reply(msg);
    }

    await m.react('❌');
    return m.reply(
      novaRpgBox(
        "auction",
        `Perintah tidak dikenali!\n\nGunakan:\n• ${m.prefix}auction list\n• ${m.prefix}auction bid <id> <jumlah>\n• ${m.prefix}auction sell <item> <harga_awal>`,
        "guide"
      )
    );
  } catch (err) {
    console.error("auction error:", err);
    await m.react('❌');
    return m.reply(novaRpgBox("auction", err.message || "Terjadi kesalahan pada Rumah Lelang.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
