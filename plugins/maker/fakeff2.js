// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraReply } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fakeff2",
  alias: ["fakeff2"],
  category: "maker",
  description: "Membuat gambar Free Fire 2 (API maintenance)",
  usage: ".fakeff2 <text>",
  example: ".fakeff2 Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const msg = raraReply({
    title: "Fake FF 2",
    info: [
      { label: "Status", value: "API rara.my.id OFFLINE" },
    ],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| API rara.my.id DNS tidak resolve\n| Fitur akan kembali saat API aktif",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
