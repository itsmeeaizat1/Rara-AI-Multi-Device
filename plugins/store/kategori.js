// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .kategori — Manage kategori toko biasa
 * Owner: lihat, tambah, hapus kategori
 * User: lihat daftar kategori + produk per kategori
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kategori",
  alias: ["kategori"],
  category: 'owner',
  description: "📂 Manage kategori toko — lihat, filter produk per kategori",
  usage: ".kategori — lihat semua kategori\n.kategori <nama> — lihat produk per kategori\n.kategori add <nama> — tambah kategori (owner)\n.kategori del <nama> — hapus kategori (owner)",
  example: ".kategori app",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatPrice(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const products = db.setting("storeProducts") || [];
    const customCats = db.setting("storeCategories") || [];
    const isOwner = m.isOwner;
    const text = (m.text || "").trim();
    const args = text.split(/\s+/);
    const action = (args[0] || "").toLowerCase();

    // Owner: add kategori
    if (action === "add" && isOwner) {
      const nama = (args[1] || "").toLowerCase();
      if (!nama || nama.length < 2) {
        return m.reply(claraWrap("Kategori", "Format: .kategori add <nama>"));
      }
      if (customCats.includes(nama)) {
        return m.reply(claraWrap("Kategori", "Kategori sudah ada: " + nama));
      }
      customCats.push(nama);
      db.setting("storeCategories", customCats);
      db.save();
      return m.reply(claraWrap("Kategori", toSC("Kategori ditambah") + ": " + nama));
    }

    // Owner: del kategori
    if (action === "del" && isOwner) {
      const nama = (args[1] || "").toLowerCase();
      if (!nama) {
        return m.reply(claraWrap("Kategori", "Format: .kategori del <nama>"));
      }
      const idx = customCats.indexOf(nama);
      if (idx === -1) {
        return m.reply(claraWrap("Kategori", "Kategori tidak ditemukan: " + nama));
      }
      customCats.splice(idx, 1);
      db.setting("storeCategories", customCats);
      db.save();
      return m.reply(claraWrap("Kategori", toSC("Kategori dihapus") + ": " + nama));
    }

    // Show all categories
    if (!action || action === "all" || action === "semua") {
      const productCats = [...new Set(products.map((p) => p.kategori || "umum"))];
      const allCats = [...new Set([...customCats, ...productCats])];

      if (allCats.length === 0) {
        return m.reply(claraWrap("Kategori", toSC("Belum ada kategori.") + " Tambah produk dengan kategori atau .kategori add <nama>"));
      }

      const lines = [""];
      for (const cat of allCats) {
        const count = products.filter((p) => (p.kategori || "umum") === cat).length;
        lines.push(cat + " (" + count + " produk)");
      }
      lines.push("");
      lines.push(toSC("Lihat: .kategori <nama>"));
      lines.push(toSC("Filter: .listproduk <nama>"));

      if (isOwner) {
        lines.push("");
        lines.push(toSC("Owner: .kategori add/del <nama>"));
      }

      return m.reply(novaBox("KATEGORI TOKO", lines));
    }

    // Show products in category
    const filterCat = action;
    const filtered = products.filter((p) => (p.kategori || "umum") === filterCat);

    if (filtered.length === 0) {
      const allCats = [...new Set(products.map((p) => p.kategori || "umum"))];
      return m.reply(claraWrap("Kategori",
        toSC("Kategori tidak ditemukan") + ": " + filterCat + "\\n\\n" +
        "Tersedia: " + allCats.join(", ")
      ));
    }

    const lines = [""];
    lines.push(toSC("Kategori") + ": " + filterCat);
    lines.push(toSC("Total") + ": " + filtered.length + " produk");
    lines.push("");

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const realIdx = products.indexOf(p);
      const typeIcon = p.type === "fisik" ? "📦" : "🔑";
      const isAvailable = p.type === "fisik"
        ? p.stock > 0 || p.stock === -1
        : p.stockItems?.length > 0 || p.stock === -1;

      const priceStr = formatPrice(p.price);
      const origStr = p.originalPrice ? " ~~" + formatPrice(p.originalPrice) + "~~" : "";

      lines.push(realIdx + 1 + ". " + typeIcon + " " + p.name);
      lines.push("  " + priceStr + origStr + (isAvailable ? "" : " (Habis)"));
      if (p.description) lines.push("  " + p.description.substring(0, 50));
      lines.push("");
    }

    lines.push(toSC("Beli: .beli <nomor>"));

    return m.reply(novaBox("KATEGORI: " + filterCat.toUpperCase(), lines));
  } catch (error) {
    return m.reply(claraWrap("Kategori", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
