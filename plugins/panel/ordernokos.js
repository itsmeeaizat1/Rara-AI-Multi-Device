// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ordernokos.js — AUTO ORDER NOKOS (nomor kosong) via 5SIM (5sim.net).
// Dari request owner 28 Sep 2026: script website PHP buynokos-website.zip
// (dulu numpang rumahotp.com — provider MATI, domain dijual GoDaddy)
// dijadikan fitur bot auto order no.4 dengan provider hidup 5SIM.
// Alur: .nokoslist lihat harga → .ordernokos <produk>|<negara> → QRIS lunas
// → beli nomor → nomor dikirim → OTP dipantau otomatis → struk DM.
// OTP gak datang → nomor di-cancel (saldo provider balik) + refund WA manual
// owner di-DM. Kredensial: .autoorder nokos <token> · .autoorder markupnokos <persen>.
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  ensureOrderCfg, buildPakasir, fmtRupiah, getOrderTimings,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
} from "../../src/lib/nova-auto-order.js";
import {
  NOKOS_PRODUCTS, NOKOS_COUNTRIES, findProduct, findCountry,
  nokosPrices, cheapestInStock, usdToRupiah, NOKOS_USD_RATE,
  nokosBuy, nokosCheck, nokosCancel,
  nokosOrderId, _setNokosHttpForTest, _resetNokosHttpForTest,
} from "../../src/lib/nova-nokos.js";

