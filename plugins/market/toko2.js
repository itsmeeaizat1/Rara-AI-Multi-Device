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
import axios from "axios";
import FormData from "form-data";

async function uploadToCatbox(buffer, filename = "file.jpg") {
  try {
    const form = new FormData();
    form.append("fileToUpload", buffer, { filename });
    form.append("reqtype", "fileupload");
    const res = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    return res.data?.startsWith("http") ? res.data : null;
  } catch {
    return null;
  }
}
import { getDatabase } from "../../src/lib/nova-database.js";
import {
  getProducts, addProduct, getProduct, updateProduct, deleteProduct, updateStock,
  listByCategory, getCategories, searchProducts,
  getInvoices, getInvoice, updateInvoice, listInvoices,
  getActivePayments, formatRupiah, formatStock, formatDate, statusText, getOwnerJid,
  formatReceipt,
  getPromos, getPromo, addPromo, togglePromo, deletePromo,
  KATEGORI_TOKO, seedKategori, seedAll,
  addResi, getResi, trackResi, updateTrackingStatus, KURIR_LIST,
} from "../../src/lib/nova-toko2.js";

const pluginConfig = {
  name: "toko2",
  alias: ["toko2"],
  category: "market",
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
    p + "toko2 edit <kode> gambar (reply gambar) — upload ke Catbox",
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
          "Stok -1 = unlimited. Kategori opsional.\n" +
          "Gambar opsional: reply gambar + command, atau .toko2 edit <kode> gambar (reply gambar)"
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

      // Upload gambar ke Catbox (opsional — reply/kirim gambar dengan command)
      let imageUrl = null;
      const hasQuotedMedia = m.quoted?.isMedia && (m.quoted?.isImage || m.quoted?.type === "imageMessage");
      const isDirectImage = m.isMedia && m.isImage;
      if (hasQuotedMedia || isDirectImage) {
        try {
          const buffer = hasQuotedMedia ? await m.quoted.download() : await m.download();
          if (buffer) {
            imageUrl = await uploadToCatbox(buffer, "image.jpg");
          }
        } catch (e) {
          console.error("[toko2] Upload error:", e.message);
        }
      }

      const product = addProduct({ name, price, stock, desc, category, image: imageUrl || "" });
      let reply = toSC("Produk ditambah") + "\n\n" +
        toSC("Kode") + ": " + product.id + "\n" +
        toSC("Nama") + ": " + product.name + "\n" +
        toSC("Harga") + ": " + formatRupiah(product.price) + "\n" +
        toSC("Stok") + ": " + formatStock(product.stock) + "\n" +
        toSC("Kategori") + ": " + product.category;
      if (desc) reply += "\n" + toSC("Desc") + ": " + desc;
      if (imageUrl) reply += "\n" + toSC("Gambar") + ": OK (Catbox)";
      else reply += "\n" + toSC("Gambar") + ": - (opsional)";
      return m.reply(claraWrap("Toko2", reply));
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
      if (!kode || !field) return m.reply(claraWrap("Toko2", "Format: .toko2 edit <kode> <nama|harga|desc|kategori|gambar> <nilai>"));
      const product = getProduct(kode);
      if (!product) return m.reply(claraWrap("Toko2", toSC("Produk tidak ditemukan.")));

      // Gambar: reply gambar + .toko2 edit <kode> gambar
      if (field === "gambar" || field === "image") {
        const hasQuotedMedia = m.quoted?.isMedia && (m.quoted?.isImage || m.quoted?.type === "imageMessage");
        const isDirectImage = m.isMedia && m.isImage;
        if (!hasQuotedMedia && !isDirectImage) {
          return m.reply(claraWrap("Toko2", "Reply/kirim gambar lalu ketik .toko2 edit <kode> gambar"));
        }
        try {
          const buffer = hasQuotedMedia ? await m.quoted.download() : await m.download();
          if (!buffer) return m.reply(claraWrap("Toko2", "Gagal download gambar."));
          const imageUrl = await uploadToCatbox(buffer, "image.jpg");
          if (!imageUrl) return m.reply(claraWrap("Toko2", "Gagal upload ke Catbox."));
          updateProduct(kode, { image: imageUrl });
          return m.reply(claraWrap("Toko2", toSC("Gambar diperbarui") + ": " + kode + "\nURL: " + imageUrl));
        } catch (e) {
          return m.reply(claraWrap("Toko2", "Error upload: " + e.message));
        }
      }

      if (!nilai) return m.reply(claraWrap("Toko2", "Format: .toko2 edit <kode> <nama|harga|desc|kategori> <nilai>"));

      let updates = {};
      if (field === "nama" || field === "name") updates.name = nilai;
      else if (field === "harga" || field === "price") updates.price = parseInt(nilai);
      else if (field === "desc" || field === "deskripsi") updates.desc = nilai;
      else if (field === "kategori" || field === "category") updates.category = nilai;
      else return m.reply(claraWrap("Toko2", "Field: nama, harga, desc, kategori, gambar"));

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
    // RESI — Owner tambah resi ke invoice
    // ============================================================
    if (action === "resi" || action === "kirimresi") {
      const kode = (args[0] || "").toUpperCase();
      const resiNumber = args[1] || "";
      const kurir = (args[2] || "").toLowerCase();

      if (!kode || !resiNumber || !kurir) {
        // Show kurir list if no args
        if (!kode) {
          const kList = Object.entries(KURIR_LIST).map(([k, v]) => k + " (" + v.name + ")").join(", ");
          return m.reply(claraWrap("Toko2",
            "Format: .toko2 resi <invoice> <nomor_resi> <kurir>\n\n" +
            "Kurir tersedia:\n" + kList
          ));
        }
        return m.reply(claraWrap("Toko2", "Format: .toko2 resi <invoice> <nomor_resi> <kurir>"));
      }

      if (!KURIR_LIST[kurir]) {
        return m.reply(claraWrap("Toko2", toSC("Kurir tidak dikenal.") + " Tersedia: " + Object.keys(KURIR_LIST).join(", ")));
      }

      const result = addResi(kode, resiNumber, kurir);
      if (result.error) return m.reply(claraWrap("Toko2", result.error));

      // Notify buyer
      try {
        const kurirName = KURIR_LIST[kurir].name;
        const buyerLines = [
          "",
          toSC("Kode") + ": " + kode,
          toSC("Resi") + ": " + resiNumber,
          toSC("Kurir") + ": " + kurirName,
          "",
          toSC("Paket sedang dalam pengiriman."),
          toSC("Cek status: .beli2 lacak " + resiNumber + " " + kurir),
        ];
        await sock.sendMessage(result.invoice.buyerJid, { text: novaBox("RESI DIKIRIM", buyerLines) });
      } catch {}

      return m.reply(claraWrap("Toko2",
        toSC("Resi ditambah") + "\n\n" +
        toSC("Invoice") + ": " + kode + "\n" +
        toSC("Resi") + ": " + resiNumber + "\n" +
        toSC("Kurir") + ": " + KURIR_LIST[kurir].name + "\n" +
        toSC("Notifikasi dikirim ke pembeli")
      ));
    }

    // ============================================================
    // TRACK — Owner cek resi
    // ============================================================
    if (action === "track" || action === "cekresi") {
      const resiNumber = args[0] || "";
      const kurir = (args[1] || "").toLowerCase();

      if (!resiNumber || !kurir) {
        return m.reply(claraWrap("Toko2", "Format: .toko2 track <nomor_resi> <kurir>"));
      }

      const loading = await m.react("\u{1F551}").catch(() => {});
      const result = await trackResi(resiNumber, kurir);
      await m.react("\u{1F423}").catch(() => {});

      if (result.error) return m.reply(claraWrap("Toko2", result.error));

      const lines = [""];
      if (result.summary) {
        lines.push(toSC("Resi") + ": " + (result.summary.awb || resiNumber));
        lines.push(toSC("Kurir") + ": " + (result.summary.courier || kurir));
        lines.push(toSC("Status") + ": " + (result.summary.status || "-"));
        if (result.summary.service) lines.push(toSC("Service") + ": " + result.summary.service);
        lines.push("");
      }
      if (result.history && result.history.length) {
        lines.push("---");
        lines.push("");
        for (const h of result.history.slice(-8)) {
          const time = h.timestamp ? formatDate(h.timestamp) : (h.date || "-");
          lines.push((h.status || h.event || "") + " — " + time);
          if (h.message || h.desc) lines.push("  " + (h.message || h.desc));
          lines.push("");
        }
      }
      lines.push(toSC("Sumber") + ": " + (result.source || "manual"));
      return m.reply(novaBox("LACAK RESI", lines));
    }

    // ============================================================
    // SETKEY — Set Binderbyte API key untuk auto-track
    // ============================================================
    if (action === "setkey" || action === "setapikey") {
      const key = args[0] || "";
      if (!key) {
        return m.reply(claraWrap("Toko2",
          toSC("Set Binderbyte API key untuk auto-track resi") + "\n\n" +
          "Format: .toko2 setkey <key>\n\n" +
          "Daftar gratis: binderbyte.com"
        ));
      }
      const db = getDatabase();
      db.setting("binderbyteKey", key);
      db.save();
      return m.reply(claraWrap("Toko2", toSC("Binderbyte API key disimpan.")));
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
