// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .beli2 — Alfamart-style Shopping (user side)
 *
 * User commands:
 *   .beli2 katalog [kategori]     — lihat produk
 *   .beli2 cari <query>           — cari produk
 *   .beli2 <kode> [qty]           — tambah ke keranjang
 *   .beli2 keranjang              — lihat keranjang
 *   .beli2 hapus <kode> [qty]     — hapus dari keranjang
 *   .beli2 kosong                 — bersihkan keranjang
 *   .beli2 promo <kode>           — apply promo
 *   .beli2 checkout               — proses semua isi keranjang
 *   .beli2 metode                 — lihat metode pembayaran
 *   .beli2 bayar <invoice> <metode> — pilih metode bayar
 *   .beli2 cek <invoice>          — cek status
 *   .beli2 riwayat                — riwayat pembelian
 */

import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getProducts, getProduct, listByCategory, getCategories, searchProducts,
  getCart, addToCart, removeFromCart, clearCart, cartTotal,
  checkout, getInvoice, updateInvoice, getInvoicesByBuyer,
  getActivePayments, formatRupiah, formatStock, formatDate, statusText,
  getOwnerJid, formatReceipt, applyPromo,
} from "../../src/lib/nova-toko2.js";
import config from "../../config.js";
import fs from "fs";