const pluginConfig = {
  name: "ordernokos",
  alias: ["ordernokos", "belinokos", "nokos", "nokoslist", "nokosotp", "nokoscancel"],
  category: "panel",
  description: "Auto Order Nokos 5SIM — nomor kosong WhatsApp/Telegram/dll, bayar QRIS, OTP dipantau otomatis",
  usage: ".nokoslist [negara] · .ordernokos <produk>|<negara> · .nokosotp <order_id> · .nokoscancel <order_id>",
  example: ".ordernokos whatsapp|indonesia",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function ownerJid() {
  const n = (config.owner?.number || [])[0] || "";
  const digits = String(n).replace(/\D/g, "");
  return digits ? digits + "@s.whatsapp.net" : "";
}
async function dm(sock, jid, text) {
  if (!sock?.sendMessage || !jid) return false;
  try { await sock.sendMessage(jid, { text }); return true; } catch { return false; }
}

// ── timing seams buat e2e ──
const _otpPoll = { intervalMs: 15000, timeoutMs: 12 * 60 * 1000 };
export function _setOtpTimingsForTest(i, t) { _otpPoll.intervalMs = i; _otpPoll.timeoutMs = t; }
export function _resetOtpTimingsForTest() { _otpPoll.intervalMs = 15000; _otpPoll.timeoutMs = 12 * 60 * 1000; }

const pendingNokos = new Set();
const MAX_LIST_ROWS = 20;

function fmtUsd(v) { return "$" + Number(v || 0).toFixed(2); }
function fmtCount(n) { return Number(n || 0).toLocaleString("id-ID"); }

// ── .nokoslist [negara] — harga produk populer di satu negara ──
async function listPrices(m, db, argCountry) {
  const negara = argCountry ? findCountry(argCountry) : findCountry("indonesia");
  if (!negara) {
    return m.reply(claraWrap("Auto Order Nokos", `Negara "${argCountry}" gak dikenal. Yang populer: ${NOKOS_COUNTRIES.map((c) => c.label).join(", ")}`, "error"));
  }
  const cfg = ensureOrderCfg(db);
  const rows = [];
  for (const p of NOKOS_PRODUCTS.slice(0, MAX_LIST_ROWS)) {
    try {
      const r = await nokosPrices(negara.slug, p.slug);
      if (!r.ok) continue;
      const best = cheapestInStock(r.list);
      if (!best) { rows.push(`• ${p.label}: stok habis`); continue; }
      const rp = usdToRupiah(best.cost);
      const markup = Number(cfg.nokos.markupPct || 0);
      const harga = Math.ceil((rp * (100 + markup)) / 100 / 100) * 100;
      rows.push(`• ${p.label}: ${fmtRupiah(harga)} (${fmtUsd(best.cost)}) — stok ${fmtCount(best.count)}`);
    } catch { /* satu produk gagal gak boleh matiin semua */ }
  }
  if (!rows.length) {
    return m.reply(claraWrap("Auto Order Nokos", `Harga produk di ${negara.label} gak bisa diambil sekarang — coba lagi nanti.`, "error"));
  }
  return m.reply(claraWrap(`Nokos ${negara.label}`, [
    `Kurs estimasi: 1 USD ≈ ${fmtRupiah(NOKOS_USD_RATE)}`,
    ...rows,
    "",
    `Beli: .ordernokos <produk>|<negara> — contoh: .ordernokos whatsapp|${negara.slug}`,
    `Negara lain: .nokoslist <negara> (mis. .nokoslist philippines)`,
  ]));
}

// ── .ordernokos <produk>|<negara> — core flow ──
async function runNokos(m, { sock, db }, raw) {
  const cfg = ensureOrderCfg(db);
  const buyer = m.sender;
  const chat = m.chat;

  if (!cfg.on) return m.reply(claraWrap("Auto Order Nokos", "Auto order sedang tidak aktif. Hubungi owner ya.", "error"));
  if (!cfg.pakasir.slug || !cfg.pakasir.apikey) {
    return m.reply(claraWrap("Auto Order Nokos", "Pembayaran belum dikonfigurasi (owner belum set Pakasir).", "error"));
  }
  if (!cfg.nokos.apiKey) {
    return m.reply(claraWrap("Auto Order Nokos", "Layanan belum siap (owner belum set token 5SIM).", "error"));
  }
  if (pendingNokos.has(buyer)) {
    return m.reply(claraWrap("Auto Order Nokos", "Kamu masih punya order nokos berjalan. Tunggu selesai dulu ya (cek: .nokosotp <order_id>).", "error"));
  }

  const [prodRaw, countryRaw] = String(raw || "").split("|").map((v) => (v || "").trim());
  if (!prodRaw || !countryRaw) {
    return m.reply(claraWrap("Auto Order Nokos", [
      "Format: .ordernokos <produk>|<negara>",
      "Cek harga dulu: .nokoslist [negara]",
      "Contoh: .ordernokos whatsapp|indonesia · .ordernokos telegram|philippines",
    ]));
  }
  const prod = findProduct(prodRaw);
  if (!prod) return m.reply(claraWrap("Auto Order Nokos", `Produk "${prodRaw}" gak dikenal. Lihat daftar: .nokoslist`, "error"));
  const negara = findCountry(countryRaw);
  if (!negara) return m.reply(claraWrap("Auto Order Nokos", `Negara "${countryRaw}" gak dikenal. Yang populer: ${NOKOS_COUNTRIES.map((c) => c.label).join(", ")}`, "error"));

  pendingNokos.add(buyer);
  const { intervalMs, timeoutMs } = getOrderTimings();
  try {
    // harga modal live (operator termurah yang ada stok)
    const pr = await nokosPrices(negara.slug, prod.slug);
    if (!pr.ok) throw new Error(pr.error);
    const best = cheapestInStock(pr.list);
    if (!best) {
      return m.reply(claraWrap("Auto Order Nokos", `Stok nomor ${prod.label} ${negara.label} sedang HABIS. Coba negara lain (.nokoslist <negara>) atau nanti lagi.`, "error"));
    }
    const modalRp = usdToRupiah(best.cost);
    if (!modalRp) throw new Error("harga modal gak valid dari 5SIM");
    const markup = Number(cfg.nokos.markupPct || 0);
    const price = Math.ceil((modalRp * (100 + markup)) / 100 / 100) * 100;
    const orderId = nokosOrderId(buyer);

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

    const invoiceBody = [
      `Order ID: ${orderId}`,
      `Produk: ${prod.label}`,
      `Negara: ${negara.label}`,
      `Total: ${fmtRupiah(price)}`,
      `Pembayaran: QRIS`,
      "",
      qrBuf ? "Scan QR di atas buat bayar." : `Link bayar: ${trx.payment_url || trx.redirect_url || "-"}`,
      "",
      `Order kedaluwarsa otomatis ${Math.round(timeoutMs / 60000)} menit. Lunas = nomor langsung dibeliin.`,
    ].join("\n");
    if (qrBuf) await sock.sendMessage(chat, { image: qrBuf, caption: claraWrap("Invoice Nokos", invoiceBody) }, { quoted: m });
    else await m.reply(claraWrap("Invoice Nokos", invoiceBody));

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
      await m.reply(claraWrap("Auto Order Nokos", `Order ${orderId} dibatalkan. Order lagi kapan pun ya.`));
      return;
    }
    if (status !== "completed") {
      await m.reply(claraWrap("Auto Order Nokos", `Order ${orderId} kedaluwarsa (belum dibayar). Nomor tidak dibeli.`));
      return;
    }

    // LUNAS → beli nomor di 5SIM
    await m.reply(claraWrap("Auto Order Nokos", `Pembayaran diterima! Membeli nomor ${prod.label} ${negara.label}…`));
    const buy = await nokosBuy(cfg, { country: negara.slug, operator: best.operator, product: prod.slug });
    if (!buy.ok) {
      const msgFail = `Order ${orderId} LUNAS tapi pembelian nomor di 5SIM GAGAL: ${buy.error}. Dana diproses manual — owner sudah dihubungi.`;
      await dm(sock, ownerJid(), `[AUTO ORDER NOKOS] Order ${orderId} (${prod.label} ${negara.label}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) LUNAS tapi 5SIM gagal: ${buy.error}. Mohon proses manual/refund.`);
      return m.reply(claraWrap("Auto Order Nokos", msgFail, "error"));
    }

    // catat order
    cfg.nokos.orders[orderId] = {
      buyer, product: prod.label, productSlug: prod.slug, country: negara.label,
      countrySlug: negara.slug, phone: buy.data.phone, fivesimId: buy.data.id,
      operator: best.operator, modalUsd: best.cost, priceRp: price,
      status: "WAITING_OTP", otp: null, createdAt: Date.now(),
    };
    db.save();

    const notifBody = [
      `Order ID: ${orderId}`,
      `Produk: ${prod.label} — ${negara.label}`,
      `Nomor: ${buy.data.phone}`,
      `Total: ${fmtRupiah(price)}`,
      "",
      "Masukin nomor ini ke aplikasi tujuan, minta kirim OTP.",
      `Bot otomatis pantau OTP masuk (maks ~${Math.round(_otpPoll.timeoutMs / 60000)} menit).`,
      "Cek manual kapan pun: .nokosotp " + orderId,
    ].join("\n");
    await m.reply(claraWrap("Nomor Nokos Dibeli", notifBody));
    await dm(sock, ownerJid(), `[AUTO ORDER NOKOS] Order ${orderId} LUNAS: ${prod.label} ${negara.label} → nomor ${buy.data.phone} (${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}). Pantau OTP…`);

    // pantau OTP sampai RECEIVED / timeout
    const t1 = Date.now();
    let otpCode = null;
    let apiStatus = "PENDING";
    while (Date.now() - t1 < _otpPoll.timeoutMs) {
      await new Promise((r) => setTimeout(r, _otpPoll.intervalMs));
      try {
        const ck = await nokosCheck(cfg, buy.data.id);
        if (ck.ok) {
          apiStatus = ck.data.status;
          if (apiStatus === "RECEIVED" && ck.data.sms?.[0]?.code) {
            otpCode = String(ck.data.sms[0].code);
            break;
          }
          if (apiStatus === "CANCELED" || apiStatus === "BANNED" || apiStatus === "TIMEOUT") break;
        }
      } catch { /* network sabar */ }
    }

    const rec = cfg.nokos.orders[orderId];
    if (otpCode) {
      rec.status = "RECEIVED";
      rec.otp = otpCode;
      db.save();
      const otpBody = [
        `Order ID: ${orderId}`,
        `Nomor: ${rec.phone}`,
        `Produk: ${prod.label} — ${negara.label}`,
        `Kode OTP: ${otpCode}`,
        "",
        "Selesai — nomor + OTP kamu udah lengkap ya.",
      ].join("\n");
      const sentDm = await dm(sock, buyer, claraWrap("OTP Nokos Diterima", otpBody));
      if (!sentDm) {
        await m.reply(claraWrap("Auto Order Nokos", `OTP kamu SUDAH DATANG tapi bot gak bisa DM kamu — chat bot dulu (kirim "halo"), lalu: .nokosotp ${orderId}`));
      } else if (m.isGroup) {
        await m.reply(claraWrap("Auto Order Nokos", `OTP datang — dikirim ke DM kamu ya (${orderId}).`));
      }
      await dm(sock, ownerJid(), `[AUTO ORDER NOKOS] Order ${orderId} OTP diterima (${prod.label}, buyer ${buyer.split("@")[0]}). Selesai.`);
    } else {
      // OTP gak datang → cancel biar saldo provider balik, refund WA manual
      rec.status = "NO_OTP_CANCELED";
      let cancelNote = "";
      try {
        const cx = await nokosCancel(cfg, buy.data.id);
        cancelNote = cx.ok ? "nomor dibatalkan, dana kembali ke saldo 5SIM owner" : `pembatalan gagal: ${cx.error}`;
      } catch (e) { cancelNote = `pembatalan gagal: ${e?.message || e}`; }
      rec.status = "NO_OTP_CANCELED";
      db.save();
      await m.reply(claraWrap("Auto Order Nokos", [
        `Order ${orderId}: OTP gak datang dalam ${Math.round(_otpPoll.timeoutMs / 60000)} menit.`,
        `Di sisi provider: ${cancelNote}.`,
        "Pembayaran WA kamu akan direfund owner secara manual — owner sudah di-DM.",
      ].join("\n"), "error"));
      await dm(sock, ownerJid(), `[AUTO ORDER NOKOS] Order ${orderId} (${prod.label}, ${fmtRupiah(price)}, buyer ${buyer.split("@")[0]}) OTP TIDAK datang. ${cancelNote}. Mohon refund buyer manual.`);
    }
  } catch (e) {
    await m.reply(claraWrap("Auto Order Nokos", `Order gagal: ${e?.message || e}. Coba lagi atau hubungi owner.`, "error"));
  } finally {
    pendingNokos.delete(buyer);
  }
}

