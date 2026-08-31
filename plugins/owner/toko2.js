// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .toko2 — Advanced Shop System (owner only)
 *
 * Fitur:
 * - Add produk dengan stock & deskripsi
 * - Generate invoice code otomatis (INV-YYMMDD-XXXX)
 * - Pemilihan metode pembayaran interaktif
 * - Notifikasi ke owner saat ada pesanan
 * - Status tracking (pending → paid → confirmed → done)
 *
 * Command:
 *   .toko2 add <nama>|<harga>|<stok>|<deskripsi>
 *   .toko2 list — lihat semua produk
 *   .toko2 stok <kode> <jumlah> — update stok
 *   .toko2 del <kode> — hapus produk
 *   .toko2 edit <kode> <nama|harga|desc> <nilai>
 *   .toko2 invoice <kode> — lihat detail invoice
 *   .toko2 invoices — list semua invoice
 *   .toko2 confirm <kode> — konfirmasi pembayaran
 *   .toko2 done <kode> — selesaikan transaksi
 *   .toko2 cancel <kode> — batalkan invoice
 */

import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getProducts, addProduct, getProduct, updateProduct, deleteProduct, updateStock,
  getInvoices, getInvoice, createInvoice, updateInvoice, listInvoices, getInvoicesByBuyer,
  getActivePayments, formatRupiah, formatStock, formatDate, statusText, getOwnerJid,
} from "../../src/lib/nova-toko2.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import fs from "fs";

