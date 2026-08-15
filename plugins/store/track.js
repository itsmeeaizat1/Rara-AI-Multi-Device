import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "track",
  alias: ["tracking", "lacak", "cekpesanan", "cekorder"],
  category: "store",
  description: "Lacak status pesanan berdasarkan nomor transaksi",
  usage: ".track <nomor_trx> — Lacak pesanan\n.track list — Lihat semua pesanan (owner)\n.track pending — Lihat pesanan pending (owner)\n.track update <trx> <status> — Update status (owner)\n.track stats — Statistik pesanan (owner)",
  example: ".track TRX-001",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Status flow: pending -> paid -> processing -> shipped -> delivered -> completed -> cancelled
const VALID_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "completed", "cancelled"];

const STATUS_EMOJI = {
  pending: "⏳",
  paid: "💰",
  processing: "🔄",
  shipped: "🚚",
  delivered: "📦",
  completed: "✅",
  cancelled: "❌",
};

const STATUS_LABEL = {
  pending: "Menunggu Pembayaran",
  paid: "Pembayaran Diterima",
  processing: "Sedang Diproses",
  shipped: "Sedang Dikirim",
  delivered: "Sampai Tujuan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function formatPrice(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return days + " hari lalu";
  if (hours > 0) return hours + " jam lalu";
  if (mins > 0) return mins + " menit lalu";
  return "baru saja";
}

function getProgressPercent(status) {
  const idx = VALID_STATUSES.indexOf(status);
  if (idx === -1 || status === "cancelled") return 0;
  return Math.round((idx / (VALID_STATUSES.length - 2)) * 100);
}

function progressBar(status) {
  if (status === "cancelled") return "~~DIBATALKAN~~";
  const percent = getProgressPercent(status);
  const filled = Math.round(percent / 12.5);
  const empty = 8 - filled;
  return "[" + "=".repeat(filled) + " ".repeat(empty) + "] " + percent + "%";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.args || []).map((a) => a.toLowerCase());
  const subCmd = args[0] || "";

  // === .track list (owner only) ===
  if (subCmd === "list") {
    if (!m.isOwner) return m.reply(claraWrap("track", "Perintah ini khusus owner."));
    return showAllOrders(m, db);
  }

  // === .track pending (owner only) ===
  if (subCmd === "pending") {
    if (!m.isOwner) return m.reply(claraWrap("track", "Perintah ini khusus owner."));
    return showPendingOrders(m, db);
  }

  // === .track update <trx> <status> (owner only) ===
  if (subCmd === "update") {
    if (!m.isOwner) return m.reply(claraWrap("track", "Perintah ini khusus owner."));
    return updateOrderStatus(m, sock, db, args);
  }

  // === .track stats (owner only) ===
  if (subCmd === "stats") {
    if (!m.isOwner) return m.reply(claraWrap("track", "Perintah ini khusus owner."));
    return showOrderStats(m, db);
  }

  // === .track <trxId> — lacak pesanan ===
  const trxId = (args[0] || m.text?.trim() || "").toUpperCase().replace(/\s+/g, "");
  if (!trxId || trxId === "") {
    return sendReplyWithNav(sock, m,
      "LACAK PESANAN\n\n" +
      "Cek status pesanan kamu dengan nomor transaksi.\n\n" +
      "Cara pakai:\n" +
      "1. .track <nomor_trx> — Lacak 1 pesanan\n" +
      "2. .track list — Lihat semua pesanan (owner)\n" +
      "3. .track pending — Lihat pesanan pending (owner)\n" +
      "4. .track update <trx> <status> — Update status (owner)\n" +
      "5. .track stats — Statistik pesanan (owner)\n\n" +
      "Status pesanan:\n" +
      "pending -> paid -> processing -> shipped -> delivered -> completed\n\n" +
      "Contoh: .track TRX-001\n\n" +
      "Nomor transaksi didapat saat kamu .beli <produk>",
      "track"
    );
  }

  return trackOrder(m, sock, db, trxId);
}