// ── .nokosotp <order_id> — cek status/OTP ──
async function otpOrder(m, { sock, db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const rec = cfg.nokos.orders[String(orderId || "").trim()];
  if (!rec) return m.reply(claraWrap("Auto Order Nokos", `Order "${orderId}" gak ketemu. Id kamu dapat saat order (format NOK-…).`, "error"));
  if (rec.buyer !== m.sender) return m.reply(claraWrap("Auto Order Nokos", "Order itu punya orang lain — gak bisa dicek dari sini.", "error"));
  if (rec.otp) {
    return m.reply(claraWrap("OTP Nokos", `Order ${orderId}\nNomor: ${rec.phone}\nKode OTP: ${rec.otp}`));
  }
  const ck = await nokosCheck(cfg, rec.fivesimId);
  if (!ck.ok) return m.reply(claraWrap("Auto Order Nokos", ck.error, "error"));
  if (ck.data.status === "RECEIVED" && ck.data.sms?.[0]?.code) {
    rec.status = "RECEIVED";
    rec.otp = String(ck.data.sms[0].code);
    db.save();
    return m.reply(claraWrap("OTP Nokos", `Order ${orderId}\nNomor: ${rec.phone}\nKode OTP: ${rec.otp}`));
  }
  const statusLabel = ck.data.status === "PENDING" ? "OTP belum masuk — sabar ya, bot juga pantau otomatis." : `Status provider: ${ck.data.status}`;
  return m.reply(claraWrap("Auto Order Nokos", `Order ${orderId}\nNomor: ${rec.phone}\n${statusLabel}`));
}

// ── .nokoscancel <order_id> — batalkan (refund provider) ──
async function cancelOrder(m, { sock, db }, orderId) {
  const cfg = ensureOrderCfg(db);
  const rec = cfg.nokos.orders[String(orderId || "").trim()];
  if (!rec) return m.reply(claraWrap("Auto Order Nokos", `Order "${orderId}" gak ketemu.`, "error"));
  if (rec.buyer !== m.sender) return m.reply(claraWrap("Auto Order Nokos", "Order itu punya orang lain — gak bisa dibatalkan dari sini.", "error"));
  if (rec.otp) return m.reply(claraWrap("Auto Order Nokos", `Order ${orderId} udah dapet OTP (${rec.otp}) — gak bisa dibatalkan.`, "error"));
  if (rec.status === "NO_OTP_CANCELED") return m.reply(claraWrap("Auto Order Nokos", `Order ${orderId} udah dibatalkan sebelumnya.`, "error"));
  const cx = await nokosCancel(cfg, rec.fivesimId);
  if (!cx.ok) return m.reply(claraWrap("Auto Order Nokos", `Gagal cancel di 5SIM: ${cx.error}`, "error"));
  rec.status = "CANCELED_BUYER";
  db.save();
  await dm(sock, ownerJid(), `[AUTO ORDER NOKOS] Buyer ${m.sender.split("@")[0]} cancel order ${orderId} (${rec.product}, ${fmtRupiah(rec.priceRp)}). Dana provider balik ke saldo 5SIM — refund pembayaran WA ke buyer mohon proses manual.`);
  return m.reply(claraWrap("Auto Order Nokos", [
    `Order ${orderId} dibatalkan.`,
    "Dana di sisi provider balik ke saldo owner. Refund pembayaran WA kamu diproses owner manual — sudah di-DM.",
  ].join("\n")));
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();
  const text = (m.text || "").trim();
  const first = text.split(/\s+/)[0];

  if (cmd === "nokoslist") return listPrices(m, db, first);
  if (cmd === "nokosotp") return otpOrder(m, { sock, db }, first);
  if (cmd === "nokoscancel") return cancelOrder(m, { sock, db }, first);
  // default: .ordernokos / belinokos / nokos
  return runNokos(m, { sock, db }, text);
}

export {
  pluginConfig as config, handler,
  _setPakasirFactoryForTest, _resetPakasirFactoryForTest,
  _setOrderTimingsForTest, _resetOrderTimingsForTest,
  _setNokosHttpForTest, _resetNokosHttpForTest,
};
