// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// melolo — Cari drama pendek Melolo (API covenant sedang down)
import { raraReply } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "melolo",
  alias: ["melolo"],
  category: "search",
  description: "Cari daftar drama pendek dari Melolo (maintenance)",
  usage: ".melolo <category>",
  example: ".melolo fantasy",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  var category = m.text ? m.text.trim() : "";

  if (!category) {
    var msg = raraReply({
      title: "Melolo Drama",
      status: "Masukkan kategori drama",
      content: "|\n| Contoh: " + m.prefix + "melolo fantasy",
    });
    return await m.reply(msg);
  }

  var msg = raraReply({
    title: "Melolo Drama",
    info: [
      { label: "Kategori", value: category },
      { label: "Status API", value: "Covenant OFFLINE" },
    ],
    status: "API covenant sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| Fitur akan kembali saat API aktif lagi",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