const pluginConfig = {
  name: "toko2",
  alias: ["toko2"],
  category: "owner",
  description: "Advanced Shop — produk, stok, invoice, pembayaran, notifikasi owner",
  usage: ".toko2 <add/list/stok/del/edit/invoice/invoices/confirm/done/cancel>",
  example: ".toko2 add Spotify Premium|25000|10|Akun Premium 1 Bulan",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// HELP
// ============================================================
function help(m) {
  const p = m.prefix || ".";
  return m.reply(novaBox("TOKO2", [
    toSC("Advanced Shop System"),
    "",
    "📌 " + toSC("Kelola Produk"),
    p + "toko2 add <nama>|<harga>|<stok>|<deskripsi>",
    p + "toko2 list",
    p + "toko2 stok <kode> <jumlah>",
    p + "toko2 del <kode>",
    p + "toko2 edit <kode> <field> <nilai>",
    "",
    "📌 " + toSC("Kelola Invoice"),
    p + "toko2 invoice <kode>",
    p + "toko2 invoices [status]",
    p + "toko2 confirm <kode>",
    p + "toko2 done <kode>",
    p + "toko2 cancel <kode>",
    "",
    "💡 " + toSC("Stok -1 = unlimited"),
    "💡 " + toSC("User beli via .beli2 <kode>"),
  ]));
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).trim());
    const action = (args.shift() || "").toLowerCase();

    if (!action || action === "help" || action === "menu") return help(m);

    // ============================================================
    // ADD PRODUCT
    // ============================================================
    if (action === "add" || action === "tambah") {
      const raw = args.join(" ");
      if (!raw || !raw.includes("|")) {
        return m.reply(claraWrap("Toko2",
          "Format: .toko2 add <nama>|<harga>|<stok>|<deskripsi>\n" +
          "Contoh: .toko2 add Spotify Premium|25000|10|Akun Premium 1 Bulan\n\n" +
          "Stok -1 = unlimited"
        ));
      }
      const parts = raw.split("|").map((s) => s.trim());
      if (parts.length < 3) {
        return m.reply(claraWrap("Toko2", "Minimal: nama|harga|stok. Deskripsi opsional."));
      }
      const name = parts[0];
      const price = parseInt(parts[1]);
      const stock = parseInt(parts[2]);
      const desc = parts[3] || "";

      if (!name || isNaN(price) || price < 0) {
        return m.reply(claraWrap("Toko2", "Nama & harga harus valid."));
      }
      if (isNaN(stock) || (stock < -1)) {
        return m.reply(claraWrap("Toko2", "Stok harus angka (-1 = unlimited)."));
      }

      const product = addProduct({ name, price, stock, desc });
      return m.reply(claraWrap("Toko2",
        toSC("Produk ditambah") + "\n\n" +
        toSC("Kode") + ": " + product.id + "\n" +
        toSC("Nama") + ": " + product.name + "\n" +
        toSC("Harga") + ": " + formatRupiah(product.price) + "\n" +
        toSC("Stok") + ": " + formatStock(product.stock) + "\n" +
        (desc ? toSC("Deskripsi") + ": " + desc : "")
      ));
    }

    // ============================================================
    // LIST PRODUCTS
    // ============================================================
    if (action === "list" || action === "produk") {
      const products = getProducts();
      if (!products.length) {
        return m.reply(claraWrap("Toko2", toSC("Belum ada produk.") + "\n\nTambah: .toko2 add <nama>|<harga>|<stok>|<desc>"));
      }
      const lines = [""];
      for (const p of products) {
        lines.push(p.id + " — " + p.name);
        lines.push(toSC("Harga") + ": " + formatRupiah(p.price) + " | " + toSC("Stok") + ": " + formatStock(p.stock) + " | " + toSC("Terjual") + ": " + p.sold);
        if (p.desc) lines.push(toSC("Desc") + ": " + p.desc);
        lines.push("");
      }
      return m.reply(novaBox("DAFTAR PRODUK", lines));
    }

    // ============================================================
    // UPDATE STOCK
    // ============================================================
    if (action === "stok" || action === "stock") {
      const kode = args[0] || "";
      const jumlah = parseInt(args[1] || "0");
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 stok <kode> <jumlah>"));
      if (isNaN(jumlah)) return m.reply(claraWrap("Toko2", "Jumlah harus angka."));
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.") + " Kode: " + kode));
      const updated = updateStock(kode, jumlah);
      return m.reply(claraWrap("Toko2",
        toSC("Stok diperbarui") + "\n\n" +
        toSC("Produk") + ": " + updated.name + "\n" +
        toSC("Stok lama") + ": " + formatStock(product.stock) + "\n" +
        toSC("Stok baru") + ": " + formatStock(updated.stock)
      ));
    }

    // ============================================================
    // DELETE PRODUCT
    // ============================================================
    if (action === "del" || action === "hapus" || action === "delete") {
      const kode = args[0] || "";
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 del <kode>"));
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.")));
      deleteProduct(kode);
      return m.reply(claraWrap("Toko2", toSC("Produk dihapus") + ": " + product.name + " (" + product.id + ")"));
    }

    // ============================================================
    // EDIT PRODUCT
    // ============================================================
    if (action === "edit" || action === "ubah") {
      const kode = args[0] || "";
      const field = (args[1] || "").toLowerCase();
      const nilai = args.slice(2).join(" ").trim();
      if (!kode || !field || !nilai) {
        return m.reply(claraWrap("Toko2", "Format: .toko2 edit <kode> <nama|harga|desc> <nilai>"));
      }
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.")));

      let updates = {};
      if (field === "nama" || field === "name") updates.name = nilai;
      else if (field === "harga" || field === "price") updates.price = parseInt(nilai);
      else if (field === "desc" || field === "deskripsi") updates.desc = nilai;
      else return m.reply(claraWrap("Toko2", "Field: nama, harga, desc"));

      updateProduct(kode, updates);
      return m.reply(claraWrap("Toko2", toSC("Produk diperbarui") + ": " + kode));
    }

    // ============================================================
    // VIEW INVOICE
    // ============================================================
    if (action === "invoice") {
      const kode = args[0] || "";
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 invoice <kode>"));
      const inv = getInvoice(kode.toUpperCase());
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));

      const lines = [
        "",
        toSC("Kode") + ": " + inv.code,
        toSC("Produk") + ": " + inv.productName,
        toSC("Qty") + ": " + inv.qty,
        toSC("Total") + ": " + formatRupiah(inv.total),
        toSC("Pembeli") + ": " + inv.buyerName,
        toSC("Metode") + ": " + (inv.paymentMethod || "-"),
        toSC("Status") + ": " + statusText(inv.status),
        toSC("Dibuat") + ": " + formatDate(inv.createdAt),
      ];
      if (inv.note) lines.push(toSC("Catatan") + ": " + inv.note);
      return m.reply(novaBox("DETAIL INVOICE", lines));
    }

    // ============================================================
    // LIST INVOICES
    // ============================================================
    if (action === "invoices" || action === "pesanan") {
      const filter = (args[0] || "").toLowerCase();
      const invoices = listInvoices(filter && filter !== "all" ? filter : null);
      if (!invoices.length) {
        return m.reply(claraWrap("Toko2", toSC("Tidak ada invoice.") + (filter ? " Status: " + filter : "")));
      }
      const lines = [""];
      for (const inv of invoices.slice(0, 15)) {
        lines.push(inv.code + " — " + inv.productName);
        lines.push(toSC("Total") + ": " + formatRupiah(inv.total) + " | " + toSC("Status") + ": " + statusText(inv.status));
        lines.push("");
      }
      if (invoices.length > 15) {
        lines.push(toSC("Total") + ": " + invoices.length + " invoice");
      }
      return m.reply(novaBox("DAFTAR INVOICE", lines));
    }

    // ============================================================
    // CONFIRM INVOICE (owner confirms payment received)
    // ============================================================
    if (action === "confirm" || action === "konfirmasi") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 confirm <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status !== "paid" && inv.status !== "pending") {
        return m.reply(claraWrap("Toko2", toSC("Status invoice") + ": " + statusText(inv.status) + ". " + toSC("Tidak bisa dikonfirmasi.")));
      }
      updateInvoice(kode, { status: "confirmed" });

      // Notify buyer
      try {
        const buyerMsg = novaBox("INVOICE DIKONFIRMI", [
          "",
          toSC("Kode") + ": " + inv.code,
          toSC("Produk") + ": " + inv.productName,
          toSC("Total") + ": " + formatRupiah(inv.total),
          "",
          toSC("Pembayaran diterima & dikonfirmasi."),
          toSC("Produk akan dikirim shortly."),
        ]);
        await sock.sendMessage(inv.buyerJid, { text: buyerMsg });
      } catch {}

      return m.reply(claraWrap("Toko2",
        toSC("Invoice dikonfirmasi") + "\n\n" +
        toSC("Kode") + ": " + inv.code + "\n" +
        toSC("Pembeli") + ": " + inv.buyerName + "\n" +
        toSC("Notifikasi dikirim ke pembeli")
      ));
    }

    // ============================================================
    // DONE INVOICE (transaction complete)
    // ============================================================
    if (action === "done" || action === "selesai") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 done <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status !== "confirmed") {
        return m.reply(claraWrap("Toko2", toSC("Invoice harus dikonfirmasi dulu.")));
      }
      updateInvoice(kode, { status: "done" });

      // Increment sold count
      const product = getProduct(inv.productId);
      if (product) updateProduct(inv.productId, { sold: product.sold + 1 });

      // Notify buyer
      try {
        const buyerMsg = novaBox("TRANSAKSI SELESAI", [
          "",
          toSC("Kode") + ": " + inv.code,
          toSC("Produk") + ": " + inv.productName,
          "",
          toSC("Transaksi telah selesai."),
          toSC("Terima kasih sudah berbelanja!"),
        ]);
        await sock.sendMessage(inv.buyerJid, { text: buyerMsg });
      } catch {}

      return m.reply(claraWrap("Toko2",
        toSC("Transaksi selesai") + "\n\n" +
        toSC("Kode") + ": " + inv.code + "\n" +
        toSC("Produk") + ": " + inv.productName + "\n" +
        toSC("Terjual") + ": " + (product ? product.sold + 1 : "-")
      ));
    }

    // ============================================================
    // CANCEL INVOICE
    // ============================================================
    if (action === "cancel" || action === "batal") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 cancel <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status === "done") {
        return m.reply(claraWrap("Toko2", toSC("Invoice sudah selesai, tidak bisa dibatalkan.")));
      }
      // Restock if was paid
      if (inv.status === "paid" || inv.status === "confirmed") {
        updateStock(inv.productId, inv.qty);
      }
      updateInvoice(kode, { status: "cancelled" });

      // Notify buyer
      try {
        const buyerMsg = novaBox("INVOICE DIBATALKAN", [
          "",
          toSC("Kode") + ": " + inv.code,
          toSC("Produk") + ": " + inv.productName,
          toSC("Total") + ": " + formatRupiah(inv.total),
          "",
          toSC("Invoice telah dibatalkan."),
        ]);
        await sock.sendMessage(inv.buyerJid, { text: buyerMsg });
      } catch {}

      return m.reply(claraWrap("Toko2", toSC("Invoice dibatalkan") + ": " + inv.code));
    }

    return help(m);
  } catch (error) {
    return m.reply(claraWrap("Toko2", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