// === Lacak 1 pesanan ===
async function trackOrder(m, sock, db, trxId) {
  const transactions = db.setting("storeTransactions") || {};
  const trx = transactions[trxId];

  if (!trx) {
    // Cari berdasarkan nomor pembeli kalau bukan owner
    const allTrx = Object.entries(transactions);
    const buyerTrx = m.isOwner
      ? null
      : allTrx.filter(
          ([, t]) =>
            t.buyerJid === m.sender ||
            (t.buyerNum && t.buyerNum === m.sender.split("@")[0]),
        );

    if (buyerTrx && buyerTrx.length > 0) {
      let txt = "PESANAN KAMU\n\n";
      for (const [id, t] of buyerTrx) {
        const emoji = STATUS_EMOJI[t.status] || "?";
        txt += id + " — " + emoji + " " + (STATUS_LABEL[t.status] || t.status) + "\n";
        txt += t.productName + " — " + formatPrice(t.price) + "\n";
        txt += getTimeAgo(t.createdAt) + "\n\n";
      }
      txt += "Ketik .track <nomor_trx> buat lihat detail.";
      return m.reply(claraWrap("track", txt));
    }

    return m.reply(
      "Pesanan " + trxId + " tidak ditemukan.\n\nPastikan nomor transaksi benar. Nomor transaksi didapat saat kamu .beli <produk>."
    );
  }

  // Validasi: customer cuma bisa lihat pesanan sendiri
  if (!m.isOwner) {
    const buyerNum = m.sender.split("@")[0];
    const trxBuyerNum = trx.buyerJid?.split("@")[0] || trx.buyerNum;
    if (trxBuyerNum && trxBuyerNum !== buyerNum) {
      return m.reply(
        "Pesanan " + trxId + " tidak ditemukan.\n\nKamu cuma bisa lacak pesanan milikmu sendiri."
      );
    }
  }

  let txt = "LACAK PESANAN\n\n";
  txt += "Nomor TRX: " + trxId + "\n";
  txt += "Status: " + (STATUS_EMOJI[trx.status] || "?") + " " + (STATUS_LABEL[trx.status] || trx.status) + "\n";
  txt += "Progress: " + progressBar(trx.status) + "\n\n";
  txt += "Detail Pesanan:\n";
  txt += "Produk: " + trx.productName + "\n";
  txt += "Tipe: " + (trx.productType === "fisik" ? "Fisik" : "Digital") + "\n";
  txt += "Harga: " + formatPrice(trx.price) + "\n\n";
  txt += "Info Pembeli:\n";
  txt += "Nama: " + (trx.buyerName || "-") + "\n";
  txt += "Nomor: " + (trx.buyerJid?.split("@")[0] || trx.buyerNum || "-") + "\n\n";

  // Timeline
  txt += "Timeline:\n";
  txt += "1. " + (STATUS_EMOJI.pending) + " Dibuat: " + formatTime(trx.createdAt) + " (" + getTimeAgo(trx.createdAt) + ")\n";

  if (trx.paidAt) {
    txt += "2. " + (STATUS_EMOJI.paid) + " Dibayar: " + formatTime(trx.paidAt) + "\n";
  }
  if (trx.processingAt) {
    txt += "3. " + (STATUS_EMOJI.processing) + " Diproses: " + formatTime(trx.processingAt) + "\n";
  }
  if (trx.shippedAt) {
    txt += "4. " + (STATUS_EMOJI.shipped) + " Dikirim: " + formatTime(trx.shippedAt) + "\n";
    if (trx.trackingNumber) txt += "   No. Resi: " + trx.trackingNumber + "\n";
    if (trx.courier) txt += "   Kurir: " + trx.courier + "\n";
  }
  if (trx.deliveredAt) {
    txt += "5. " + (STATUS_EMOJI.delivered) + " Sampai: " + formatTime(trx.deliveredAt) + "\n";
  }
  if (trx.completedAt) {
    txt += "6. " + (STATUS_EMOJI.completed) + " Selesai: " + formatTime(trx.completedAt) + "\n";
  }
  if (trx.cancelledAt) {
    txt += "   " + (STATUS_EMOJI.cancelled) + " Dibatalkan: " + formatTime(trx.cancelledAt) + "\n";
    if (trx.cancelReason) txt += "   Alasan: " + trx.cancelReason + "\n";
  }

  txt += "\n";

  if (trx.status === "pending") {
    txt += "Menunggu pembayaran. Transfer ke metode yang tersedia lalu kirim bukti ke admin.";
  } else if (trx.status === "paid") {
    txt += "Pembayaran diterima! Pesanan sedang disiapkan.";
  } else if (trx.status === "processing") {
    txt += "Pesanan sedang diproses oleh admin.";
  } else if (trx.status === "shipped") {
    txt += "Pesanan sedang dikirim. Cek no. resi di atas.";
  } else if (trx.status === "delivered") {
    txt += "Pesanan sampai tujuan! Konfirmasi ke admin kalau sudah diterima.";
  } else if (trx.status === "completed") {
    txt += "Pesanan selesai. Terima kasih sudah berbelanja!";
  } else if (trx.status === "cancelled") {
    txt += "Pesanan dibatalkan.";
  }

  return sendReplyWithNav(sock, m, txt, "track");
}

