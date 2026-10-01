// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// approveprem.js — Owner: kelola pesanan beli premium (.buyprem)
// Mirror approvetopup: pesanan pending direkam buyprem ke db.data.premiumOrders.
// .approveprem          → lihat semua pesanan pending
// .approveprem <nomor>  → approve → premium aktif otomatis (alur sama .addprem:
//                         extend kalau udah premium, energi premium, bonus exp/koin,
//                         broadcast saluran) + user dinotif
// .approveprem <nomor> tolak [alasan] → tolak pesanan + user dinotif
// days 0 (lifetime) → premium PERMANENT tanpa expired.
import config from "../../config.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import { notifyPremiumAdd } from "../../src/lib/rara-saluran-broadcast.js";
import { PREMIUM_BONUS } from "../../src/lib/store/rara-store.js";

const pluginConfig = {
  name: "approveprem",
  alias: ["approveprem", "approvepremium", "rejectprem"],
  category: "owner",
  description: "Kelola pesanan beli premium dari user (.buyprem)",
  usage: ".approveprem [nomor] [tolak <alasan>]",
  example: ".approveprem 6281234567890",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function ensurePremiumOrders(db) {
  if (!db.data.premiumOrders || typeof db.data.premiumOrders !== "object") {
    db.data.premiumOrders = { pending: {}, history: [] };
  }
  if (!db.data.premiumOrders.pending) db.data.premiumOrders.pending = {};
  if (!Array.isArray(db.data.premiumOrders.history)) db.data.premiumOrders.history = [];
  return db.data.premiumOrders;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const db = getDatabase();
  const orders = ensurePremiumOrders(db);
  const args = (m.args || []).map((a) => String(a));

  // ── List pending ──
  if (args.length === 0) {
    const pending = Object.entries(orders.pending).filter(
      ([, o]) => o.status === "pending",
    );
    if (pending.length === 0) {
      return m.reply(raraWrap("approveprem", "Tidak ada pesanan premium yang pending."));
    }
    let txt = `${toSC("pesanan premium pending")} — ${pending.length}\n`;
    for (const [jid, o] of pending) {
      txt += `\n• ${o.phoneNumber} (${o.name || "Unknown"})\n  ⭐ ${o.label} (${o.days === 0 ? "Permanent" : o.days + " hari"}) — ${o.price}\n  Waktu: ${new Date(o.orderedAt).toLocaleString("id-ID")}\n`;
    }
    txt += `\n📌 Approve: *${prefix}approveprem <nomor>*\n💡 Tolak: *${prefix}approveprem <nomor> tolak <alasan>*`;
    return m.reply(raraWrap("approveprem", txt));
  }

  // ── Approve / tolak by nomor ──
  const target = args[0].replace(/[^0-9]/g, "");
  if (target.length < 8) {
    return m.reply(raraWrap("approveprem", `Nomor tidak valid\n\n📌 Contoh: *${prefix}approveprem 6281234567890*`));
  }
  const jid = target + "@s.whatsapp.net";
  const order = orders.pending[jid] || orders.pending[target];
  if (!order || order.status !== "pending") {
    return m.reply(raraWrap("approveprem", `Tidak ada pesanan premium pending dari *${target}*`));
  }

  const isReject = ["tolak", "batal", "reject"].includes((args[1] || "").toLowerCase());

  // ── Tolak ──
  if (isReject) {
    const reason = args.slice(2).join(" ") || "Pembayaran tidak terverifikasi";
    delete orders.pending[jid];
    order.status = "rejected";
    order.rejectedAt = Date.now();
    order.rejectedBy = m.sender;
    order.rejectReason = reason;
    orders.history.push(order);
    if (orders.history.length > 200) orders.history = orders.history.slice(-200);
    db.save();
    await sock.sendMessage(jid, {
      text: `❌ *pesanan premium ditolak*\n\nPaket: *${order.label}* — ${order.price}\nAlasan: *${reason}*\n\nHubungi owner untuk info lebih lanjut.`,
    }).catch(() => {});
    return m.reply(raraWrap("approveprem",
      `Status: *ditolak*\nPesanan premium (${order.label}) dari *${target}* ditolak`));
  }

  // ── Approve: terapkan premium (alur sama .addprem) ──
  if (!Array.isArray(db.data.premium)) db.data.premium = [];
  const existingIndex = db.data.premium.findIndex((p) =>
    typeof p === "string" ? p === target : p.id === target,
  );
  const now = Date.now();
  let newExpired = null;

  if (order.days === 0) {
    // LIFETIME: premium permanent tanpa expired
    if (existingIndex !== -1) {
      if (typeof db.data.premium[existingIndex] === "object") {
        delete db.data.premium[existingIndex].expired;
        db.data.premium[existingIndex].name = order.name || "Unknown";
      } else {
        db.data.premium[existingIndex] = {
          id: target, name: order.name || "Unknown", addedAt: now,
        };
      }
    } else {
      db.data.premium.push({
        id: target, name: order.name || "Unknown", addedAt: now,
      });
    }
  } else {
    if (existingIndex !== -1) {
      const currentData = db.data.premium[existingIndex];
      const currentExpired =
        typeof currentData === "string" ? now : currentData.expired || now;
      const baseTime = currentExpired > now ? currentExpired : now;
      newExpired = baseTime + order.days * 24 * 60 * 60 * 1000;
      if (typeof currentData === "string") {
        db.data.premium[existingIndex] = {
          id: target, expired: newExpired, name: order.name || "Unknown", addedAt: now,
        };
      } else {
        db.data.premium[existingIndex].expired = newExpired;
        db.data.premium[existingIndex].name = order.name || "Unknown";
      }
    } else {
      newExpired = now + order.days * 24 * 60 * 60 * 1000;
      db.data.premium.push({
        id: target, expired: newExpired, name: order.name || "Unknown", addedAt: now,
      });
    }
  }

  // flag user + bonus (sinkron addprem)
  const user = db.getUser(jid) || db.setUser(jid);
  if (user.energi !== -1) {
    user.energi = config.energi?.premium || 999999;
  }
  user.isPremium = true;
  db.setUser(jid, user);
  db.updateExp(jid, PREMIUM_BONUS.exp);
  db.updateKoin(jid, PREMIUM_BONUS.koin);

  delete orders.pending[jid];
  order.status = "approved";
  order.approvedAt = Date.now();
  order.approvedBy = m.sender;
  orders.history.push(order);
  if (orders.history.length > 200) orders.history = orders.history.slice(-200);
  db.save();

  // broadcast saluran — user baru premium (sinkron addprem)
  await notifyPremiumAdd(sock, {
    name: order.name || "Unknown",
    phoneNumber: target,
    days: order.days || "Permanent",
    price: order.price,
    expiredStr: newExpired ? formatDate(newExpired) : "Permanent",
    isExtend: existingIndex !== -1,
    totalPremium: db.data.premium.length,
  }).catch((e) => { console.error("[approveprem] broadcast:", e?.message || e); });

  const durLabel = order.days === 0 ? "PERMANENT (seumur hidup)" : `*${order.days} hari*`;
  await sock.sendMessage(jid, {
    text: `✅ *premium berhasil diaktifkan*\n\nPaket: *${order.label}*\nDurasi: ${durLabel}\nTotal bayar: *${order.price}*\n${newExpired ? `Expired: *${formatDate(newExpired)}*` : ""}\n\nTerima kasih sudah beli premium 🥳`,
  }).catch(() => {});

  return m.reply(raraWrap("approveprem",
    `Status: *berhasil*\nUser: *${order.phoneNumber}*\nPaket: *${order.label}* (${durLabel})\nHarga: *${order.price}*\n${newExpired ? `Expired: *${formatDate(newExpired)}*` : "Tanpa expired (permanent)"}\n\nPremium aktif otomatis & user sudah dinotif`));
}

export { pluginConfig as config, handler };
