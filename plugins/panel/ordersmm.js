// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ordersmm.js — AUTO ORDER SMM Pacific Pedia (buyer): pilih layanan sosmed
// (followers/likes/views/dll) dari api.pacific-pedia.co.id → bayar QRIS
// Pakasir → lunas → pesanan otomatis ke API → pantau status → struk DM.
// - .smmlist [keyword]    daftar layanan SMM aktif (filter kategori/nama)
// - .ordersmm <sid>|<target>|<jumlah>   (alias: belismm, ordersosmed, pacific)
// - .smmstatus <order_id> cek status pesanan (buyer pesan itu / owner)
// - .smmrefill <order_id> ajukan refill layanan bergaransi
// Harga = modal API (rate 1000 = per 1000 pesanan; rate 1 = per paket)
// + markup persen owner (.autoorder markupsmm). API key: .autoorder pacific.
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import {
  ensureOrderCfg, buildPakasir, fmtRupiah, getOrderTimings,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
} from "../../src/lib/rara-auto-order.js";
import {
  pacProfile, pacServices, pacFindService, pacPrice,
  pacOrder, pacStatus, pacRefill, smmOrderId,
  _setPacificHttpForTest, _resetPacificHttpForTest,
} from "../../src/lib/rara-pacific.js";

const pluginConfig = {
  name: "ordersmm",
  alias: ["ordersmm", "belismm", "ordersosmed", "pacific", "smmlist", "smmstatus", "smmrefill"],
  category: "panel",
  description: "Auto Order SMM Pacific — bayar QRIS, followers/likes/views diproses otomatis",
  usage: ".smmlist [keyword] · .ordersmm <sid>|<target>|<jumlah> · .smmstatus <order_id> · .smmrefill <order_id>",
  example: ".ordersmm 12|username_ig|1000",
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

// target SMM = link/username, buang spasi (anti-injeksi sederhana)
function cleanTarget(v) { return String(v || "").trim().replace(/\s+/g, "").slice(0, 120); }

// ── daftar layanan ──
async function listServices(m, { db }, keyword) {
  const cfg = ensureOrderCfg(db);
  if (!cfg.pacific.apiKey) {
    return m.reply(raraWrap("Auto Order SMM", "Layanan belum siap (owner belum set API Pacific).", "error"));
  }
  const r = await pacServices(cfg);
  if (!r.ok) return m.reply(raraWrap("Auto Order SMM", `Gak bisa ambil layanan: ${r.error}`, "error"));
  let list = r.list;
  const kw = String(keyword || "").toLowerCase().trim();
  if (kw) list = list.filter((s) => s.kategori.toLowerCase().includes(kw) || s.layanan.toLowerCase().includes(kw));
  const total = r.list.length;
  if (!list.length) return m.reply(raraWrap("Auto Order SMM", `Gak ada layanan${kw ? ` yang cocok "${keyword}"` : ""}. Coba keyword lain.`));
  const markup = Number(cfg.pacific.markupPct || 0);
  const shown = list.slice(0, 15);
  const rows = shown.map((s) => {
    const satuan = s.rate === "1" ? "per paket" : "per 1000";
    const modal = s.rate === "1" ? s.harga : s.harga;
    const jual = Math.ceil(modal * (100 + markup) / 100);
    return `• [${s.sid}] ${s.kategori} — ${s.layanan}\n   Min ${s.min.toLocaleString("id-ID")} · Maks ${s.max.toLocaleString("id-ID")} · ${fmtRupiah(jual)} ${satuan}${s.refill ? " · 🔁 refill" : ""}`;
  });
  return m.reply(raraWrap("Auto Order SMM", [
    `Total layanan aktif: ${total.toLocaleString("id-ID")}${kw ? ` · cocok "${keyword}": ${list.length}` : ""} (tampil maks 15)`,
    ...(kw ? [] : ["", `Cari: .smmlist <keyword> (contoh: .smmlist followers)`]),
    "",
    ...rows,
    "",
    "Cara order:",
    ".ordersmm <sid>|<target>|<jumlah>",
    "Contoh: .ordersmm 12|username_ig|1000",
    "",
    "Lunas → pesanan diproses otomatis, struk dikirim ke DM kamu.",
  ]));
}

// ── cari order internal (id SMM-… atau id Pacific) ──
function findOrder(cfg, id) {
  const oid = String(id || "").trim();
  if (cfg.smmOrders?.[oid]) return { rec: cfg.smmOrders[oid], key: oid };
  const byPacific = Object.entries(cfg.smmOrders || {}).find(([, o]) => String(o.pacificId) === oid);
  if (byPacific) return { rec: byPacific[1], key: byPacific[0] };
  return null;
}

// ── cek status pesanan ──
async function statusOrder(m, { db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const isOwner = m.sender === ownerJid();
  const found = findOrder(cfg, orderId);
  if (!found) return m.reply(raraWrap("Auto Order SMM", `Order ${orderId} gak ketemu di catatan bot. Cek ID-nya lagi ya.`, "error"));
  if (found.rec.buyer !== m.sender && !isOwner) {
    return m.reply(raraWrap("Auto Order SMM", "Order itu bukan punya kamu — cek pakai order_id kamu sendiri ya.", "error"));
  }
  if (!cfg.pacific.apiKey) return m.reply(raraWrap("Auto Order SMM", "API Pacific belum di-set owner.", "error"));
  const r = await pacStatus(cfg, found.rec.pacificId);
  if (!r.ok) return m.reply(raraWrap("Auto Order SMM", `Cek status gagal: ${r.error}`, "error"));
  const d = r.data;
  const map = { success: "✅ SUKSES", partial: "⚠️ PARSIAL (sebagian terkirim)", error: "❌ ERROR (hubungi owner)", pending: "⏳ PENDING (dalam antrean)", processing: "🔄 DIPROSES", inprogress: "🔄 DIPROSES", cancel: "❌ DIBATALKAN" };
  const st = String(d.status || "").toLowerCase();
  return m.reply(raraWrap("Status Order SMM", [
    `Order ID: ${found.key}`,
    `ID Pacific: ${d.id || found.rec.pacificId}`,
    `Layanan: ${found.rec.service}`,
    `Target: ${found.rec.target}`,
    `Jumlah: ${found.rec.jumlah.toLocaleString("id-ID")}`,
    `Status: ${map[st] || d.status || "-"}`,
    ...(d.start_count !== undefined ? [`Start count: ${d.start_count}`] : []),
    ...(d.remains !== undefined ? [`Sisa: ${d.remains}`] : []),
  ]));
}

// ── ajukan refill ──
async function refillOrder(m, { sock, db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const isOwner = m.sender === ownerJid();
  const found = findOrder(cfg, orderId);
  if (!found) return m.reply(raraWrap("Auto Order SMM", `Order ${orderId} gak ketemu di catatan bot.`, "error"));
  if (found.rec.buyer !== m.sender && !isOwner) {
    return m.reply(raraWrap("Auto Order SMM", "Order itu bukan punya kamu.", "error"));
  }
  if (!found.rec.refill) {
    return m.reply(raraWrap("Auto Order SMM", "Layanan pesanan itu gak bergaransi refill. Cek info refill di .smmlist ya.", "error"));
  }
  const r = await pacRefill(cfg, found.rec.pacificId);
  if (!r.ok) return m.reply(raraWrap("Auto Order SMM", `Refill gagal: ${r.error}`, "error"));
  found.rec.refillId = r.data?.id || null;
  db.save();
  await m.reply(raraWrap("Refill Diajukan", [
    `Order ID: ${found.key}`,
    ...(r.data?.id ? [`ID Refill: ${r.data.id}`] : []),
    ...(r.data?.pesan ? [`Info: ${r.data.pesan}`] : []),
    "Refill diproses provider — cek statusnya nanti lewat .smmstatus.",
  ]));
  await dm(sock, ownerJid(), `[AUTO ORDER SMM] Refill diajukan order ${found.key} (pacific ${found.rec.pacificId}) oleh ${m.sender.split("@")[0]}.`);
}

// ── flow order inti ──
const pendingSmm = new Set(); // guard 1 order berjalan per buyer

async function runSmm(m, { sock, db }, raw) {
  const cfg = ensureOrderCfg(db);
  const buyer = m.sender;
  const chat = m.chat;

  if (!cfg.on) return m.reply(raraWrap("Auto Order SMM", "Auto order sedang tidak aktif. Hubungi owner ya.", "error"));
  if (!cfg.pakasir.slug || !cfg.pakasir.apikey) {
    return m.reply(raraWrap("Auto Order SMM", "Pembayaran belum dikonfigurasi (owner belum set Pakasir).", "error"));
  }
  if (!cfg.pacific.apiKey) {
    return m.reply(raraWrap("Auto Order SMM", "Layanan belum siap (owner belum set API Pacific).", "error"));
  }
  if (pendingSmm.has(buyer)) {
    return m.reply(raraWrap("Auto Order SMM", "Kamu masih punya order berjalan. Tunggu selesai dulu ya.", "error"));
  }

  const [sidRaw, targetRaw, qtyRaw] = String(raw || "").split("|").map((v) => (v || "").trim());
  const sid = String(sidRaw || "").replace(/\D/g, "");
  const target = cleanTarget(targetRaw);
  const jumlah = parseInt(qtyRaw, 10);
  if (!sid || !target || !Number.isFinite(jumlah)) {
    return m.reply(raraWrap("Auto Order SMM", raraGuide(".ordersmm <sid>|<target>|<jumlah>", [
      "Lihat daftar layanan: .smmlist",
      "Contoh: .ordersmm 12|username_ig|1000",
    ])));
  }
  if (target.length < 2) {
    return m.reply(raraWrap("Auto Order SMM", "Target (link/username) terlalu pendek. Contoh: .ordersmm 12|username_ig|1000", "error"));
  }

  pendingSmm.add(buyer);
  const { intervalMs, timeoutMs } = getOrderTimings();
  try {
    const prof = await pacProfile(cfg);
    if (!prof.ok) throw new Error(`cek profile gagal: ${prof.error}`);
    const svc = await pacFindService(cfg, sid);
    if (!svc.ok) return m.reply(raraWrap("Auto Order SMM", svc.error, "error"));
    if (jumlah < svc.svc.min || jumlah > svc.svc.max) {
      return m.reply(raraWrap("Auto Order SMM", `Jumlah harus antara ${svc.svc.min.toLocaleString("id-ID")} - ${svc.svc.max.toLocaleString("id-ID")} buat layanan ini.`, "error"));
    }
    const modal = pacPrice(svc.svc, jumlah);
    if (!Number.isFinite(modal) || modal <= 0) throw new Error("harga layanan gak valid di API");
    const markup = Number(cfg.pacific.markupPct || 0);
    const price = Math.ceil(modal * (100 + markup) / 100);
    const produk = `${svc.svc.kategori} — ${svc.svc.layanan}`;
    const orderId = smmOrderId(buyer);

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
      `Target: ${target}`,
      `Jumlah: ${jumlah.toLocaleString("id-ID")}`,
      `Total: ${fmtRupiah(price)}`,
      `Pembayaran: QRIS`,
      "",
      qrBuf ? "Scan QR di atas buat bayar." : `Link bayar: ${trx.payment_url || trx.redirect_url || "-"}`,
      "",
      `Order kedaluwarsa otomatis ${Math.round(timeoutMs / 60000)} menit. Lunas = pesanan langsung dikirim ke sistem.`,
    ].join("\n");
    if (qrBuf) await sock.sendMessage(chat, { image: qrBuf, caption: raraWrap("Invoice SMM", invoiceTextBody) }, { quoted: m });
    else await m.reply(raraWrap("Invoice SMM", invoiceTextBody));

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
      await m.reply(raraWrap("Auto Order SMM", `Order ${orderId} dibatalkan. Order lagi kapan pun ya.`));
      return;
    }
    if (status !== "completed") {
      await m.reply(raraWrap("Auto Order SMM", `Order ${orderId} kedaluwarsa (belum dibayar). Pesanan tidak dibuat.`));
      return;
    }

    // LUNAS → order ke Pacific
    await m.reply(raraWrap("Auto Order SMM", `Pembayaran diterima! Mengirim pesanan ${produk} ke sistem…`));
    const ord = await pacOrder(cfg, { sid, target, jumlah });
    if (!ord.ok) {
      const msgFail = `Order ${orderId} LUNAS tapi pengiriman ke Pacific GAGAL: ${ord.error}. Dana diproses manual — owner sudah dihubungi.`;
      await dm(sock, ownerJid(), `[AUTO ORDER SMM] Order ${orderId} (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS tapi API gagal: ${ord.error}. Mohon proses manual/refund.`);
      return m.reply(raraWrap("Auto Order SMM", msgFail, "error"));
    }

    // catat order (buat .smmstatus / .smmrefill)
    cfg.smmOrders[orderId] = {
      buyer, service: produk, sid, target, jumlah, price,
      pacificId: String(ord.data.id), status: String(ord.data.status || "Pending"),
      refill: !!svc.svc.refill, refillId: null, createdAt: Date.now(),
    };
    db.save();

    // pantau status sebentar (SMM bisa lama — sisa via .smmstatus)
    const t1 = Date.now();
    let apiStatus = String(ord.data.status || "Pending");
    while (Date.now() - t1 < _statusPoll.timeoutMs) {
      await new Promise((r) => setTimeout(r, _statusPoll.intervalMs));
      try {
        const st = await pacStatus(cfg, ord.data.id);
        if (st.ok) apiStatus = String(st.data.status || apiStatus);
      } catch { /* sabar */ }
      if (/success|error|partial|cancel/i.test(apiStatus)) break;
    }
    const rec = cfg.smmOrders[orderId];
    rec.status = apiStatus;
    db.save();

    const stLower = apiStatus.toLowerCase();
    if (stLower.includes("success")) {
      const receipt = [
        `Order ID: ${orderId}`,
        `ID Pacific: ${rec.pacificId}`,
        `Produk: ${produk}`,
        `Target: ${target}`,
        `Jumlah: ${jumlah.toLocaleString("id-ID")}`,
        `Total: ${fmtRupiah(price)}`,
        `Status: ✅ SUKSES — cek akun kamu ya.`,
        "",
        `Cek kapan pun: .smmstatus ${orderId}`,
        ...(rec.refill ? [`Garansi refill: .smmrefill ${orderId}`] : []),
      ].join("\n");
      const sentDm = await dm(sock, buyer, raraWrap("Order SMM Berhasil", receipt));
      if (!sentDm) {
        await m.reply(raraWrap("Auto Order SMM", `Order SMM kamu SUKSES tapi bot gak bisa DM kamu — chat bot dulu (kirim "halo"), lalu cek .smmstatus ${orderId}.`));
      } else if (m.isGroup) {
        await m.reply(raraWrap("Auto Order SMM", `Order SMM SUKSES — struk dikirim ke DM kamu ya (${orderId}).`));
      }
      await dm(sock, ownerJid(), `[AUTO ORDER SMM] Order ${orderId} SUKSES: ${produk} ×${jumlah} ${fmtRupiah(price)} — buyer ${buyer.split("@")[0]}.`);
    } else if (stLower.includes("error") || stLower.includes("cancel")) {
      await m.reply(raraWrap("Auto Order SMM", `Order ${orderId} ERROR/DIBATALKAN di sistem. Owner sudah dihubungi ya. Cek: .smmstatus ${orderId}`, "error"));
      await dm(sock, ownerJid(), `[AUTO ORDER SMM] Order ${orderId} ERROR di provider (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}). Mohon proses refund buyer.`);
    } else if (stLower.includes("partial")) {
      await m.reply(raraWrap("Auto Order SMM", `Order ${orderId} PARSIAL (sebagian terkirim). Detail: .smmstatus ${orderId}`));
      await dm(sock, ownerJid(), `[AUTO ORDER SMM] Order ${orderId} PARSIAL di provider (${produk}, buyer ${buyer.split("@")[0]}).`);
    } else {
      await m.reply(raraWrap("Auto Order SMM", `Pesanan ${orderId} masih DIPROSES provider (SMM kadang butuh waktu lama). Cek statusnya nanti: .smmstatus ${orderId}`));
      await dm(sock, ownerJid(), `[AUTO ORDER SMM] Order ${orderId} masih diproses provider (${produk}, buyer ${buyer.split("@")[0]}).`);
    }
  } catch (e) {
    await m.reply(raraWrap("Auto Order SMM", `Order gagal: ${e?.message || e}. Coba lagi atau hubungi owner.`, "error"));
  } finally {
    pendingSmm.delete(buyer);
  }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();
  const text = (m.text || "").trim();

  if (cmd === "smmlist") return listServices(m, { db }, text);
  if (cmd === "smmstatus") return statusOrder(m, { db }, text.split(/\s+/)[0]);
  if (cmd === "smmrefill") return refillOrder(m, { sock, db }, text.split(/\s+/)[0]);
  // default: .ordersmm / belismm / ordersosmed / pacific
  return runSmm(m, { sock, db }, text);
}

export {
  pluginConfig as config, handler,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
  _setStatusTimingsForTest, _resetStatusTimingsForTest,
  _setPacificHttpForTest, _resetPacificHttpForTest,
};
