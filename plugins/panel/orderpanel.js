// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// orderpanel.js — AUTO ORDER PANEL (buyer): bayar QRIS pakasir → lunas →
// panel Pterodactyl ke-create OTOMATIS + kredensial dikirim ke DM buyer.
// Porting flow "auto order panel" script selfbot JPM APENBOTZ (21 Sep 2026).
// - .orderpanel <ram>|<username>  (alias: panelptero, belipanel)
// - .orderadmin <username>        (alias: adminpanel, beliadmin)
// - .pricelist                    (alias: orderpaneldev, hargapanel)
// Kredensial SELALU dikirim ke DM buyer (gak pernah bocor di grup).
// Config owner: .autoorder (plugins/owner/autoorder.js).
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import {
  RAM_PACKAGES, ensureOrderCfg, packagePrice, getOrderPanelCfg, checkPanelOnline,
  buildPakasir, provisionPanel, provisionAdmin, fmtRupiah, getOrderTimings,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setAutoOrderHttpForTest, _resetAutoOrderHttpForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
} from "../../src/lib/rara-auto-order.js";

const pluginConfig = {
  name: "orderpanel",
  alias: ["orderpanel", "panelptero", "belipanel", "orderadmin", "adminpanel", "beliadmin", "pricelist", "orderpaneldev", "hargapanel", "listharga"],
  category: "panel",
  description: "Auto Order Panel — bayar QRIS, panel ke-create otomatis (Pterodactyl)",
  usage: ".orderpanel <ram>|<username> · .orderadmin <username> · .pricelist",
  example: ".orderpanel 2gb|budi123",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function ownerJid() {
  const n = (config.owner?.number || [])[0] || "";
  const digits = String(n).replace(/\D/g, "");
  return digits ? digits + "@s.whatsapp.net" : "";
}

async function dm(sock, jid, text) {
  if (!sock || !jid) return false;
  try { await sock.sendMessage(jid, { text }); return true; } catch { return false; }
}

// ── daftar harga ──
function priceList(cfg, panelNum) {
  const rows = Object.keys(RAM_PACKAGES).map((k) => `• ${k.toUpperCase()} — ${fmtRupiah(packagePrice(cfg, k))}`);
  return raraWrap("Auto Order Panel", [
    `Panel: v${panelNum} · Bayar QRIS otomatis (Pakasir)`,
    "",
    ...rows,
    `• ADMIN PANEL 1 BULAN — ${fmtRupiah(cfg.adminPrice)}`,
    "",
    "Cara order:",
    ".orderpanel <ram>|<username>",
    ".orderadmin <username>",
    "",
    "Lunas → panel langsung dibuat & kredensial dikirim ke DM kamu.",
  ]);
}

// ── order flow inti ──
const pendingOrders = new Set(); // guard 1 order aktif per buyer

async function runOrder(m, { sock, db }, kind) {
  const cfg = ensureOrderCfg(db);
  const buyer = m.sender;
  const chat = m.chat;

  // guard konfigurasi
  if (!cfg.on) return m.reply(raraWrap("Auto Order Panel", "Auto order sedang tidak aktif. Hubungi owner ya.", "error"));
  if (!cfg.pakasir.slug || !cfg.pakasir.apikey) {
    return m.reply(raraWrap("Auto Order Panel", "Pembayaran belum dikonfigurasi (owner belum set Pakasir).", "error"));
  }
  const panelCfg = getOrderPanelCfg(cfg.panel);
  if (!panelCfg) {
    return m.reply(raraWrap("Auto Order Panel", `Panel v${cfg.panel} belum dikonfigurasi. Hubungi owner.`, "error"));
  }
  if (pendingOrders.has(buyer)) {
    return m.reply(raraWrap("Auto Order Panel", "Kamu masih punya order berjalan. Tunggu selesai/dibatalkan dulu ya.", "error"));
  }

  // parse argumen
  const text = (m.text || "").trim();
  let pkgKey = null, username = "";
  if (kind === "admin") {
    username = text.split(/\s+/)[0] || "";
  } else {
    const [a, b] = text.split("|").map((v) => v.trim());
    pkgKey = (a || "").toLowerCase().replace(/^unli$/, "unlimited");
    username = b || "";
  }
  const clean = String(username || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (kind !== "admin" && !RAM_PACKAGES[pkgKey]) {
    return m.reply(raraWrap("Auto Order Panel", raraGuide(".orderpanel <ram>|<username>", [
      `Paket RAM tersedia: ${Object.keys(RAM_PACKAGES).join(", ")}`,
      `Contoh: .orderpanel 2gb|budi123`,
    ])));
  }
  if (!clean || clean.length < 3) {
    return m.reply(raraWrap("Auto Order Panel", `Username minimal 3 huruf/angka${kind === "admin" ? `.\nContoh: .orderadmin budi123` : ` setelah tanda |.\nContoh: .orderpanel 2gb|budi123`}`, "error"));
  }
  const price = kind === "admin" ? cfg.adminPrice : packagePrice(cfg, pkgKey);
  const orderId = "RARA-" + Date.now().toString(36).toUpperCase() + "-" + clean.slice(0, 6);
  const produk = kind === "admin" ? "Admin Panel 1 Bulan" : `Panel Pterodactyl ${pkgKey}`;

  // panel harus online
  const cek = await checkPanelOnline(panelCfg.domain);
  if (!cek.ready) return m.reply(raraWrap("Auto Order Panel", `Panel sedang tidak tersedia: ${cek.message}`, "error"));

  pendingOrders.add(buyer);
  const { intervalMs, timeoutMs } = getOrderTimings();
  try {
    // buat pembayaran QRIS
    const pakasir = await buildPakasir(cfg);
    const trx = await pakasir.createPayment("qris", orderId, price);
    if (!trx || !trx.order_id) throw new Error("Pakasir gak balikin transaksi");

    // QR image
    let qrBuf = null;
    const qrPayload = trx.payment_number || trx.payment_url || trx.redirect_url;
    if (qrPayload) {
      try {
        const QRcode = (await import("qrcode")).default || (await import("qrcode"));
        qrBuf = await QRcode.toBuffer(String(qrPayload), { margin: 1, scale: 6 });
      } catch {}
    }

    const invoiceTextBody = [
      `Order ID: ${orderId}`,
      `Produk: ${produk}`,
      `Total: ${fmtRupiah(price)}`,
      `Pembayaran: QRIS`,
      "",
      qrBuf ? "Scan QR di atas buat bayar." : `Link bayar: ${trx.payment_url || trx.redirect_url || "-"}`,
      "",
      `Order kedaluwarsa otomatis ${Math.round(timeoutMs / 60000)} menit. Lunas = panel dibuat otomatis.`,
    ].join("\n");
    if (qrBuf) await sock.sendMessage(chat, { image: qrBuf, caption: raraWrap("Invoice Order", invoiceTextBody) }, { quoted: m });
    else await m.reply(raraWrap("Invoice Order", invoiceTextBody));

    // poll sampai lunas/kedaluwarsa
    const t0 = Date.now();
    let status = "pending";
    while (Date.now() - t0 < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const det = await pakasir.detailPayment(trx.order_id, trx.amount);
        status = det?.status || "pending";
      } catch { /* network sabar, lanjut poll */ }
      if (status === "completed" || status === "canceled") break;
    }

    if (status === "canceled") {
      await m.reply(raraWrap("Auto Order Panel", `Order ${orderId} dibatalkan. Order lagi kapan pun ya.`));
      return;
    }
    if (status !== "completed") {
      await m.reply(raraWrap("Auto Order Panel", `Order ${orderId} kedaluwarsa (belum dibayar). Panel tidak dibuat.`));
      return;
    }

    // LUNAS → provisioning otomatis
    await m.reply(raraWrap("Auto Order Panel", `Pembayaran diterima! Membuat ${produk} untuk ${clean}… tunggu sebentar.`));
    const result = kind === "admin"
      ? await provisionAdmin(panelCfg, clean)
      : await provisionPanel(panelCfg, pkgKey, clean);

    if (!result.ok) {
      const msgFail = `Order ${orderId} LUNAS tapi provisioning GAGAL: ${result.error}. Sertifikasi sudah dihubungi owner — dana diproses manual.`;
      await dm(sock, ownerJid(), `[AUTO ORDER] Order ${orderId} (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS tapi provisioning gagal: ${result.error}. Mohon proses manual.`);
      return m.reply(raraWrap("Auto Order Panel", msgFail, "error"));
    }

    // kredensial — SELALU ke DM buyer
    const credText = [
      `Order ID: ${orderId}`,
      `Produk: ${produk}`,
      "",
      `👤 Username: ${result.username}`,
      `🔐 Password: ${result.password}`,
      `🌐 Login: ${result.domain}`,
      ...(kind === "admin" ? [] : [
        "",
        `Specs: RAM ${result.ram} · Disk ${result.disk} · CPU ${result.cpu}`,
      ]),
      "",
      "Simpan kredensial ini baik-baik ya. Selamat memakai!",
    ].join("\n");
    const sentDm = await dm(sock, buyer, raraWrap("Panel Kamu Siap", credText));
    if (!sentDm) {
      // DM gagal (misal buyer gak pernah chat bot) — kasih tau lewat chat asal TANPA password
      await m.reply(raraWrap("Auto Order Panel", `Panel kamu udah jadi, tapi bot gak bisa DM kamu. Chat bot ini dulu (kirim "halo") lalu minta owner kirim ulang kredensial order ${orderId}.`));
    } else if (m.isGroup) {
      await m.reply(raraWrap("Auto Order Panel", `Panel kamu udah jadi — kredensial dikirim ke DM kamu ya ${orderId}.`));
    }
    await dm(sock, ownerJid(), `[AUTO ORDER] Order ${orderId} sukses: ${produk} ${fmtRupiah(price)} — buyer ${buyer.split("@")[0]} (username: ${result.username}).`);
  } catch (e) {
    await m.reply(raraWrap("Auto Order Panel", `Order gagal: ${e?.message || e}. Coba lagi atau hubungi owner.`, "error"));
  } finally {
    pendingOrders.delete(buyer);
  }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cfg = ensureOrderCfg(db);
  const cmd = (m.command || "").toLowerCase();
  const text = (m.text || "").trim();

  if (["pricelist", "orderpaneldev", "hargapanel", "listharga"].includes(cmd)) {
    return m.reply(priceList(cfg, cfg.panel));
  }
  if (["orderadmin", "adminpanel", "beliadmin"].includes(cmd)) {
    return runOrder(m, { sock, db }, "admin");
  }
  // default: .orderpanel / panelptero / belipanel
  return runOrder(m, { sock, db }, "panel");
}

export {
  pluginConfig as config, handler,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setAutoOrderHttpForTest, _resetAutoOrderHttpForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
};