// === Lihat semua pesanan (owner) ===
async function showAllOrders(m, db) {
  const transactions = db.setting("storeTransactions") || {};
  const allTrx = Object.entries(transactions);

  if (allTrx.length === 0) {
    return m.reply(claraWrap("track", "Belum ada pesanan."));
  }

  allTrx.sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

  let txt = "SEMUA PESANAN (" + allTrx.length + " total)\n\n";

  for (const [id, t] of allTrx.slice(0, 20)) {
    const emoji = STATUS_EMOJI[t.status] || "?";
    const typeIcon = t.productType === "fisik" ? "📦" : "🔑";
    txt += id + " " + emoji + " " + (STATUS_LABEL[t.status] || t.status) + "\n";
    txt += typeIcon + " " + t.productName + " — " + formatPrice(t.price) + "\n";
    txt += "👤 " + (t.buyerName || "-") + " | " + getTimeAgo(t.createdAt) + "\n\n";
  }

  if (allTrx.length > 20) {
    txt += "...dan " + (allTrx.length - 20) + " pesanan lainnya.\n\n";
  }

  txt += "Update status: .track update <trx> <status>\n";
  txt += "Status: pending, paid, processing, shipped, delivered, completed, cancelled";

  return m.reply(claraWrap("track", txt));
}

// === Lihat pesanan pending (owner) ===
async function showPendingOrders(m, db) {
  const transactions = db.setting("storeTransactions") || {};
  const allTrx = Object.entries(transactions);
  const pending = allTrx.filter(([, t]) =>
    ["pending", "paid", "processing", "shipped", "delivered"].includes(t.status)
  );

  if (pending.length === 0) {
    return m.reply(claraWrap("track", "Tidak ada pesanan pending. Semua sudah selesai atau dibatalkan."));
  }

  pending.sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

  let txt = "PESANAN AKTIF (" + pending.length + " pending)\n\n";

  for (const [id, t] of pending) {
    const emoji = STATUS_EMOJI[t.status] || "?";
    const typeIcon = t.productType === "fisik" ? "📦" : "🔑";
    txt += id + " " + emoji + " " + (STATUS_LABEL[t.status] || t.status) + "\n";
    txt += typeIcon + " " + t.productName + " — " + formatPrice(t.price) + "\n";
    txt += "👤 " + (t.buyerName || "-") + " (" + (t.buyerJid?.split("@")[0] || "-") + ")\n";
    txt += "🕐 " + getTimeAgo(t.createdAt) + "\n\n";
  }

  txt += "Update: .track update <trx> <status>";

  return m.reply(claraWrap("track", txt));
}

