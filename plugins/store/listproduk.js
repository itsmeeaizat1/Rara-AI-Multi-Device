// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "listproduk",
  alias: ["listproduk"],
  category: "store",
  description: "🛍️ Lihat daftar produk yang tersedia",
  usage: ".listproduk [kategori]",
  example: ".listproduk",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatPrice(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const products = db.setting("storeProducts") || [];

  if (products.length === 0) {
    return m.reply(
      `🏪 *ᴘʀᴏᴅᴜᴋ ʙᴇʟᴜᴍ ᴛᴇʀꜱᴇᴅɪᴀ*\n\n` +
        `Saat ini belum ada produk yang ditambahkan oleh admin 😔\n\n` +
        `Silakan cek kembali nanti atau hubungi admin untuk informasi lebih lanjut.\n\n` +
        `_Terima kasih atas ketertarikan Anda_ 🙏`,
    );
  }

  const filterKat = (m.text || "").trim().toLowerCase();
  let displayProducts = products;
  let filterLabel = "";

  if (filterKat && filterKat !== "all" && filterKat !== "semua") {
    displayProducts = products.filter((p) => (p.kategori || "umum") === filterKat);
    if (displayProducts.length === 0) {
      // Show available categories
      const allCats = [...new Set(products.map((p) => p.kategori || "umum"))];
      return m.reply(
        `📂 *ᴋᴀᴛᴇɢᴏʀɪ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n` +
        `Kategori tersedia: ${allCats.join(", ")}\n\n` +
        `Ketik \`${m.prefix}listproduk <kategori>\` untuk filter\n` +
        `Atau \`${m.prefix}listproduk all\` untuk lihat semua`
      );
    }
    filterLabel = ` (Kategori: ${filterKat})`;
  }

  // Show category list if no filter
  const allCats = [...new Set(products.map((p) => p.kategori || "umum"))];
  let catInfo = "";
  if (!filterKat || filterKat === "all" || filterKat === "semua") {
    if (allCats.length > 1) {
      catInfo = `📂 Kategori: ${allCats.join(", ")}\n`;
      catInfo += `Filter: \`${m.prefix}listproduk <kategori>\`\n\n`;
    }
  }

  let txt = `🛍️ *ᴅᴀꜰᴛᴀʀ ᴘʀᴏᴅᴜᴋ${filterLabel}*\n\n`;
  txt += catInfo;
  txt += `Untuk pembelian, ketik \`${m.prefix}beli <nomor>\`\n\n`;

  for (let i = 0; i < displayProducts.length; i++) {
    const p = displayProducts[i];
    const realIdx = products.indexOf(p);
    const type = p.type || "digital";
    const typeIcon = type === "digital" ? "🔑" : "📦";
    const typeLabel = type === "digital" ? "Digital" : "Fisik";

    let stockDisplay;
    if (type === "digital") {
      const count = p.stockItems?.length || 0;
      stockDisplay = p.stock === -1 ? "♾️ Unlimited" : `${count} akun`;
    } else {
      stockDisplay = p.stock === -1 ? "♾️ Unlimited" : `${p.stock} pcs`;
    }

    const isAvailable =
      type === "digital"
        ? p.stockItems?.length > 0 || p.stock === -1
        : p.stock > 0 || p.stock === -1;
    const statusIcon = isAvailable ? "✅" : "❌";

    const priceStr = formatPrice(p.price);
    const originalPriceStr = p.originalPrice
      ? `~~${formatPrice(p.originalPrice)}~~ `
      : "";

    txt += `*${realIdx + 1}.* ${typeIcon} ${p.name}\n`;
    txt += `   💰 ${originalPriceStr}${priceStr}\n`;
    txt += `   📊 Stok: ${stockDisplay} ${statusIcon}\n`;
    txt += `   🏷️ Tipe: ${typeLabel}\n`;
    if (p.kategori && p.kategori !== "umum")
      txt += `   📂 Kategori: ${p.kategori}\n`;
    if (p.image) txt += `   🖼️ Gambar: Tersedia (.lihatproduk ${realIdx + 1})\n`;
    if (p.description)
      txt += `   📝 _${p.description.substring(0, 60)}${p.description.length > 60 ? "..." : ""}_\n`;
    txt += `\n`;
  }

  txt += `💡 _Ketik \`${m.prefix}beli <nomor>\` untuk memesan_\n`;
  txt += `🖼️ _Ketik \`${m.prefix}lihatproduk <nomor>\` untuk lihat gambar_`;

  if (m.isGroup) {
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";
    await sock.sendMessage(
      m.chat,
      {
        text: txt,
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false,
        },
      },
      { quoted: m },
    );
  } else {
    await m.reply(claraWrap("listproduk", txt));
  }
}

export { pluginConfig as config, handler };
