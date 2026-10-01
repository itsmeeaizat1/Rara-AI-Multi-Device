// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraReply } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fakedev3",
  alias: ["fakedev3"],
  category: "maker",
  description: "Membuat fake developer profile card v3 (API maintenance)",
  usage: ".fakedev3 <nama> (reply/kirim foto)",
  example: ".fakedev3 Misaki",
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
    title: "Fake Developer 3",
    info: [
      { label: "Status", value: "API rara.my.id OFFLINE" },
    ],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| API rara.my.id DNS tidak resolve\n| Fitur akan kembali saat API aktif",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
