// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .beli2 — Beli produk dari toko2 + pilih metode pembayaran (user side)
 *
 * Flow:
 * 1. .beli2 <kode> → lihat detail produk, generate invoice
 * 2. .beli2 bayar <invoice> <metode> → pilih metode pembayaran
 * 3. .beli2 cek <invoice> → cek status invoice
 * 4. .beli2 katalog → lihat semua produk
 */

import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getProducts, getProduct, createInvoice, getInvoice, updateInvoice,
  getActivePayments, formatRupiah, formatStock, formatDate, statusText,
  getOwnerJid, updateStock,
} from "../../src/lib/nova-toko2.js";
import config from "../../config.js";
import fs from "fs";

const pluginConfig = {
  name: "beli2",
  alias: ["beli2"],
  category: "store",
  description: "Beli produk dari toko + invoice & pilih metode pembayaran",
  usage: ".beli2 <kode/katalog/bayar/cek>",
  example: ".beli2 PRD-001",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).trim());
    const action = (args.shift() || "").toLowerCase();

    // ============================================================
    // KATALOG — list semua produk
    // ============================================================
    if (action === "katalog" || action === "list" || action === "produk") {
      const products = getProducts();
      if (!products.length) {
        return m.reply(claraWrap("Beli2", toSC("Belum ada produk tersedia.")));
      }
      const lines = [""];
      for (const p of products) {
        const available = p.stock > 0 || p.stock === -1;
        lines.push(p.id + " — " + p.name);
        lines.push(toSC("Harga") + ": " + formatRupiah(p.price) + " | " + toSC("Stok") + ": " + formatStock(p.stock));
        if (p.desc) lines.push(toSC("Desc") + ": " + p.desc);
        lines.push("");
      }
      lines.push("Beli: .beli2 <kode>");
      return m.reply(novaBox("KATALOG TOKO", lines));
    }

    // ============================================================
    // CEK — cek status invoice
    // ============================================================
    if (action === "cek" || action === "status") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Beli2", "Format: .beli2 cek <invoice>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Beli2", toSC("Invoice tidak ditemukan.")));
      if (inv.buyerJid !== m.sender && !m.isOwner) {
        return m.reply(claraWrap("Beli2", toSC("Bukan invoice Anda.")));
      }
      const lines = [
        "",
        toSC("Kode") + ": " + inv.code,
        toSC("Produk") + ": " + inv.productName,
        toSC("Total") + ": " + formatRupiah(inv.total),
        toSC("Metode") + ": " + (inv.paymentMethod || "-"),
        toSC("Status") + ": " + statusText(inv.status),
        toSC("Dibuat") + ": " + formatDate(inv.createdAt),
      ];
      return m.reply(novaBox("STATUS INVOICE", lines));
    }

    // ============================================================
    // BAYAR — pilih metode pembayaran
    // ============================================================
    if (action === "bayar" || action === "pay") {
      const kode = (args[0] || "").toUpperCase();
      const metode = (args[1] || "").toLowerCase();
      if (!kode || !metode) {
        return m.reply(claraWrap("Beli2", "Format: .beli2 bayar <invoice> <metode>\n\nLihat metode: .beli2 metode"));
      }
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Beli2", toSC("Invoice tidak ditemukan.")));
      if (inv.buyerJid !== m.sender && !m.isOwner) {
        return m.reply(claraWrap("Beli2", toSC("Bukan invoice Anda.")));
      }
      if (inv.status !== "pending") {
        return m.reply(claraWrap("Beli2", toSC("Status invoice") + ": " + statusText(inv.status) + ". " + toSC("Tidak bisa ubah metode.")));
      }

      // Cari metode
      const payments = getActivePayments();
      const selected = payments.find((p) => p.value === metode || p.label.toLowerCase() === metode);
      if (!selected) {
        return m.reply(claraWrap("Beli2", toSC("Metode tidak tersedia.") + " Ketik .beli2 metode untuk lihat."));
      }

      updateInvoice(kode, { paymentMethod: selected.label, status: "paid" });

      // Kirim detail pembayaran ke buyer
      let payLines = [
        "",
        toSC("Kode") + ": " + inv.code,
        toSC("Total") + ": " + formatRupiah(inv.total),
        toSC("Metode") + ": " + selected.label,
        "",
      ];

      if (selected.type === "qris") {
        payLines.push(toSC("Scan QRIS untuk bayar"));
        // Kirim QRIS image
        const qrisUrl = config.payment?.qrisUrl || "";
        if (qrisUrl) {
          try {
            let qrisBuffer;
            if (/^https?:\/\//.test(qrisUrl)) {
              const response = await fetch(qrisUrl);
              qrisBuffer = Buffer.from(await response.arrayBuffer());
            } else {
              qrisBuffer = fs.readFileSync(qrisUrl);
            }
            await m.reply(novaBox("DETAIL PEMBAYARAN", payLines));
            await sock.sendMessage(m.chat, {
              image: qrisBuffer,
              caption: toSC("Scan QRIS di atas"),
            }, { quoted: m });
          } catch {
            payLines.push(toSC("QRIS: hubungi admin"));
            await m.reply(novaBox("DETAIL PEMBAYARAN", payLines));
          }
        }
      } else if (selected.type === "ewallet" || selected.type === "bank") {
        payLines.push(toSC(selected.type === "bank" ? "Bank" : "E-Wallet") + ": " + selected.label);
        payLines.push(toSC("Nomor") + ": " + selected.number);
        payLines.push(toSC("Atas Nama") + ": " + selected.holder);
        payLines.push("");
        payLines.push(toSC("Transfer sesuai nominal"));
        payLines.push(toSC("Lalu kirim bukti ke admin"));
        await m.reply(novaBox("DETAIL PEMBAYARAN", payLines));
      } else if (selected.type === "cash") {
        payLines.push(toSC("Bayar cash/COD"));
        await m.reply(novaBox("DETAIL PEMBAYARAN", payLines));
      }

      // Notify owner
      const ownerJid = getOwnerJid();
      if (ownerJid) {
        const ownerLines = [
          "",
          toSC("Kode") + ": " + inv.code,
          toSC("Produk") + ": " + inv.productName,
          toSC("Total") + ": " + formatRupiah(inv.total),
          toSC("Pembeli") + ": " + inv.buyerName,
          toSC("Metode") + ": " + selected.label,
          toSC("Status") + ": " + statusText("paid"),
          "",
          toSC("Konfirmasi: .toko2 confirm " + inv.code),
        ];
        try {
          await sock.sendMessage(ownerJid, { text: novaBox("PESANAN BARU", ownerLines) });
        } catch {}
      }

      return;
    }

    // ============================================================
    // METODE — list payment methods
    // ============================================================
    if (action === "metode" || action === "payment") {
      const payments = getActivePayments();
      if (!payments.length) {
        return m.reply(claraWrap("Beli2", toSC("Belum ada metode pembayaran tersedia.")));
      }
      const lines = [""];
      for (const p of payments) {
        lines.push(p.value + " — " + p.label);
      }
      lines.push("");
      lines.push(toSC("Pilih: .beli2 bayar <invoice> <metode>"));
      return m.reply(novaBox("METODE PEMBAYARAN", lines));
    }

    // ============================================================
    // BELI — main purchase flow
    // ============================================================
    if (action && action !== "help") {
      // Assume it's a product code
      const kode = action.toUpperCase();
      const product = getProduct(kode);
      if (!product) {
        return m.reply(claraWrap("Beli2", toSC("Produk tidak ditemukan.") + " Kode: " + kode + "\n\nLihat katalog: .beli2 katalog"));
      }

      // Check stock
      const available = product.stock > 0 || product.stock === -1;
      if (!available) {
        return m.reply(claraWrap("Beli2",
          toSC("Stok habis") + "\n\n" +
          toSC("Produk") + ": " + product.name
        ));
      }

      // Generate invoice
      const buyerName = m.pushName || m.sender.split("@")[0];
      const inv = createInvoice({
        product,
        buyerJid: m.sender,
        buyerName,
        qty: 1,
      });

      // Reduce stock (temporary, will restock if cancelled)
      if (product.stock !== -1) {
        updateStock(kode, -1);
      }

      // Show invoice + product details
      const lines = [
        "",
        toSC("Kode Invoice") + ": " + inv.code,
        toSC("Produk") + ": " + product.name,
        toSC("Harga") + ": " + formatRupiah(product.price),
        toSC("Stok Sisa") + ": " + formatStock(product.stock !== -1 ? product.stock - 1 : -1),
        toSC("Total Bayar") + ": " + formatRupiah(inv.total),
        "",
        "---",
        "",
        toSC("Langkah selanjutnya"),
        "1. .beli2 metode — lihat metode bayar",
        "2. .beli2 bayar " + inv.code + " <metode>",
        "3. Transfer & kirim bukti ke admin",
        "",
        toSC("Cek status: .beli2 cek " + inv.code),
      ];

      if (product.image) {
        try {
          await sock.sendMessage(m.chat, {
            image: { url: product.image },
            caption: novaBox("INVOICE BARU", lines),
          }, { quoted: m });
        } catch {
          await m.reply(novaBox("INVOICE BARU", lines));
        }
      } else {
        await m.reply(novaBox("INVOICE BARU", lines));
      }

      // Notify owner
      const ownerJid = getOwnerJid();
      if (ownerJid) {
        const ownerLines = [
          "",
          toSC("Kode") + ": " + inv.code,
          toSC("Produk") + ": " + product.name,
          toSC("Harga") + ": " + formatRupiah(product.price),
          toSC("Pembeli") + ": " + buyerName,
          toSC("Nomor") + ": " + m.sender.split("@")[0],
          toSC("Status") + ": " + statusText("pending"),
          "",
          toSC("Menunggu pembeli pilih metode bayar"),
        ];
        try {
          await sock.sendMessage(ownerJid, { text: novaBox("PESANAN BARU", ownerLines) });
        } catch {}
      }
      return;
    }

    // Help
    const p = m.prefix || ".";
    return m.reply(novaBox("BELI2", [
      "",
      p + "beli2 katalog — lihat produk",
      p + "beli2 <kode> — beli produk",
      p + "beli2 metode — lihat metode bayar",
      p + "beli2 bayar <invoice> <metode> — pilih bayar",
      p + "beli2 cek <invoice> — cek status",
    ]));
  } catch (error) {
    return m.reply(claraWrap("Beli2", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
