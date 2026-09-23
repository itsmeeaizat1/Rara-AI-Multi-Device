// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// orderprem.js — AUTO ORDER APP PREMIUM Premku (buyer): pilih produk premium
// (Capcut Pro, dll) dari premku.com → bayar QRIS Pakasir → lunas → order
// otomatis ke API → pantau invoice → struk/akun dikirim ke DM buyer.
// - .premkulist [keyword]  (alias: listpremku) daftar produk aktif + stok
// - .orderprem <product_id>[|qty]   (alias: beliprem, premku, akunpremium)
// - .premstatus <order_id>  cek status pesanan (buyer pesan itu / owner)
// Harga = harga produk API × qty + markup owner (.autoorder markupprem).
// API key owner: .autoorder premku <api_key>.
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";
import {
  ensureOrderCfg, buildPakasir, fmtRupiah, getOrderTimings,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
} from "../../src/lib/nova-auto-order.js";
import {
  premProfile, premProducts, premFindProduct, premOrder, premStatus,
  premOrderId, _setPremkuHttpForTest, _resetPremkuHttpForTest,
} from "../../src/lib/nova-premku.js";

const pluginConfig = {
  name: "orderprem",
  alias: ["orderprem", "beliprem", "premku", "akunpremium", "premkulist", "listpremku", "premstatus"],
  category: "panel",
  description: "Auto Order App Premium Premku — bayar QRIS, akun premium diproses otomatis",
  usage: ".premkulist [keyword] · .orderprem <product_id>[|qty] · .premstatus <order_id>",
  example: ".orderprem 4|1",
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

// ── timing seam (status poll) ──
const _statusPoll = { intervalMs: 10000, timeoutMs: 10 * 60 * 1000 };
function _setStatusTimingsForTest(i, t) { _statusPoll.intervalMs = i; _statusPoll.timeoutMs = t; }
function _resetStatusTimingsForTest() { _statusPoll.intervalMs = 10000; _statusPoll.timeoutMs = 10 * 60 * 1000; }

// ── render detail pesanan generik (bentuk respon status gak terdokumentasi
//    lengkap → tampilkan SEMUA field key: value biar aman bentuk apa pun) ──
function detailRows(d, skip = []) {
  const rows = [];
  for (const [k, v] of Object.entries(d || {})) {
    if (skip.includes(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    const label = String(k).replace(/_/g, " ").toLowerCase();
    const val = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (val.length > 400) continue; // anti spam field raksasa
    rows.push(`${label}: ${val}`);
  }
  return rows;
}

// ── daftar produk ──
async function listProducts(m, { db }, keyword) {
  const cfg = ensureOrderCfg(db);
  if (!cfg.premku.apiKey) {
    return m.reply(claraWrap("Auto Order Prem", "Layanan belum siap (owner belum set API Premku).", "error"));
  }
  const r = await premProducts(cfg);
  if (!r.ok) return m.reply(claraWrap("Auto Order Prem", `Gak bisa ambil produk: ${r.error}`, "error"));
  let list = r.list.filter((p) => p.status === "available" && p.stock > 0);
  const kw = String(keyword || "").toLowerCase().trim();
  if (kw) list = list.filter((p) => p.name.toLowerCase().includes(kw) || p.productType.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
  if (!list.length) return m.reply(claraWrap("Auto Order Prem", `Gak ada produk${kw ? ` yang cocok "${keyword}"` : ""} yang aktif/stok ada. Coba lagi nanti.`));
  const markup = Number(cfg.premku.markup || 0);
  const shown = list.slice(0, 15);
  const rows = shown.map((p) => `• [${p.id}] ${p.name}\n   Harga: ${fmtRupiah(p.price + markup)} · Stok: ${p.stock}`);
  return m.reply(claraWrap("Auto Order Prem", [
    `Total produk aktif: ${list.length}${kw ? ` · cocok "${keyword}": ${list.length}` : ""}${r.list.length > 15 ? " (tampil maks 15)" : ""}`,
    ...(kw ? [] : ["", `Cari: .premkulist <keyword> (contoh: .premkulist capcut)`]),
    "",
    ...rows,
    "",
    "Cara order:",
    ".orderprem <product_id>[|qty]  (qty kosong = 1)",
    "Contoh: .orderprem 4|1",
    "",
    "Lunas → pesanan diproses otomatis, struk/akun dikirim ke DM kamu.",
  ]));
}

// ── cari order internal (id PREM-… atau invoice Premku) ──
function findOrder(cfg, id) {
  const oid = String(id || "").trim();
  if (cfg.premOrders?.[oid]) return { rec: cfg.premOrders[oid], key: oid };
  const byInvoice = Object.entries(cfg.premOrders || {}).find(([, o]) => String(o.invoice) === oid);
  if (byInvoice) return { rec: byInvoice[1], key: byInvoice[0] };
  return null;
}

// ── cek status pesanan ──
async function statusOrder(m, { db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const isOwner = m.sender === ownerJid();
  const found = findOrder(cfg, orderId);
  if (!found) return m.reply(claraWrap("Auto Order Prem", `Order ${orderId} gak ketemu di catatan bot. Cek ID-nya lagi ya.`, "error"));
  if (found.rec.buyer !== m.sender && !isOwner) {
    return m.reply(claraWrap("Auto Order Prem", "Order itu bukan punya kamu — cek pakai order_id kamu sendiri ya.", "error"));
  }
  if (!cfg.premku.apiKey) return m.reply(claraWrap("Auto Order Prem", "API Premku belum di-set owner.", "error"));
  const r = await premStatus(cfg, found.rec.invoice);
  if (!r.ok) return m.reply(claraWrap("Auto Order Prem", `Cek status gagal: ${r.error}`, "error"));
  return m.reply(claraWrap("Status Order Prem", [
    `Order ID: ${found.key}`,
    `Invoice: ${found.rec.invoice}`,
    `Produk: ${found.rec.produk}`,
    `Total: ${fmtRupiah(found.rec.price)}`,
    "",
    ...detailRows(r.data, ["invoice"]),
  ]));
}

// ── flow order inti ──
const pendingPrem = new Set(); // guard 1 order berjalan per buyer

async function runPrem(m, { sock, db }, raw) {
  const cfg = ensureOrderCfg(db);
  const buyer = m.sender;
  const chat = m.chat;

  if (!cfg.on) return m.reply(claraWrap("Auto Order Prem", "Auto order sedang tidak aktif. Hubungi owner ya.", "error"));
  if (!cfg.pakasir.slug || !cfg.pakasir.apikey) {
    return m.reply(claraWrap("Auto Order Prem", "Pembayaran belum dikonfigurasi (owner belum set Pakasir).", "error"));
  }
  if (!cfg.premku.apiKey) {
    return m.reply(claraWrap("Auto Order Prem", "Layanan belum siap (owner belum set API Premku).", "error"));
  }
  if (pendingPrem.has(buyer)) {
    return m.reply(claraWrap("Auto Order Prem", "Kamu masih punya order berjalan. Tunggu selesai dulu ya.", "error"));
  }

  const [idRaw, qtyRaw] = String(raw || "").split("|").map((v) => (v || "").trim());
  const productId = String(idRaw || "").replace(/\D/g, "");
  const qty = qtyRaw ? parseInt(qtyRaw, 10) : 1;
  if (!productId) {
    return m.reply(claraWrap("Auto Order Prem", novaGuide(".orderprem <product_id>[|qty]", [
      "Lihat daftar produk: .premkulist",
      "Contoh: .orderprem 4|1",
    ])));
  }
  if (!Number.isFinite(qty) || qty < 1 || qty > 10) {
    return m.reply(claraWrap("Auto Order Prem", "Qty antara 1-10 ya.", "error"));
  }

  pendingPrem.add(buyer);
  const { intervalMs, timeoutMs } = getOrderTimings();
  try {
    const prof = await premProfile(cfg);
    if (!prof.ok) throw new Error(`cek profile gagal: ${prof.error}`);
    const prod = await premFindProduct(cfg, productId);
    if (!prod.ok) return m.reply(claraWrap("Auto Order Prem", prod.error, "error"));
    if (prod.prod.status !== "available") {
      return m.reply(claraWrap("Auto Order Prem", `Produk "${prod.prod.name}" sedang tidak tersedia.`, "error"));
    }
    if (prod.prod.stock < qty) {
      return m.reply(claraWrap("Auto Order Prem", `Stok "${prod.prod.name}" tinggal ${prod.prod.stock}. Kurangi qty atau pilih produk lain ya.`, "error"));
    }
    const markup = Number(cfg.premku.markup || 0);
    const price = (prod.prod.price * qty) + markup;
    const produk = prod.prod.name;
    const orderId = premOrderId(buyer);

    // pembayaran QRIS
    const pakasir = await buildPakasir(cfg);
    const trx = await pakasir.createPayment("qris", orderId, price);
    if (!trx || !trx.order_id) throw new Error("Pakasir gak balikin transaksi");

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
      `Qty: ${qty}`,
      `Total: ${fmtRupiah(price)}`,
      `Pembayaran: QRIS`,
      "",
      qrBuf ? "Scan QR di atas buat bayar." : `Link bayar: ${trx.payment_url || trx.redirect_url || "-"}`,
      "",
      `Order kedaluwarsa otomatis ${Math.round(timeoutMs / 60000)} menit. Lunas = pesanan langsung dikirim ke sistem.`,
    ].join("\n");
    if (qrBuf) await sock.sendMessage(chat, { image: qrBuf, caption: claraWrap("Invoice Prem", invoiceTextBody) }, { quoted: m });
    else await m.reply(claraWrap("Invoice Prem", invoiceTextBody));

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
      await m.reply(claraWrap("Auto Order Prem", `Order ${orderId} dibatalkan. Order lagi kapan pun ya.`));
      return;
    }
    if (status !== "completed") {
      await m.reply(claraWrap("Auto Order Prem", `Order ${orderId} kedaluwarsa (belum dibayar). Pesanan tidak dibuat.`));
      return;
    }

    // LUNAS → order ke Premku
    await m.reply(claraWrap("Auto Order Prem", `Pembayaran diterima! Mengirim pesanan ${produk} ke sistem…`));
    const ord = await premOrder(cfg, { productId, qty });
    if (!ord.ok) {
      const msgFail = `Order ${orderId} LUNAS tapi pengiriman ke Premku GAGAL: ${ord.error}. Dana diproses manual — owner sudah dihubungi.`;
      await dm(sock, ownerJid(), `[AUTO ORDER PREM] Order ${orderId} (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS tapi API gagal: ${ord.error}. Mohon proses manual/refund.`);
      return m.reply(claraWrap("Auto Order Prem", msgFail, "error"));
    }
    if (!ord.invoice) {
      await dm(sock, ownerJid(), `[AUTO ORDER PREM] Order ${orderId} (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS, API sukses, TAPI respon gak ada invoice — cek dashboard premku.com. Raw: ${JSON.stringify(ord.data).slice(0, 300)}`);
      return m.reply(claraWrap("Auto Order Prem", `Order ${orderId} masuk ke sistem tapi invoice-nya belum kebaca bot. Owner sedang dicek — detail menyusul ya.`));
    }

    // catat order (buat .premstatus)
    cfg.premOrders[orderId] = {
      buyer, produk, productId, qty, price,
      invoice: ord.invoice, createdAt: Date.now(),
    };
    db.save();

    // pantau status sebentar (akun biasanya dikirim provider via invoice)
    const t1 = Date.now();
    let det = null;
    while (Date.now() - t1 < _statusPoll.timeoutMs) {
      await new Promise((r) => setTimeout(r, _statusPoll.intervalMs));
      try {
        const st = await premStatus(cfg, ord.invoice);
        if (st.ok) det = st.data;
      } catch { /* sabar */ }
      if (det && /sukses|berhasil|selesai|success|done|terkirim/i.test(JSON.stringify(det).slice(0, 600))) break;
    }

    const detail = det ? detailRows(det, ["invoice"]) : [];
    const receipt = [
      `Order ID: ${orderId}`,
      `Invoice: ${ord.invoice}`,
      `Produk: ${produk}`,
      `Qty: ${qty}`,
      `Total: ${fmtRupiah(price)}`,
      "",
      ...(detail.length ? ["Detail pesanan:", ...detail] : ["Pesanan sedang diproses provider."]),
      "",
      `Cek kapan pun: .premstatus ${orderId}`,
    ].join("\n");
    const sentDm = await dm(sock, buyer, claraWrap("Order Prem Berhasil", receipt));
    if (!sentDm) {
      await m.reply(claraWrap("Auto Order Prem", `Order kamu masuk tapi bot gak bisa DM kamu — chat bot dulu (kirim "halo"), lalu cek .premstatus ${orderId}.`));
    } else if (m.isGroup) {
      await m.reply(claraWrap("Auto Order Prem", `Order kamu masuk — struk dikirim ke DM kamu ya (${orderId}).`));
    }
    await dm(sock, ownerJid(), `[AUTO ORDER PREM] Order ${orderId} masuk: ${produk} ×${qty} ${fmtRupiah(price)} — buyer ${buyer.split("@")[0]} (invoice ${ord.invoice}).`);
  } catch (e) {
    await m.reply(claraWrap("Auto Order Prem", `Order gagal: ${e?.message || e}. Coba lagi atau hubungi owner.`, "error"));
  } finally {
    pendingPrem.delete(buyer);
  }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();
  const text = (m.text || "").trim();

  if (["premkulist", "listpremku"].includes(cmd)) return listProducts(m, { db }, text);
  if (cmd === "premstatus") return statusOrder(m, { db }, text.split(/\s+/)[0]);
  // default: .orderprem / beliprem / premku / akunpremium
  return runPrem(m, { sock, db }, text);
}

export {
  pluginConfig as config, handler,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
  _setStatusTimingsForTest, _resetStatusTimingsForTest,
  _setPremkuHttpForTest, _resetPremkuHttpForTest,
};