const pluginConfig = {
  name: "beli2",
  alias: ["beli2"],
  category: "store",
  description: "Alfamart-style Shopping — keranjang, checkout, invoice, pembayaran",
  usage: ".beli2 <katalog/cari/keranjang/checkout/bayar/cek>",
  example: ".beli2 katalog",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).trim());
    const action = (args.shift() || "").toLowerCase();
    const jid = m.sender;

    // ============================================================
    // KATALOG
    // ============================================================
    if (action === "katalog" || action === "list" || action === "produk") {
      const cat = args[0] || "";
      const products = listByCategory(cat);
      if (!products.length) {
        return m.reply(claraWrap("Beli2", toSC("Belum ada produk.") + (cat ? " Kategori: " + cat : "")));
      }
      const cats = getCategories();
      const lines = [""];
      if (cats.length > 1) lines.push(toSC("Kategori") + ": " + cats.join(", "), "");
      for (const p of products) {
        const available = p.stock > 0 || p.stock === -1;
        lines.push(p.id + " — " + p.name + (available ? "" : " (Habis)"));
        lines.push(toSC("Harga") + ": " + formatRupiah(p.price) + " | " + toSC("Stok") + ": " + formatStock(p.stock));
        if (p.desc) lines.push(toSC("Desc") + ": " + p.desc);
        lines.push("");
      }
      lines.push(toSC("Beli: .beli2 <kode> [qty]"));
      lines.push(toSC("Cari: .beli2 cari <query>"));
      if (cats.length > 1) lines.push(toSC("Filter: .beli2 katalog <kategori>"));
      return m.reply(novaBox("KATALOG TOKO", lines));
    }

    // ============================================================
    // CARI
    // ============================================================
    if (action === "cari" || action === "search") {
      const query = args.join(" ").trim();
      if (!query) return m.reply(claraWrap("Beli2", "Format: .beli2 cari <query>"));
      const results = searchProducts(query);
      if (!results.length) return m.reply(claraWrap("Beli2", toSC("Tidak ditemukan.") + " Query: " + query));
      const lines = [""];
      for (const p of results) {
        lines.push(p.id + " — " + p.name);
        lines.push(toSC("Harga") + ": " + formatRupiah(p.price) + " | " + toSC("Stok") + ": " + formatStock(p.stock));
        lines.push("");
      }
      lines.push(toSC("Beli: .beli2 <kode>"));
      return m.reply(novaBox("HASIL CARI", lines));
    }

    // ============================================================
    // KERANJANG (Cart)
    // ============================================================
    if (action === "keranjang" || action === "cart" || action === "ker") {
      const cart = getCart(jid);
      if (!cart.items || !cart.items.length) {
        return m.reply(claraWrap("Beli2", toSC("Keranjang kosong.") + "\n\nTambah: .beli2 <kode> [qty]\nKatalog: .beli2 katalog"));
      }
      const { subtotal, discount, total, itemCount } = cartTotal(jid);
      const lines = [""];
      for (const item of cart.items) {
        lines.push(item.productId + " — " + item.productName);
        lines.push(item.qty + " x " + formatRupiah(item.price) + " = " + formatRupiah(item.subtotal));
        lines.push("");
      }
      lines.push("---");
      lines.push(toSC("Item") + ": " + itemCount);
      lines.push(toSC("Subtotal") + ": " + formatRupiah(subtotal));
      if (discount > 0) lines.push(toSC("Diskon") + ": -" + formatRupiah(discount));
      lines.push(toSC("Total") + ": " + formatRupiah(total));
      lines.push("");
      lines.push(toSC("Hapus item: .beli2 hapus <kode> [qty]"));
      lines.push(toSC("Kosongkan: .beli2 kosong"));
      lines.push(toSC("Promo: .beli2 promo <kode>"));
      lines.push(toSC("Checkout: .beli2 checkout"));
      return m.reply(novaBox("KERANJANG", lines));
    }

    // ============================================================
    // HAPUS DARI KERANJANG
    // ============================================================
    if (action === "hapus" || action === "remove" || action === "del") {
      const kode = args[0] || "";
      const qty = parseInt(args[1] || "0");
      if (!kode) return m.reply(claraWrap("Beli2", "Format: .beli2 hapus <kode> [qty]"));
      const result = removeFromCart(jid, kode, qty);
      if (result.error) return m.reply(claraWrap("Beli2", result.error));
      return m.reply(claraWrap("Beli2", toSC("Item dihapus dari keranjang.") + "\n\nLihat: .beli2 keranjang"));
    }

    // ============================================================
    // KOSONGKAN KERANJANG
    // ============================================================
    if (action === "kosong" || action === "clear" || action === "reset") {
      clearCart(jid);
      return m.reply(claraWrap("Beli2", toSC("Keranjang dikosongkan.")));
    }

    // ============================================================
    // PROMO / DISKON
    // ============================================================
    if (action === "promo" || action === "diskon") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Beli2", "Format: .beli2 promo <kode>"));
      const result = applyPromo(jid, kode);
      if (result.error) return m.reply(claraWrap("Beli2", result.error));
      const { discount, total } = cartTotal(jid);
      return m.reply(claraWrap("Beli2",
        toSC("Promo diterapkan") + ": " + result.promo.code + "\n" +
        toSC("Diskon") + ": -" + formatRupiah(discount) + "\n" +
        toSC("Total bayar") + ": " + formatRupiah(total) + "\n\n" +
        toSC("Checkout: .beli2 checkout")
      ));
    }

    // ============================================================
    // CHECKOUT — proses semua isi keranjang
    // ============================================================
    if (action === "checkout" || action === "bayar semua" || action === "co") {
      const buyerName = m.pushName || jid.split("@")[0];
      const result = checkout(jid, buyerName);
      if (result.error) return m.reply(claraWrap("Beli2", result.error));

      const inv = result.invoice;

      // Show receipt
      const lines = formatReceipt(inv);
      lines.push("");
      lines.push(toSC("Langkah selanjutnya"));
      lines.push("1. .beli2 metode — lihat metode bayar");
      lines.push("2. .beli2 bayar " + inv.code + " <metode>");
      lines.push("3. Transfer & kirim bukti ke admin");
      await m.reply(novaBox("STRUK BELANJA", lines));

      // Notify owner
      const ownerJid = getOwnerJid();
      if (ownerJid) {
        const ownerLines = formatReceipt(inv);
        ownerLines.push("");
        ownerLines.push(toSC("Pembeli") + ": " + buyerName);
        ownerLines.push(toSC("Nomor") + ": " + jid.split("@")[0]);
        ownerLines.push("");
        ownerLines.push(toSC("Konfirmasi: .toko2 confirm " + inv.code));
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
      if (!payments.length) return m.reply(claraWrap("Beli2", toSC("Belum ada metode pembayaran.")));
      const lines = [""];
      for (const p of payments) {
        lines.push(p.value + " — " + p.label);
      }
      lines.push("");
      lines.push(toSC("Pilih: .beli2 bayar <invoice> <metode>"));
      return m.reply(novaBox("METODE PEMBAYARAN", lines));
    }

    // ============================================================
    // BAYAR — pilih metode pembayaran untuk invoice
    // ============================================================
    if (action === "bayar" || action === "pay") {
      const kode = (args[0] || "").toUpperCase();
      const metode = (args[1] || "").toLowerCase();
      if (!kode || !metode) {
        return m.reply(claraWrap("Beli2", "Format: .beli2 bayar <invoice> <metode>\n\nLihat metode: .beli2 metode"));
      }
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Beli2", toSC("Invoice tidak ditemukan.")));
      if (inv.buyerJid !== jid && !m.isOwner) return m.reply(claraWrap("Beli2", toSC("Bukan invoice Anda.")));
      if (inv.status !== "pending") return m.reply(claraWrap("Beli2", toSC("Status") + ": " + statusText(inv.status)));

      const payments = getActivePayments();
      const selected = payments.find((p) => p.value === metode || p.label.toLowerCase() === metode);
      if (!selected) return m.reply(claraWrap("Beli2", toSC("Metode tidak tersedia.") + " Ketik .beli2 metode"));

      updateInvoice(kode, { paymentMethod: selected.label, status: "paid" });

      // Payment details to buyer
      const payLines = [
        "",
        toSC("Kode") + ": " + inv.code,
        toSC("Total") + ": " + formatRupiah(inv.total),
        toSC("Metode") + ": " + selected.label,
        "",
      ];

      if (selected.type === "qris") {
        payLines.push(toSC("Scan QRIS untuk bayar"));
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
          toSC("Total") + ": " + formatRupiah(inv.total),
          toSC("Pembeli") + ": " + inv.buyerName,
          toSC("Metode") + ": " + selected.label,
          toSC("Status") + ": " + statusText("paid"),
          "",
          toSC("Konfirmasi: .toko2 confirm " + inv.code),
        ];
        try {
          await sock.sendMessage(ownerJid, { text: novaBox("PEMBAYARAN DITERIMA", ownerLines) });
        } catch {}
      }
      return;
    }

    // ============================================================
    // CEK — cek status invoice
    // ============================================================
    if (action === "cek" || action === "status") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Beli2", "Format: .beli2 cek <invoice>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Beli2", toSC("Invoice tidak ditemukan.")));
      if (inv.buyerJid !== jid && !m.isOwner) return m.reply(claraWrap("Beli2", toSC("Bukan invoice Anda.")));
      return m.reply(novaBox("STATUS INVOICE", formatReceipt(inv)));
    }

    // ============================================================
    // RIWAYAT — purchase history
    // ============================================================
    if (action === "riwayat" || action === "history") {
      const invoices = getInvoicesByBuyer(jid);
      if (!invoices.length) return m.reply(claraWrap("Beli2", toSC("Belum ada riwayat pembelian.")));
      const lines = [""];
      for (const inv of invoices.slice(0, 10)) {
        lines.push(inv.code + " — " + statusText(inv.status));
        lines.push(toSC("Total") + ": " + formatRupiah(inv.total) + " | " + formatDate(inv.createdAt));
        lines.push("");
      }
      return m.reply(novaBox("RIWAYAT BELANJA", lines));
    }

    // ============================================================
    // BELI — tambah ke keranjang (default action)
    // ============================================================
    if (action && action !== "help") {
      const kode = action.toUpperCase();
      const qty = parseInt(args[0] || "1") || 1;
      const product = getProduct(kode);

      if (!product) {
        return m.reply(claraWrap("Beli2", toSC("Produk tidak ditemukan.") + " Kode: " + kode + "\n\nKatalog: .beli2 katalog"));
      }

      const available = product.stock > 0 || product.stock === -1;
      if (!available) {
        return m.reply(claraWrap("Beli2", toSC("Stok habis") + ": " + product.name));
      }
      if (product.stock !== -1 && product.stock < qty) {
        return m.reply(claraWrap("Beli2", toSC("Stok tidak cukup.") + " Tersedia: " + product.stock));
      }

      const result = addToCart(jid, product.id, qty);
      if (result.error) return m.reply(claraWrap("Beli2", result.error));

      const { itemCount, total } = cartTotal(jid);
      return m.reply(claraWrap("Beli2",
        toSC("Ditambah ke keranjang") + "\n\n" +
        toSC("Produk") + ": " + product.name + "\n" +
        toSC("Qty") + ": " + qty + "\n" +
        toSC("Harga") + ": " + formatRupiah(product.price) + "\n\n" +
        toSC("Isi keranjang") + ": " + itemCount + " item | " + formatRupiah(total) + "\n\n" +
        toSC("Lihat: .beli2 keranjang") + "\n" +
        toSC("Checkout: .beli2 checkout")
      ));
    }

    // Help
    const p = m.prefix || ".";
    return m.reply(novaBox("BELI2", [
      toSC("Alfamart-style Shopping"),
      "",
      p + "beli2 katalog [kategori] — lihat produk",
      p + "beli2 cari <query> — cari produk",
      p + "beli2 <kode> [qty] — tambah ke keranjang",
      p + "beli2 keranjang — lihat keranjang",
      p + "beli2 hapus <kode> [qty] — hapus item",
      p + "beli2 kosong — bersihkan keranjang",
      p + "beli2 promo <kode> — apply diskon",
      p + "beli2 checkout — proses pesanan",
      p + "beli2 metode — lihat metode bayar",
      p + "beli2 bayar <inv> <metode> — pilih bayar",
      p + "beli2 cek <inv> — cek status",
      p + "beli2 riwayat — riwayat belanja",
    ]));
  } catch (error) {
    return m.reply(claraWrap("Beli2", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
