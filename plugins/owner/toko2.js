// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .toko2 — Alfamart-style Shop System (owner only)
 *
 * Owner commands:
 *   .toko2 add <nama>|<harga>|<stok>|<desc>|<kategori>
 *   .toko2 list [kategori]
 *   .toko2 stok <kode> <jumlah>
 *   .toko2 del <kode>
 *   .toko2 edit <kode> <nama|harga|desc|kategori> <nilai>
 *   .toko2 cari <query>
 *   .toko2 kategori
 *
 *   .toko2 invoice <kode>
 *   .toko2 invoices [status]
 *   .toko2 confirm <kode>
 *   .toko2 done <kode>
 *   .toko2 cancel <kode>
 *
 *   .toko2 promo add <kode>|<type>|<value>|<desc>|<minSpend>
 *   .toko2 promo list
 *   .toko2 promo off <kode>
 *   .toko2 promo del <kode>
 */

import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getProducts, addProduct, getProduct, updateProduct, deleteProduct, updateStock,
  listByCategory, getCategories, searchProducts,
  getInvoices, getInvoice, updateInvoice, listInvoices,
  getActivePayments, formatRupiah, formatStock, formatDate, statusText, getOwnerJid,
  formatReceipt,
  getPromos, getPromo, addPromo, togglePromo, deletePromo,
  KATEGORI_TOKO, seedKategori, seedAll,
} from "../../src/lib/nova-toko2.js";

