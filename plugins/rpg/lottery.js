import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animLottery } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "lottery",
  alias: ["lottery", "Lotre", "undian"],
  category: "rpg",
  description: "Sistem Kupon Lotre Kerajaan untuk memenangkan total kumpulan hadiah",
  usage: ".lottery <buy [jumlah]|info|draw>",
  example: ".lottery buy 5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();
    const ticketPrice = 100;

    // Load global lottery pool data
    let lottery = (await db.getPlayerData?.("global", "lottery")) || {
      tickets: [],
      totalSales: 0,
    };

    if (!Array.isArray(lottery.tickets)) lottery.tickets = [];

    // Load user gold
    let userWallet = (await db.getPlayerData?.(sender, "wallet")) || { gold: 1000 };
    if (typeof userWallet.gold !== "number") userWallet.gold = 1000;

    if (subCmd === "info" || !subCmd) {
      const totalTickets = lottery.tickets.length;
      const totalRevenue = totalTickets * ticketPrice;
      const prizePool = Math.floor(totalRevenue * 0.7);
      const myTickets = lottery.tickets.filter((t) => t.sender === sender).length;

      await m.react('🐣');
      return m.reply(claraWrap("lottery", [
        `Harga tiket : ${ticketPrice} Gold`,
        `Tiket terjual : ${totalTickets}`,
        `Total hadiah (70%) : ${prizePool} Gold`,
        `Tiket milikmu : ${myTickets}`,
        "---",
        `📌 ${m.prefix}lottery buy <jumlah_tiket> — beli tiket`,
      ], "info"));
    }

    if (subCmd === "buy" || subCmd === "beli") {
      const count = parseInt(m.args[1] || "1", 10);
      if (isNaN(count) || count <= 0) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "lottery",
            `Jumlah tiket tidak valid!\n\nContoh: ${m.prefix}lottery buy 5`,
            "error"
          )
        );
      }

      const totalCost = count * ticketPrice;
      if (userWallet.gold < totalCost) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "lottery",
            `Gold kamu tidak cukup untuk membeli ${count} tiket!\n\nBiaya: ${totalCost} Gold | Gold Kamu: ${userWallet.gold} Gold`,
            "error"
          )
        );
      }

      // Deduct cost and record tickets
      userWallet.gold -= totalCost;
      for (let i = 0; i < count; i++) {
        lottery.tickets.push({ sender });
      }
      lottery.totalSales = (lottery.totalSales || 0) + totalCost;

      await animLottery(m, sock, count);
      await db.setPlayerData?.("global", "lottery", lottery);
      await db.setPlayerData?.(sender, "wallet", userWallet);

      const myTickets = lottery.tickets.filter((t) => t.sender === sender).length;

      await m.react('🐣');
      return m.reply([
        `*Berhasil membeli ${count} tiket lotre!*`,
        "",
        `Total biaya : -${totalCost} Gold`,
        `Tiket kamu sekarang : ${myTickets}`,
        `Sisa gold : ${userWallet.gold} Gold`,
      ].join("\n"));
    }

    if (subCmd === "draw" || subCmd === "undak") {
      if (!m.isOwner) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "lottery",
            "Hanya Owner bot yang dapat melakukan pengundian pemenang lotre!",
            "error"
          )
        );
      }

      if (lottery.tickets.length === 0) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "lottery",
            "Belum ada tiket lotre yang dibeli oleh pemain!",
            "error"
          )
        );
      }

      const totalTickets = lottery.tickets.length;
      const totalRevenue = totalTickets * ticketPrice;
      const prizePool = Math.floor(totalRevenue * 0.7);

      // Pick random winner
      const winningIndex = Math.floor(Math.random() * totalTickets);
      const winnerTicket = lottery.tickets[winningIndex];
      const winnerSender = winnerTicket.sender;
      const winnerName = winnerSender.split("@")[0];

      // Reset pool
      lottery.tickets = [];
      lottery.totalSales = 0;

      await db.setPlayerData?.("global", "lottery", lottery);

      // Give prize to winner
      let winnerWallet = (await db.getPlayerData?.(winnerSender, "wallet")) || { gold: 0 };
      winnerWallet.gold = (winnerWallet.gold || 0) + prizePool;
      await db.setPlayerData?.(winnerSender, "wallet", winnerWallet);

      await m.react('🐣');
      return m.reply([
        "*PENGUNDIAN LOTRE SAKRAL*",
        "",
        `Total tiket terundi : ${totalTickets}`,
        `Total hadiah : ${prizePool} Gold`,
        `Pemenang utama : @${winnerName}`,
        "",
        "Selamat kepada pemenang! Hadiah telah dikirim ke dompet.",
      ].join("\n"), { mentions: [winnerSender] });
    }

    await m.react('❌');
    return m.reply(
      claraWrap(
        "lottery",
        `Perintah tidak dikenal!\n\nGunakan:\n• ${m.prefix}lottery info\n• ${m.prefix}lottery buy <jumlah>\n• ${m.prefix}lottery draw (Owner Only)`,
        "guide"
      )
    );
  } catch (err) {
    console.error("lottery error:", err);
    await m.react('❌');
    return m.reply(claraWrap("lottery", err.message || "Terjadi kesalahan pada Lotre.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
