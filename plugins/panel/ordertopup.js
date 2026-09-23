// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ordertopup.js — AUTO ORDER TOPUP PanelPedia (buyer): pilih layanan dari
// panelpediatopup.com → bayar QRIS Pakasir → lunas → order ke API PanelPedia
// OTOMATIS + pantau status (Proses/Sukses/Gagal/Refund) → struk ke DM buyer.
// - .topuplist [keyword]   (alias: pediatopuplist) daftar layanan aktif + harga
// - .ordertopup <id>|<target>[|<server>]  (alias: belitopup, topupgame, pediatopup)
// - .topupstatus <order_id> cek status pesanan (buyer pesan itu / owner)
// Harga = modal API (sesuai level akun: basic/gold/platinum) + markup owner
// (.autoorder markuptopup). Kredensial API owner: .autoorder pediatopup.
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";
import {
  ensureOrderCfg, buildPakasir, fmtRupiah, getOrderTimings,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
} from "../../src/lib/nova-auto-order.js";
import {
  pediaProfile, pediaPriceKey, pediaServices, pediaFindService,
  pediaOrder, pediaStatus, pediaOrderId,
  _setPediaHttpForTest, _resetPediaHttpForTest,
} from "../../src/lib/nova-pediatopup.js";

const pluginConfig = {
  name: "ordertopup",
  alias: ["ordertopup", "belitopup", "topupgame", "pediatopup", "topuplist", "pediatopuplist", "topupstatus"],
  category: "panel",
  description: "Auto Order TopUp PanelPedia — bayar QRIS, topup game/SMM diproses otomatis",
  usage: ".topuplist [keyword] · .ordertopup <id_layanan>|<id_game>[|<server>] · .topupstatus <order_id>",
  example: ".ordertopup 12|98765432|2147",
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

// ── timing seam (status poll beda kebutuhan dari pembayaran) ──
const _statusPoll = { intervalMs: 10000, timeoutMs: 10 * 60 * 1000 };
function _setStatusTimingsForTest(i, t) { _statusPoll.intervalMs = i; _statusPoll.timeoutMs = t; }
function _resetStatusTimingsForTest() { _statusPoll.intervalMs = 10000; _statusPoll.timeoutMs = 10 * 60 * 1000; }

// ── sanitasi target (API nolak karakter berbahaya/xss) ──
function cleanTarget(v) { return String(v || "").trim().replace(/[^a-zA-Z0-9._:@-]/g, "").slice(0, 30); }
function cleanServer(v) { return String(v || "").trim().replace(/\D/g, "").slice(0, 10); }

// ── daftar layanan ──
async function listServices(m, { db }, keyword) {
  const cfg = ensureOrderCfg(db);
  if (!cfg.pediatopup.apiId || !cfg.pediatopup.apiKey) {
    return m.reply(claraWrap("Auto Order TopUp", "Layanan belum siap (owner belum set API PanelPedia).", "error"));
  }
  const r = await pediaServices(cfg);
  if (!r.ok) return m.reply(claraWrap("Auto Order TopUp", `Gak bisa ambil layanan: ${r.error}`, "error"));
  let list = r.list;
  const kw = String(keyword || "").toLowerCase().trim();
  if (kw) list = list.filter((s) => s.game.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw));
  const total = r.list.length;
  if (!list.length) return m.reply(claraWrap("Auto Order TopUp", `Gak ada layanan${kw ? ` yang cocok "${keyword}"` : ""}. Coba keyword lain.`));
  const profKey = await (async () => { const p = await pediaProfile(cfg); return p.ok ? pediaPriceKey(p.data.role) : "basic"; })();
  const markup = Number(cfg.pediatopup.markup || 0);
  const shown = list.slice(0, 15);
  const rows = shown.map((s) => {
    const modal = Number(s.harga?.[profKey] ?? s.harga?.basic ?? 0);
    return `• [${s.id}] ${s.game} — ${s.name}\n   Harga: ${fmtRupiah((Number.isFinite(modal) ? modal : 0) + markup)}`;
  });
  return m.reply(claraWrap("Auto Order TopUp", [
    `Total layanan aktif: ${total}${kw ? ` · cocok "${keyword}": ${list.length}` : ""} (tampil maks 15)`,
    ...(kw ? [] : ["", `Cari: .topuplist <keyword> (contoh: .topuplist mobile legends)`]),
    "",
    ...rows,
    "",
    "Cara order:",
    ".ordertopup <id_layanan>|<id_game>[|<server>",
    "Contoh: .ordertopup 12|98765432|2147",
    "",
    "Lunas → pesanan diproses otomatis, struk dikirim ke DM kamu.",
  ]));
}

