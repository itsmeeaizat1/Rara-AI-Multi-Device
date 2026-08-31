// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .lihatproduk — Lihat gambar produk toko biasa
 * User: .lihatproduk <nomor> — tampilkan gambar produk
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, toSC, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "lihatproduk",
  alias: ["lihatproduk"],
  category: "store",
  description: "🖼️ Lihat gambar produk toko",
  usage: ".lihatproduk <nomor>",
  example: ".lihatproduk 1",
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
  const db = getDatabase();
  const products = db.setting("storeProducts") || [];
  const input = (m.text || "").trim();
  const idx = parseInt(input) - 1;

  if (isNaN(idx) || idx < 0 || idx >= products.length) {
    return m.reply(claraWrap("lihatproduk", "Format: .lihatproduk <nomor>"));
  }

  const product = products[idx];
  if (!product.image) {
    return m.reply(claraWrap("lihatproduk", "Produk ini tidak punya gambar."));
  }

  const lines = [""];
  lines.push(toSC("No") + ": " + (idx + 1));
  lines.push(toSC("Nama") + ": " + product.name);
  lines.push(toSC("Harga") + ": " + formatPrice(product.price));
  if (product.originalPrice) lines.push(toSC("Diskon") + ": ~~" + formatPrice(product.originalPrice) + "~~");
  lines.push(toSC("Tipe") + ": " + (product.type === "fisik" ? "Fisik" : "Digital"));
  if (product.kategori && product.kategori !== "umum") lines.push(toSC("Kategori") + ": " + product.kategori);
  if (product.description) lines.push(toSC("Desc") + ": " + product.description);
  lines.push("");
  lines.push(toSC("Beli: .beli " + (idx + 1)));

  const caption = novaBox("GAMBAR PRODUK", lines);

  try {
    await sock.sendMessage(m.chat, {
      image: { url: product.image },
      caption: caption,
    }, { quoted: m });
  } catch (e) {
    return m.reply(claraWrap("lihatproduk", "Gagal load gambar. URL: " + product.image));
  }
}

export { pluginConfig as config, handler };