// === Update status pesanan (owner) ===
async function updateOrderStatus(m, sock, db, args) {
  // args = ["update", "TRX-001", "paid"]
  const trxId = (args[1] || "").toUpperCase().replace(/\s+/g, "");
  const newStatus = args[2] || "";

  if (!trxId || !newStatus) {
    return m.reply(
      "UPDATE STATUS PESANAN\n\n" +
      "Format: .track update <nomor_trx> <status>\n\n" +
      "Status tersedia:\n" +
      "1. pending — Menunggu pembayaran\n" +
      "2. paid — Pembayaran diterima\n" +
      "3. processing — Sedang diproses\n" +
      "4. shipped — Sedang dikirim\n" +
      "5. delivered — Sampai tujuan\n" +
      "6. completed — Selesai\n" +
      "7. cancelled — Dibatalkan\n\n" +
      "Opsi tambahan (untuk shipped):\n" +
      ".track update <trx> shipped resi:<nomor_resi> kurir:<nama_kurir>\n\n" +
      "Contoh:\n" +
      ".track update TRX-001 paid\n" +
      ".track update TRX-001 shipped resi:JTR123456 kurir:JNE"
    );
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    return m.reply("Status tidak valid: " + newStatus + "\n\nStatus tersedia: " + VALID_STATUSES.join(", "));
  }

  const transactions = db.setting("storeTransactions") || {};
  const trx = transactions[trxId];

  if (!trx) {
    return m.reply("Pesanan " + trxId + " tidak ditemukan.");
  }

  // Update status dan timestamp
  trx.status = newStatus;
  const now = new Date().toISOString();

  if (newStatus === "paid") trx.paidAt = now;
  if (newStatus === "processing") trx.processingAt = now;
  if (newStatus === "shipped") {
    trx.shippedAt = now;
    const text = m.text || "";
    const resiMatch = text.match(/resi[:\s]+(\S+)/i);
    const kurirMatch = text.match(/kurir[:\s]+(\S+)/i);
    if (resiMatch) trx.trackingNumber = resiMatch[1];
    if (kurirMatch) trx.courier = kurirMatch[1];
  }
  if (newStatus === "delivered") trx.deliveredAt = now;
  if (newStatus === "completed") trx.completedAt = now;
  if (newStatus === "cancelled") {
    trx.cancelledAt = now;
    const cancelReason = (m.text || "").match(/alasan[:\s]+(.+)/i);
    if (cancelReason) trx.cancelReason = cancelReason[1];
  }

  transactions[trxId] = trx;
  db.setting("storeTransactions", transactions);
  db.save();

  // Notifikasi ke pembeli
  const buyerJid = trx.buyerJid;
  if (buyerJid) {
    let notifTxt = "UPDATE PESANAN " + trxId + "\n\n";
    notifTxt += "Status: " + (STATUS_EMOJI[newStatus] || "") + " " + (STATUS_LABEL[newStatus] || newStatus) + "\n\n";
    notifTxt += "Produk: " + trx.productName + "\n";
    notifTxt += "Harga: " + formatPrice(trx.price) + "\n\n";

    if (newStatus === "paid") {
      notifTxt += "Pembayaran kamu sudah diterima! Pesanan sedang disiapkan.";
    } else if (newStatus === "processing") {
      notifTxt += "Pesanan kamu sedang diproses. Tunggu info selanjutnya ya!";
    } else if (newStatus === "shipped") {
      notifTxt += "Pesanan sudah dikirim!";
      if (trx.trackingNumber) notifTxt += "\nNo. Resi: " + trx.trackingNumber;
      if (trx.courier) notifTxt += "\nKurir: " + trx.courier;
      notifTxt += "\nLacak pesanan: .track " + trxId;
    } else if (newStatus === "delivered") {
      notifTxt += "Pesanan sampai tujuan! Konfirmasi ke admin kalau sudah diterima.";
    } else if (newStatus === "completed") {
      notifTxt += "Pesanan selesai. Terima kasih sudah berbelanja!";
    } else if (newStatus === "cancelled") {
      notifTxt += "Pesanan dibatalkan.";
      if (trx.cancelReason) notifTxt += "\nAlasan: " + trx.cancelReason;
    }

    try {
      await sock.sendMessage(buyerJid, { text: notifTxt });
    } catch (e) {
      console.error("[Track] Failed to notify buyer:", buyerJid, e.message);
    }
  }

  let txt = "STATUS DIPERBARUI\n\n";
  txt += "TRX: " + trxId + "\n";
  txt += "Status baru: " + (STATUS_EMOJI[newStatus] || "") + " " + (STATUS_LABEL[newStatus] || newStatus) + "\n";
  txt += "Produk: " + trx.productName + "\n";
  txt += "Pembeli: " + (trx.buyerName || "-") + "\n";
  txt += "Harga: " + formatPrice(trx.price) + "\n";
  if (trx.trackingNumber) txt += "No. Resi: " + trx.trackingNumber + "\n";
  if (trx.courier) txt += "Kurir: " + trx.courier + "\n";
  txt += "\nNotifikasi terkirim ke pembeli.";

  return m.reply(claraWrap("track", txt));
}

// === Statistik pesanan (owner) ===
async function showOrderStats(m, db) {
  const transactions = db.setting("storeTransactions") || {};
  const allTrx = Object.values(transactions);

  if (allTrx.length === 0) {
    return m.reply(claraWrap("track", "Belum ada pesanan."));
  }

  const stats = {};
  for (const s of VALID_STATUSES) stats[s] = 0;
  let totalRevenue = 0;
  let totalCancelled = 0;

  for (const t of allTrx) {
    if (stats[t.status] !== undefined) stats[t.status]++;
    if (t.status === "completed") totalRevenue += t.price || 0;
    if (t.status === "cancelled") totalCancelled += t.price || 0;
  }

  const activeOrders = stats.pending + stats.paid + stats.processing + stats.shipped + stats.delivered;

  let txt = "STATISTIK PESANAN\n\n";
  txt += "Total Pesanan: " + allTrx.length + "\n";
  txt += "Pesanan Aktif: " + activeOrders + "\n";
  txt += "Selesai: " + stats.completed + "\n";
  txt += "Dibatalkan: " + stats.cancelled + "\n\n";
  txt += "Rincian Status:\n";
  txt += "⏳ Pending: " + stats.pending + "\n";
  txt += "💰 Paid: " + stats.paid + "\n";
  txt += "🔄 Processing: " + stats.processing + "\n";
  txt += "🚚 Shipped: " + stats.shipped + "\n";
  txt += "📦 Delivered: " + stats.delivered + "\n";
  txt += "✅ Completed: " + stats.completed + "\n";
  txt += "❌ Cancelled: " + stats.cancelled + "\n\n";
  txt += "Total Revenue: " + formatPrice(totalRevenue) + "\n";
  txt += "Total Dibatalkan: " + formatPrice(totalCancelled) + "\n";

  return m.reply(claraWrap("track", txt));
}

export { pluginConfig as config, handler };
