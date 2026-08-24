// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "lelang",
  alias: ["lelanggrp", "auctiongrp"],
  category: "group",
  description: "Sistem lelang di grup - buat, bid, tutup lelang",
  usage: ".lelang <create/bid/list/info/close/cancel/history>",
  example: ".lelang create jam tangan | 50000 | 30m",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Generate unique auction ID
function generateAuctionId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "LNG-";
  for (let i = 0; i < 5; i++)
    id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// Parse duration string: 30s, 15m, 2h, 1d
function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[unit] || 0);
}

function formatDuration(ms) {
  if (ms <= 0) return "0 detik";
  if (ms < 60000) return Math.floor(ms / 1000) + " detik";
  if (ms < 3600000) return Math.floor(ms / 60000) + " menit";
  if (ms < 86400000) return Math.floor(ms / 3600000) + " jam";
  return Math.floor(ms / 86400000) + " hari";
}

function formatRupiah(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function formatTime(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return dd + "/" + mm + "/" + yyyy + " " + hh + ":" + mi;
}

// Format countdown from remaining ms
function formatCountdown(ms) {
  if (ms <= 0) return "Berakhir";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return h + "j " + m + "m " + s + "d";
  if (m > 0) return m + "m " + s + "d";
  return s + "d";
}

// Get active auctions for a group
function getGroupAuctions(db, groupId) {
  const all = db.setting("auctions") || {};
  const result = {};
  for (const [id, auction] of Object.entries(all)) {
    if (auction.chatId === groupId && !auction.ended && !auction.cancelled) {
      result[id] = auction;
    }
  }
  return result;
}

// Auto-close expired auctions
function autoCloseExpired(db, sock) {
  const all = db.setting("auctions") || {};
  const now = Date.now();
  let changed = false;

  for (const [id, auction] of Object.entries(all)) {
    if (!auction.ended && !auction.cancelled && now >= auction.endTime) {
      auction.ended = true;
      auction.closedAt = now;
      changed = true;

      if (auction.bids.length > 0) {
        const winner = auction.bids[auction.bids.length - 1];
        auction.winner = winner;
        const winnerText =
          "🏆 *LELANG BERAKHIR*\n\n" +
          "╭┈┈「 📋 *Info* 」\n" +
          "  ┊  ➶ Item: *" + auction.title + "*\n" +
          "  ┊  ➶ ID: `" + id + "`\n" +
          "  ┊  ➶ Pemenang: @" + winner.bidder.split("@")[0] + "\n" +
          "  ┊  ➶ Bid Terakhir: *" + formatRupiah(winner.amount) + "*\n" +
          "  ┊  ➶ Total Bid: " + auction.bids.length + "\n" +
          "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n\n" +
          "  ┊  ➶ Hubungi penjual untuk penyerahan barang";

        sock.sendMessage(auction.chatId, {
          text: winnerText,
          contextInfo: { mentionedJid: [winner.bidder] },
        }).catch((e) => { console.error('[lelang.js]:', e.message); });
      } else {
        sock.sendMessage(auction.chatId, {
          text:
            "😔 *LELANG BERAKHIR*\n\n" +
            "╭┈┈「 📋 *Info* 」\n" +
            "  ┊  ➶ Item: *" + auction.title + "*\n" +
            "  ┊  ➶ ID: `" + id + "`\n" +
            "  ┊  ➶ Total Bid: 0\n" +
            "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n\n" +
            "  ┊  ➶ Lelang berakhir tanpa peserta",
        }).catch((e) => { console.error('[lelang.js]:', e.message); });
      }
    }
  }

  if (changed) {
    db.setting("auctions", all);
    db.save();
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const gid = m.chat || m.key?.remoteJid || "";

    // Auto-close expired auctions on every call
    autoCloseExpired(db, sock);

    // --- CREATE AUCTION ---
    if (action === "create") {
      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isGroupAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.sender === botConfig.owner?.[0] || m.isOwner;
      if (!isGroupAdmin && !isOwner) {
        return m.reply(claraWrap("Lelang", "Hanya admin grup yg bisa membuat lelang!"));
      }

      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 3) {
        return m.reply(
          prefix + "lelang create <judul> | <harga awal> | <durasi>\n\n" +
          "Contoh: " + prefix + "lelang create jam tangan | 50000 | 30m\n\n" +
          "Durasi: 30s / 15m / 2h / 1d",
          { title: "Lelang - Create" }
        );
      }

      const [title, priceStr, durStr] = parts;
      const startPrice = parseInt(priceStr.replace(/[^\d]/g, ""));
      if (isNaN(startPrice) || startPrice < 100) {
        return m.reply(claraWrap("Lelang", "Harga awal minimal Rp100"));
      }

      const duration = parseDuration(durStr);
      if (!duration || duration < 10000) {
        return m.reply(claraWrap("Lelang", "Durasi minimal 10 detik (10s)"));
      }

      const auctionId = generateAuctionId();
      const now = Date.now();
      const auction = {
        auctionId,
        chatId: gid,
        title,
        startPrice,
        minIncrement: Math.max(1000, Math.floor(startPrice * 0.05)),
        endTime: now + duration,
        duration,
        createdBy: m.sender,
        createdAt: now,
        bids: [],
        ended: false,
        cancelled: false,
        winner: null,
        closedAt: null,
      };

      const all = db.setting("auctions") || {};
      all[auctionId] = auction;
      db.setting("auctions", all);
      db.save();

      const countdown = formatCountdown(duration);
      const text =
        "Item: *" + title + "*\n" +
        "Harga Awal: *" + formatRupiah(startPrice) + "*\n" +
        "Min Increment: *" + formatRupiah(auction.minIncrement) + "*\n" +
        "Durasi: " + formatDuration(duration) + "\n" +
        "Berakhir: " + formatTime(auction.endTime) + "\n" +
        "ID: `" + auctionId + "`\n" +
        "Dibuat oleh: @" + m.sender.split("@")[0] + "\n\n" +
        "Ketik: " + prefix + "lelang bid " + auctionId + " <harga>";

      await m.react("🐣");
      return m.reply(claraWrap("Lelang", text));
    }

    // --- BID ---
    if (action === "bid") {
      const auctionId = args[1]?.toUpperCase();
      const bidAmount = parseInt((args[2] || "").replace(/[^\d]/g, ""));

      if (!auctionId || isNaN(bidAmount)) {
        return m.reply(claraWrap("Lelang", "Format: " + prefix + "lelang bid <ID> <harga>\nContoh: " + prefix + "lelang bid LNG-ABC12 60000"));
      }

      const all = db.setting("auctions") || {};
      const auction = all[auctionId];
      if (!auction) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` tidak ditemukan"));
      }
      if (auction.ended) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah berakhir"));
      }
      if (auction.cancelled) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah dibatalkan"));
      }
      if (auction.chatId !== gid) {
        return m.reply(claraWrap("Lelang", "Lelang ini bukan di grup ini"));
      }
      if (auction.createdBy === m.sender) {
        return m.reply(claraWrap("Lelang", "Kamu tidak bisa bid di lelang sendiri"));
      }

      const remaining = auction.endTime - Date.now();
      if (remaining <= 0) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah berakhir"));
      }

      const currentHighest = auction.bids.length > 0
        ? auction.bids[auction.bids.length - 1].amount
        : auction.startPrice;

      if (bidAmount < currentHighest + auction.minIncrement) {
        return m.reply(claraWrap("Lelang",
          "Bid terlalu rendah!\n" +
          "Bid saat ini: *" + formatRupiah(currentHighest) + "*\n" +
          "Min bid: *" + formatRupiah(currentHighest + auction.minIncrement) + "*"
        ));
      }

      const lastBidder = auction.bids.length > 0
        ? auction.bids[auction.bids.length - 1].bidder
        : null;
      if (lastBidder === m.sender) {
        return m.reply(claraWrap("Lelang", "Kamu sudah bid tertinggi. Tunggu orang lain bid."));
      }

      // Anti-snipe: extend by 30s if bid in last 30s
      let extraNote = "";
      if (remaining < 30000) {
        auction.endTime += 30000;
        extraNote = "\nAnti-snipe: durasi +30 detik!";
      }

      auction.bids.push({
        bidder: m.sender,
        amount: bidAmount,
        time: Date.now(),
      });

      all[auctionId] = auction;
      db.setting("auctions", all);
      db.save();

      const newRemaining = formatCountdown(auction.endTime - Date.now());
      await m.react("🐣");
      return m.reply(claraWrap("Lelang",
        "Bid diterima!\n" +
        "Item: *" + auction.title + "*\n" +
        "Bid: *" + formatRupiah(bidAmount) + "*\n" +
        "Oleh: @" + m.sender.split("@")[0] + "\n" +
        "Sisa waktu: " + newRemaining + "\n" +
        "Total bid: " + auction.bids.length + extraNote
      ));
    }

    // --- LIST ---
    if (action === "list") {
      const groupAuctions = getGroupAuctions(db, gid);
      const ids = Object.keys(groupAuctions);

      if (ids.length === 0) {
        return m.reply(claraWrap("Lelang", "Belum ada lelang aktif di grup ini.\nBuat: " + prefix + "lelang create <judul> | <harga> | <durasi>"));
      }

      let lines = [];
      for (const [id, auction] of Object.entries(groupAuctions)) {
        const remaining = formatCountdown(auction.endTime - Date.now());
        const highest = auction.bids.length > 0
          ? formatRupiah(auction.bids[auction.bids.length - 1].amount)
          : formatRupiah(auction.startPrice);
        lines.push(id + " | " + auction.title + " | " + highest + " | " + remaining + " | " + auction.bids.length + " bid");
      }

      return m.reply(claraWrap("Lelang Aktif", lines.join("\n")));
    }

    // --- INFO ---
    if (action === "info") {
      const auctionId = args[1]?.toUpperCase();
      if (!auctionId) {
        return m.reply(claraWrap("Lelang", "Format: " + prefix + "lelang info <ID>"));
      }

      const all = db.setting("auctions") || {};
      const auction = all[auctionId];
      if (!auction) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` tidak ditemukan"));
      }

      const remaining = formatCountdown(auction.endTime - Date.now());
      const status = auction.cancelled ? "Dibatalkan" : auction.ended ? "Berakhir" : "Aktif";
      const highest = auction.bids.length > 0
        ? formatRupiah(auction.bids[auction.bids.length - 1].amount)
        : formatRupiah(auction.startPrice);

      let lines = [
        "Item: *" + auction.title + "*",
        "ID: `" + auctionId + "`",
        "Status: " + status,
        "Harga Awal: " + formatRupiah(auction.startPrice),
        "Min Increment: " + formatRupiah(auction.minIncrement),
        "Bid Tertinggi: *" + highest + "*",
        "Total Bid: " + auction.bids.length,
        "Sisa Waktu: " + remaining,
        "Berakhir: " + formatTime(auction.endTime),
        "Dibuat oleh: @" + auction.createdBy.split("@")[0],
      ];

      if (auction.ended && auction.winner) {
        lines.push("Pemenang: @" + auction.winner.bidder.split("@")[0]);
        lines.push("Bid Menang: *" + formatRupiah(auction.winner.amount) + "*");
      }

      if (auction.bids.length > 0 && auction.bids.length <= 10) {
        lines.push("");
        lines.push("Riwayat Bid:");
        auction.bids.forEach((b, i) => {
          lines.push((i + 1) + ". @" + b.bidder.split("@")[0] + " - " + formatRupiah(b.amount));
        });
      }

      return m.reply(claraWrap("Lelang Info", lines.join("\n")));
    }

    // --- CLOSE (manual close by admin) ---
    if (action === "close") {
      const auctionId = args[1]?.toUpperCase();
      if (!auctionId) {
        return m.reply(claraWrap("Lelang", "Format: " + prefix + "lelang close <ID>"));
      }

      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isGroupAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.sender === botConfig.owner?.[0] || m.isOwner;
      if (!isGroupAdmin && !isOwner) {
        return m.reply(claraWrap("Lelang", "Hanya admin yg bisa menutup lelang"));
      }

      const all = db.setting("auctions") || {};
      const auction = all[auctionId];
      if (!auction) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` tidak ditemukan"));
      }
      if (auction.ended) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah berakhir"));
      }
      if (auction.cancelled) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah dibatalkan"));
      }

      auction.ended = true;
      auction.closedAt = Date.now();

      if (auction.bids.length > 0) {
        const winner = auction.bids[auction.bids.length - 1];
        auction.winner = winner;
        all[auctionId] = auction;
        db.setting("auctions", all);
        db.save();

        await m.react("🐣");
        return m.reply(claraWrap("Lelang Ditutup",
          "Lelang *" + auction.title + "* ditutup!\n" +
          "Pemenang: @" + winner.bidder.split("@")[0] + "\n" +
          "Bid Menang: *" + formatRupiah(winner.amount) + "*\n" +
          "Total Bid: " + auction.bids.length
        ));
      } else {
        all[auctionId] = auction;
        db.setting("auctions", all);
        db.save();

        await m.react("🐣");
        return m.reply(claraWrap("Lelang Ditutup",
          "Lelang *" + auction.title + "* ditutup tanpa pemenang (0 bid)"
        ));
      }
    }

    // --- CANCEL ---
    if (action === "cancel") {
      const auctionId = args[1]?.toUpperCase();
      if (!auctionId) {
        return m.reply(claraWrap("Lelang", "Format: " + prefix + "lelang cancel <ID>"));
      }

      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isGroupAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.sender === botConfig.owner?.[0] || m.isOwner;
      if (!isGroupAdmin && !isOwner) {
        return m.reply(claraWrap("Lelang", "Hanya admin yg bisa membatalkan lelang"));
      }

      const all = db.setting("auctions") || {};
      const auction = all[auctionId];
      if (!auction) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` tidak ditemukan"));
      }
      if (auction.ended) {
        return m.reply(claraWrap("Lelang", "Lelang `" + auctionId + "` sudah berakhir, tidak bisa dibatalkan"));
      }

      auction.cancelled = true;
      auction.cancelledAt = Date.now();
      all[auctionId] = auction;
      db.setting("auctions", all);
      db.save();

      await m.react("🐣");
      return m.reply(claraWrap("Lelang", "Lelang *" + auction.title + "* (`" + auctionId + "`) dibatalkan"));
    }

    // --- HISTORY ---
    if (action === "history") {
      const all = db.setting("auctions") || {};
      const groupHistory = Object.entries(all)
        .filter(([_, a]) => a.chatId === gid && (a.ended || a.cancelled))
        .sort((a, b) => {
          const aTime = a[1].ended ? a[1].closedAt : a[1].cancelledAt;
          const bTime = b[1].ended ? b[1].closedAt : b[1].cancelledAt;
          return (bTime || 0) - (aTime || 0);
        })
        .slice(0, 10);

      if (groupHistory.length === 0) {
        return m.reply(claraWrap("Lelang", "Belum ada riwayat lelang di grup ini"));
      }

      let lines = [];
      groupHistory.forEach(([id, a]) => {
        const status = a.cancelled ? "Batal" : "Selesai";
        const finalPrice = a.winner ? formatRupiah(a.winner.amount) : formatRupiah(a.startPrice);
        lines.push(id + " | " + a.title + " | " + finalPrice + " | " + status);
      });

      return m.reply(claraWrap("Riwayat Lelang", lines.join("\n")));
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "lelang create <judul> | <harga> | <durasi>\n" +
      prefix + "lelang bid <ID> <harga>\n" +
      prefix + "lelang list\n" +
      prefix + "lelang info <ID>\n" +
      prefix + "lelang close <ID>\n" +
      prefix + "lelang cancel <ID>\n" +
      prefix + "lelang history\n\n" +
      "Durasi: 30s / 15m / 2h / 1d\n" +
      "Min increment otomatis 5% dari harga awal",
      { title: "Lelang - Menu" }
    );
  } catch (e) {
    console.error("lelang error:", e);
    return m.reply(claraWrap("Lelang", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
