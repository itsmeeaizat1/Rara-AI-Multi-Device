// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hapusproduk",
  alias: ["hapusproduk"],
  category: "store",
  description: "🗑️ Hapus produk dari toko",
  usage: ".hapusproduk <nomor>",
  example: ".hapusproduk 1",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const products = db.setting("storeProducts") || [];

  if (products.length === 0) {
    return m.reply(
      `📭 *ʙᴇʟᴜᴍ ᴀᴅᴀ ᴘʀᴏᴅᴜᴋ.*\n\nTambahkan produk terlebih dahulu dengan \`${m.prefix}addproduk\` ➕`,
    );
  }

  const idx = parseInt(m.text?.trim()) - 1;

  if (isNaN(idx) || idx < 0 || idx >= products.length) {
    let txt = `🗑️ *ᴘɪʟɪʜ ᴘʀᴏᴅᴜᴋ ʏᴀɴɢ ᴅɪʜᴀᴘᴜꜱ*\n\nKetik \`${m.prefix}hapusproduk <nomor>\`\n\n`;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const typeIcon = p.type === "fisik" ? "📦" : "🔑";
      const stockDisplay =
        p.type === "fisik"
          ? p.stock === -1
            ? "♾️"
            : `${p.stock} pcs`
          : `${p.stockItems?.length || 0} akun`;
      txt += `${typeIcon} *${i + 1}.* ${p.name} — Rp ${p.price.toLocaleString("id-ID")} (${stockDisplay})\n`;
    }
    return await m.reply(claraWrap("hapusproduk", txt));
  }

  const deleted = products.splice(idx, 1)[0];
  db.setting("storeProducts", products);

  const typeIcon = deleted.type === "fisik" ? "📦" : "🔑";
  return m.reply(
    `🗑️ *ᴘʀᴏᴅᴜᴋ ᴅɪʜᴀᴘᴜꜱ*\n\n` +
      `${typeIcon} Nama: *${deleted.name}*\n` +
      `💰 Harga: *Rp ${deleted.price.toLocaleString("id-ID")}*\n` +
      `📊 Stok terhapus: *${deleted.type === "fisik" ? deleted.stock + " pcs" : (deleted.stockItems?.length || 0) + " akun"}*\n\n` +
      `⚠️ _Produk telah dihapus secara permanen dan tidak dapat dikembalikan._`,
  );
}

export { pluginConfig as config, handler };