const pluginConfig = {
  name: "toko2",
  alias: ["toko2"],
  category: "owner",
  description: "Alfamart-style Shop — produk, keranjang, invoice, promo, notifikasi",
  usage: ".toko2 <add/list/stok/del/edit/cari/kategori/invoice/confirm/done/cancel/promo>",
  example: ".toko2 add Spotify Premium|25000|10|Akun 1 bulan|digital",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function help(m) {
  const p = m.prefix || ".";
  return m.reply(novaBox("TOKO2", [
    toSC("Alfamart-style Shop System"),
    "",
    "📌 " + toSC("Kelola Produk"),
    p + "toko2 add <nama>|<harga>|<stok>|<desc>|<kategori>",
    p + "toko2 list [kategori]",
    p + "toko2 stok <kode> <jumlah>",
    p + "toko2 del <kode>",
    p + "toko2 edit <kode> <field> <nilai>",
    p + "toko2 cari <query>",
    p + "toko2 kategori",
    "",
    "📌 " + toSC("Kelola Invoice"),
    p + "toko2 invoice <kode>",
    p + "toko2 invoices [status]",
    p + "toko2 confirm <kode>",
    p + "toko2 done <kode>",
    p + "toko2 cancel <kode>",
    "",
    "📌 " + toSC("Promo"),
    p + "toko2 promo add <kode>|<type>|<value>|<desc>|<minSpend>",
    p + "toko2 promo list",
    p + "toko2 promo off <kode>",
    p + "toko2 promo del <kode>",
    "",
    "💡 " + toSC("Stok -1 = unlimited"),
    "💡 " + toSC("Type promo: percent / fixed"),
    "💡 " + toSC("User: .beli2 <kode> untuk beli"),
  ]));
}

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
          "Format: .toko2 add <nama>|<harga>|<stok>|<desc>|<kategori>\n" +
          "Contoh: .toko2 add Spotify Premium|25000|10|Akun 1 bulan|digital\n\n" +
          "Stok -1 = unlimited. Kategori opsional."
        ));
      }
      const parts = raw.split("|").map((s) => s.trim());
      if (parts.length < 3) {
        return m.reply(claraWrap("Toko2", "Minimal: nama|harga|stok"));
      }
      const name = parts[0];
      const price = parseInt(parts[1]);
      const stock = parseInt(parts[2]);
      const desc = parts[3] || "";
      const category = parts[4] || "umum";

      if (!name || isNaN(price) || price < 0) return m.reply(claraWrap("Toko2", "Nama & harga harus valid."));
      if (isNaN(stock) || stock < -1) return m.reply(claraWrap("Toko2", "Stok harus angka (-1 = unlimited)."));

      const product = addProduct({ name, price, stock, desc, category });
      return m.reply(claraWrap("Toko2",
        toSC("Produk ditambah") + "\n\n" +
        toSC("Kode") + ": " + product.id + "\n" +
        toSC("Nama") + ": " + product.name + "\n" +
        toSC("Harga") + ": " + formatRupiah(product.price) + "\n" +
        toSC("Stok") + ": " + formatStock(product.stock) + "\n" +
        toSC("Kategori") + ": " + product.category +
        (desc ? "\n" + toSC("Desc") + ": " + desc : "")
      ));
    }

    // ============================================================
    // LIST PRODUCTS (by category or all)
    // ============================================================
    if (action === "list" || action === "produk") {
      const cat = args[0] || "";
      const products = listByCategory(cat);
      if (!products.length) {
        return m.reply(claraWrap("Toko2", toSC("Belum ada produk") + (cat ? " di kategori " + cat : "") + "."));
      }
      const lines = [""];
      if (cat && cat !== "all") lines.push(toSC("Kategori") + ": " + cat, "");
      for (const p of products) {
        lines.push(p.id + " — " + p.name);
        lines.push(toSC("Harga") + ": " + formatRupiah(p.price) + " | " + toSC("Stok") + ": " + formatStock(p.stock) + " | " + toSC("Terjual") + ": " + p.sold);
        if (p.desc) lines.push(toSC("Desc") + ": " + p.desc);
        lines.push("");
      }
      return m.reply(novaBox("DAFTAR PRODUK", lines));
    }

    // ============================================================
    // CATEGORIES
    // ============================================================
    if (action === "kategori" || action === "categories") {
      const cats = getCategories();
      if (!cats.length) return m.reply(claraWrap("Toko2", toSC("Belum ada kategori.")));
      const lines = [""];
      for (const c of cats) {
        const count = getProducts().filter((p) => p.category === c).length;
        lines.push(c + " (" + count + " produk)");
      }
      lines.push("");
      lines.push(toSC("Lihat: .toko2 list <kategori>"));
      return m.reply(novaBox("KATEGORI", lines));
    }

    // ============================================================
    // SEARCH
    // ============================================================
    if (action === "cari" || action === "search") {
      const query = args.join(" ").trim();
      if (!query) return m.reply(claraWrap("Toko2", "Format: .toko2 cari <query>"));
      const results = searchProducts(query);
      if (!results.length) return m.reply(claraWrap("Toko2", toSC("Tidak ditemukan untuk") + ": " + query));
      const lines = [""];
      for (const p of results) {
        lines.push(p.id + " — " + p.name);
        lines.push(formatRupiah(p.price) + " | Stok: " + formatStock(p.stock));
        lines.push("");
      }
      return m.reply(novaBox("HASIL CARI", lines));
    }

    // ============================================================
    // STOCK UPDATE
    // ============================================================
    if (action === "stok" || action === "stock") {
      const kode = args[0] || "";
      const jumlah = parseInt(args[1] || "0");
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 stok <kode> <jumlah>"));
      if (isNaN(jumlah)) return m.reply(claraWrap("Toko2", "Jumlah harus angka."));
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.")));
      const oldStock = product.stock;
      const updated = updateStock(kode, jumlah);
      return m.reply(claraWrap("Toko2",
        toSC("Stok diperbarui") + "\n\n" +
        toSC("Produk") + ": " + updated.name + "\n" +
        toSC("Stok lama") + ": " + formatStock(oldStock) + "\n" +
        toSC("Stok baru") + ": " + formatStock(updated.stock)
      ));
    }

    // ============================================================
    // DELETE PRODUCT
    // ============================================================
    if (action === "del" || action === "hapus") {
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
      if (!kode || !field || !nilai) return m.reply(claraWrap("Toko2", "Format: .toko2 edit <kode> <nama|harga|desc|kategori> <nilai>"));
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.")));

      let updates = {};
      if (field === "nama" || field === "name") updates.name = nilai;
      else if (field === "harga" || field === "price") updates.price = parseInt(nilai);
      else if (field === "desc" || field === "deskripsi") updates.desc = nilai;
      else if (field === "kategori" || field === "category") updates.category = nilai;
      else return m.reply(claraWrap("Toko2", "Field: nama, harga, desc, kategori"));

      updateProduct(kode, updates);
      return m.reply(claraWrap("Toko2", toSC("Produk diperbarui") + ": " + kode + " (" + field + " = " + nilai + ")"));
    }

    // ============================================================
    // VIEW INVOICE
    // ============================================================
    if (action === "invoice") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 invoice <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      return m.reply(novaBox("DETAIL INVOICE", formatReceipt(inv)));
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
        lines.push(inv.code + " — " + inv.buyerName);
        lines.push(toSC("Total") + ": " + formatRupiah(inv.total) + " | " + toSC("Status") + ": " + statusText(inv.status));
        lines.push("");
      }
      if (invoices.length > 15) lines.push(toSC("Total") + ": " + invoices.length + " invoice");
      return m.reply(novaBox("DAFTAR INVOICE", lines));
    }

    // ============================================================
    // CONFIRM INVOICE
    // ============================================================
    if (action === "confirm" || action === "konfirmasi") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 confirm <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status !== "paid" && inv.status !== "pending") {
        return m.reply(claraWrap("Toko2", toSC("Status") + ": " + statusText(inv.status) + ". " + toSC("Tidak bisa dikonfirmasi.")));
      }
      updateInvoice(kode, { status: "confirmed" });

      // Notify buyer
      try {
        await sock.sendMessage(inv.buyerJid, { text: novaBox("INVOICE DIKONFIRMI", formatReceipt(inv)) });
      } catch {}

      return m.reply(claraWrap("Toko2", toSC("Invoice dikonfirmasi") + ": " + inv.code + "\n" + toSC("Notifikasi dikirim ke pembeli")));
    }

    // ============================================================
    // DONE INVOICE
    // ============================================================
    if (action === "done" || action === "selesai") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 done <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status !== "confirmed") return m.reply(claraWrap("Toko2", toSC("Invoice harus dikonfirmasi dulu.")));
      updateInvoice(kode, { status: "done" });

      // Increment sold count per item
      for (const item of (inv.items || [])) {
        const product = getProduct(item.productId);
        if (product) updateProduct(item.productId, { sold: product.sold + item.qty });
      }

      // Notify buyer
      try {
        const buyerLines = [
          "",
          toSC("Kode") + ": " + inv.code,
          "",
          toSC("Transaksi selesai."),
          toSC("Terima kasih sudah berbelanja!"),
        ];
        await sock.sendMessage(inv.buyerJid, { text: novaBox("TRANSAKSI SELESAI", buyerLines) });
      } catch {}

      return m.reply(claraWrap("Toko2", toSC("Transaksi selesai") + ": " + inv.code));
    }

    // ============================================================
    // CANCEL INVOICE
    // ============================================================
    if (action === "cancel" || action === "batal") {
      const kode = (args[0] || "").toUpperCase();
      if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 cancel <kode>"));
      const inv = getInvoice(kode);
      if (!inv) return m.reply(claraWrap("Toko2", toSC("Invoice tidak ditemukan.")));
      if (inv.status === "done") return m.reply(claraWrap("Toko2", toSC("Sudah selesai, tidak bisa dibatalkan.")));

      // Restock
      for (const item of (inv.items || [])) {
        if (item.productId) updateStock(item.productId, item.qty);
      }
      updateInvoice(kode, { status: "cancelled" });

      // Notify buyer
      try {
        const buyerLines = [
          "",
          toSC("Kode") + ": " + inv.code,
          "",
          toSC("Invoice dibatalkan."),
        ];
        await sock.sendMessage(inv.buyerJid, { text: novaBox("INVOICE DIBATALKAN", buyerLines) });
      } catch {}

      return m.reply(claraWrap("Toko2", toSC("Invoice dibatalkan") + ": " + inv.code));
    }

    // ============================================================
    // PROMO MANAGEMENT
    // ============================================================
    if (action === "promo" || action === "diskon") {
      const sub = (args.shift() || "").toLowerCase();

      if (sub === "add" || sub === "tambah") {
        const raw = args.join(" ");
        if (!raw || !raw.includes("|")) {
          return m.reply(claraWrap("Toko2",
            "Format: .toko2 promo add <kode>|<type>|<value>|<desc>|<minSpend>\n" +
            "Contoh: .toko2 promo add HEMAT10|percent|10|Diskon 10%|50000\n" +
            "Type: percent / fixed"
          ));
        }
        const parts = raw.split("|").map((s) => s.trim());
        const result = addPromo({
          code: parts[0],
          type: parts[1] || "percent",
          value: parseFloat(parts[2]) || 0,
          desc: parts[3] || "",
          minSpend: parseFloat(parts[4]) || 0,
        });
        if (result.error) return m.reply(claraWrap("Toko2", result.error));
        return m.reply(claraWrap("Toko2",
          toSC("Promo ditambah") + "\n\n" +
          toSC("Kode") + ": " + result.promo.code + "\n" +
          toSC("Type") + ": " + result.promo.type + "\n" +
          toSC("Value") + ": " + (result.promo.type === "percent" ? result.promo.value + "%" : formatRupiah(result.promo.value)) + "\n" +
          (result.promo.minSpend ? toSC("Min Spend") + ": " + formatRupiah(result.promo.minSpend) : "")
        ));
      }

      if (sub === "list" || sub === "daftar") {
        const promos = getPromos();
        if (!promos.length) return m.reply(claraWrap("Toko2", toSC("Belum ada promo.")));
        const lines = [""];
        for (const p of promos) {
          const val = p.type === "percent" ? p.value + "%" : formatRupiah(p.value);
          lines.push(p.code + (p.active ? "" : " (OFF)"));
          lines.push(toSC("Value") + ": " + val + " | " + toSC("Terpakai") + ": " + p.used);
          if (p.desc) lines.push(toSC("Desc") + ": " + p.desc);
          lines.push("");
        }
        return m.reply(novaBox("DAFTAR PROMO", lines));
      }

      if (sub === "off" || sub === "nonaktif") {
        const kode = (args[0] || "").toUpperCase();
        if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 promo off <kode>"));
        const result = togglePromo(kode, false);
        if (!result) return m.reply(claraWrap("Toko2", toSC("Promo tidak ditemukan.")));
        return m.reply(claraWrap("Toko2", toSC("Promo dimatikan") + ": " + kode));
      }

      if (sub === "on" || sub === "aktif") {
        const kode = (args[0] || "").toUpperCase();
        if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 promo on <kode>"));
        const result = togglePromo(kode, true);
        if (!result) return m.reply(claraWrap("Toko2", toSC("Promo tidak ditemukan.")));
        return m.reply(claraWrap("Toko2", toSC("Promo diaktifkan") + ": " + kode));
      }

      if (sub === "del" || sub === "hapus") {
        const kode = (args[0] || "").toUpperCase();
        if (!kode) return m.reply(claraWrap("Toko2", "Format: .toko2 promo del <kode>"));
        const ok = deletePromo(kode);
        if (!ok) return m.reply(claraWrap("Toko2", toSC("Promo tidak ditemukan.")));
        return m.reply(claraWrap("Toko2", toSC("Promo dihapus") + ": " + kode));
      }

      return m.reply(claraWrap("Toko2",
        toSC("Promo") + "\n\n" +
        ".toko2 promo add <kode>|<type>|<value>|<desc>|<minSpend>\n" +
        ".toko2 promo list\n" +
        ".toko2 promo on/off <kode>\n" +
        ".toko2 promo del <kode>"
      ));
    }

    // ============================================================
    // SEED — isi katalog dari template
    // ============================================================
    if (action === "seed" || action === "isi") {
      const kategori = (args[0] || "").toLowerCase();

      if (!kategori || kategori === "list" || kategori === "daftar") {
        const lines = [""];
        for (const [key, cat] of Object.entries(KATEGORI_TOKO)) {
          lines.push(key + " — " + cat.label + " (" + cat.items.length + " produk)");
        }
        lines.push("");
        lines.push(toSC("Isi semua: .toko2 seed all"));
        lines.push(toSC("Isi 1 kategori: .toko2 seed <nama>"));
        return m.reply(novaBox("SEED KATALOG", lines));
      }

      if (kategori === "all" || kategori === "semua") {
        const result = seedAll();
        return m.reply(claraWrap("Toko2",
          toSC("Katalog diisi") + "\n\n" + toSC("Ditambah") + ": " + result.totalAdded + " produk\n" + toSC("Skip (sudah ada)") + ": " + result.totalSkipped + " produk"
        ));
      }

      const result = seedKategori(kategori);
      if (result.error) return m.reply(claraWrap("Toko2", result.error));
      return m.reply(claraWrap("Toko2",
        toSC("Kategori diisi") + ": " + result.label + "\n\n" +
        toSC("Ditambah") + ": " + result.added + " produk\n" +
        toSC("Skip") + ": " + result.skipped + " produk"
      ));
    }

    return help(m);
  } catch (error) {
    return m.reply(claraWrap("Toko2", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