// ── cek status pesanan ──
async function statusOrder(m, { sock, db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const id = String(orderId || "").trim();
  if (!id) return m.reply(claraWrap("Auto Order TopUp", novaGuide(".topupstatus <order_id>", ["Order ID ada di struk/DM pesanan kamu."])));
  const rec = cfg.topupOrders?.[id];
  const isOwner = m.sender === ownerJid();
  if (!rec && !isOwner) {
    return m.reply(claraWrap("Auto Order TopUp", `Order ${id} gak ketemu di catatan bot. Cek ID-nya lagi ya.`, "error"));
  }
  if (rec && rec.buyer !== m.sender && !isOwner) {
    return m.reply(claraWrap("Auto Order TopUp", "Order itu bukan punya kamu — cek pakai order_id kamu sendiri ya.", "error"));
  }
  if (!cfg.pediatopup.apiId || !cfg.pediatopup.apiKey) {
    return m.reply(claraWrap("Auto Order TopUp", "API PanelPedia belum di-set owner.", "error"));
  }
  const r = await pediaStatus(cfg, id);
  if (!r.ok) return m.reply(claraWrap("Auto Order TopUp", `Cek status gagal: ${r.error}`, "error"));
  const d = r.data;
  const map = { sukses: "✅ SUKSES", gagal: "❌ GAGAL (hubungi owner buat refund)", refund: "↩️ REFUND (saldo dikembalikan provider)", proses: "⏳ MASIH DIPROSES" };
  const st = String(d.status || "").toLowerCase();
  return m.reply(claraWrap("Status Order TopUp", [
    `Order ID: ${d.order_id || id}`,
    `Layanan: ${d.service || "-"}`,
    `Data: ${d.data_id || "-"}`,
    `Status: ${map[st] || d.status}`,
    ...(d.note ? [`Catatan: ${d.note}`] : []),
    ...(d.price ? [`Harga modal: ${fmtRupiah(d.price)}`] : []),
  ]));
}

// ── flow order inti ──
const pendingTopups = new Set(); // guard 1 order berjalan per buyer

async function runTopup(m, { sock, db }, raw) {
  const cfg = ensureOrderCfg(db);
  const buyer = m.sender;
  const chat = m.chat;

  if (!cfg.on) return m.reply(claraWrap("Auto Order TopUp", "Auto order sedang tidak aktif. Hubungi owner ya.", "error"));
  if (!cfg.pakasir.slug || !cfg.pakasir.apikey) {
    return m.reply(claraWrap("Auto Order TopUp", "Pembayaran belum dikonfigurasi (owner belum set Pakasir).", "error"));
  }
  if (!cfg.pediatopup.apiId || !cfg.pediatopup.apiKey) {
    return m.reply(claraWrap("Auto Order TopUp", "Layanan belum siap (owner belum set API PanelPedia).", "error"));
  }
  if (pendingTopups.has(buyer)) {
    return m.reply(claraWrap("Auto Order TopUp", "Kamu masih punya order berjalan. Tunggu selesai dulu ya.", "error"));
  }

  const [svcRaw, targetRaw, serverRaw] = String(raw || "").split("|").map((v) => (v || "").trim());
  const serviceId = String(svcRaw || "").replace(/\D/g, "");
  const targetId = cleanTarget(targetRaw);
  const targetServer = cleanServer(serverRaw);
  if (!serviceId) {
    return m.reply(claraWrap("Auto Order TopUp", novaGuide(".ordertopup <id_layanan>|<id_game>[|<server>]", [
      "Lihat daftar layanan: .topuplist",
      "Contoh: .ordertopup 12|98765432|2147",
    ])));
  }
  if (!targetId || targetId.length < 4) {
    return m.reply(claraWrap("Auto Order TopUp", "ID game/target minimal 4 karakter (angka/huruf). Contoh: .ordertopup 12|98765432|2147", "error"));
  }

  pendingTopups.add(buyer);
  const { intervalMs, timeoutMs } = getOrderTimings();
  try {
    // harga sesuai level akun + markup owner
    const prof = await pediaProfile(cfg);
    if (!prof.ok) throw new Error(`cek profile gagal: ${prof.error}`);
    const priceKey = pediaPriceKey(prof.data.role);
    const svc = await pediaFindService(cfg, serviceId);
    if (!svc.ok) return m.reply(claraWrap("Auto Order TopUp", svc.error, "error"));
    const modal = Number(svc.svc.harga?.[priceKey] ?? svc.svc.harga?.basic ?? 0);
    if (!Number.isFinite(modal) || modal <= 0) throw new Error("harga layanan gak valid di API");
    const markup = Number(cfg.pediatopup.markup || 0);
    const price = modal + markup;
    const produk = `${svc.svc.game} — ${svc.svc.name}`;
    const orderId = pediaOrderId(buyer);

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
      `Target: ${targetId}${targetServer ? ` (Server ${targetServer})` : ""}`,
      `Total: ${fmtRupiah(price)}`,
      `Pembayaran: QRIS`,
      "",
      qrBuf ? "Scan QR di atas buat bayar." : `Link bayar: ${trx.payment_url || trx.redirect_url || "-"}`,
      "",
      `Order kedaluwarsa otomatis ${Math.round(timeoutMs / 60000)} menit. Lunas = pesanan langsung dikirim ke sistem.`,
    ].join("\n");
    if (qrBuf) await sock.sendMessage(chat, { image: qrBuf, caption: claraWrap("Invoice TopUp", invoiceTextBody) }, { quoted: m });
    else await m.reply(claraWrap("Invoice TopUp", invoiceTextBody));

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
      await m.reply(claraWrap("Auto Order TopUp", `Order ${orderId} dibatalkan. Order lagi kapan pun ya.`));
      return;
    }
    if (status !== "completed") {
      await m.reply(claraWrap("Auto Order TopUp", `Order ${orderId} kedaluwarsa (belum dibayar). Pesanan tidak dibuat.`));
      return;
    }

    // LUNAS → order ke PanelPedia
    await m.reply(claraWrap("Auto Order TopUp", `Pembayaran diterima! Mengirim pesanan ${produk} ke sistem…`));
    const ord = await pediaOrder(cfg, { orderId, serviceId, targetId, targetServer });
    if (!ord.ok) {
      const msgFail = `Order ${orderId} LUNAS tapi pengiriman ke PanelPedia GAGAL: ${ord.error}. Dana diproses manual — owner sudah dihubungi.`;
      await dm(sock, ownerJid(), `[AUTO ORDER TOPUP] Order ${orderId} (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS tapi API gagal: ${ord.error}. Mohon proses manual/refund.`);
      return m.reply(claraWrap("Auto Order TopUp", msgFail, "error"));
    }

    // catat order (buat .topupstatus)
    cfg.topupOrders[orderId] = {
      buyer, service: produk, serviceId, targetId, targetServer,
      price, apiOrderId: ord.data.order_id || orderId, createdAt: Date.now(),
    };
    db.save();

    // pantau status (Proses → Sukses/Gagal/Refund)
    const t1 = Date.now();
    let apiStatus = "Proses";
    while (Date.now() - t1 < _statusPoll.timeoutMs) {
      await new Promise((r) => setTimeout(r, _statusPoll.intervalMs));
      try {
        const st = await pediaStatus(cfg, orderId);
        if (st.ok) apiStatus = String(st.data.status || "Proses");
      } catch { /* sabar */ }
      if (/sukses|gagal|refund/i.test(apiStatus)) break;
    }

    const stLower = apiStatus.toLowerCase();
    if (stLower.includes("sukses")) {
      const receipt = [
        `Order ID: ${orderId}`,
        `Produk: ${produk}`,
        `Target: ${targetId}${targetServer ? ` (Server ${targetServer})` : ""}`,
        `Total: ${fmtRupiah(price)}`,
        `Status: ✅ SUKSES — cek in-game kamu ya.`,
        "",
        `Cek kapan pun: .topupstatus ${orderId}`,
      ].join("\n");
      const sentDm = await dm(sock, buyer, claraWrap("TopUp Berhasil", receipt));
      if (!sentDm) {
        await m.reply(claraWrap("Auto Order TopUp", `TopUp kamu SUKSES tapi bot gak bisa DM kamu — chat bot dulu (kirim "halo"), lalu cek .topupstatus ${orderId}.`));
      } else if (m.isGroup) {
        await m.reply(claraWrap("Auto Order TopUp", `TopUp SUKSES — struk dikirim ke DM kamu ya (${orderId}).`));
      }
      await dm(sock, ownerJid(), `[AUTO ORDER TOPUP] Order ${orderId} SUKSES: ${produk} ${fmtRupiah(price)} — buyer ${buyer.split("@")[0]}.`);
    } else if (stLower.includes("gagal")) {
      await m.reply(claraWrap("Auto Order TopUp", `Order ${orderId} DINYATAKAN GAGAL oleh sistem. Owner sudah dihubungi buat proses refund ya.`, "error"));
      await dm(sock, ownerJid(), `[AUTO ORDER TOPUP] Order ${orderId} GAGAL di provider (${produk}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}). Mohon proses refund buyer.`);
    } else if (stLower.includes("refund")) {
      await m.reply(claraWrap("Auto Order TopUp", `Order ${orderId} di-REFUND oleh sistem (saldo dikembalikan). Cek .topupstatus ${orderId}.`));
      await dm(sock, ownerJid(), `[AUTO ORDER TOPUP] Order ${orderId} REFUND di provider (${produk}, buyer ${buyer.split("@")[0]}).`);
    } else {
      await m.reply(claraWrap("Auto Order TopUp", `Pesanan ${orderId} masih DIPROSES provider (biasanya beberapa menit). Cek statusnya nanti: .topupstatus ${orderId}`));
      await dm(sock, ownerJid(), `[AUTO ORDER TOPUP] Order ${orderId} masih Proses di provider (${produk}, buyer ${buyer.split("@")[0]}).`);
    }
  } catch (e) {
    await m.reply(claraWrap("Auto Order TopUp", `Order gagal: ${e?.message || e}. Coba lagi atau hubungi owner.`, "error"));
  } finally {
    pendingTopups.delete(buyer);
  }
}

async function handler(m, { sock, db: _db, args }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();
  const text = (m.text || "").trim();

  if (["topuplist", "pediatopuplist"].includes(cmd)) {
    return listServices(m, { db }, text);
  }
  if (cmd === "topupstatus") {
    return statusOrder(m, { sock, db }, text.split(/\s+/)[0]);
  }
  // default: .ordertopup / belitopup / topupgame / pediatopup
  return runTopup(m, { sock, db }, text);
}

export {
  pluginConfig as config, handler,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
  _setStatusTimingsForTest, _resetStatusTimingsForTest,
  _setPediaHttpForTest, _resetPediaHttpForTest,
};
