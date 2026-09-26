// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaReply } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fakedev2",
  alias: ["fakedev2"],
  category: "maker",
  description: "Membuat fake developer profile card v2 (API maintenance)",
  usage: ".fakedev2 <nama> (reply/kirim foto)",
  example: ".fakedev2 Misaki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const msg = novaReply({
    title: "Fake Developer 2",
    info: [
      { label: "Status", value: "API nova.my.id OFFLINE" },
    ],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| API nova.my.id DNS tidak resolve\n| Fitur akan kembali saat API aktif",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
