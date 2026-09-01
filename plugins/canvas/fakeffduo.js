// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaReply } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fakeffduo",
  alias: ["fakeffduo"],
  category: "canvas",
  description: "Membuat gambar FF Duo (API maintenance)",
  usage: ".fakeffduo <nama1|nama2>",
  example: ".fakeffduo nama1|nama2",
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
    title: "Fake FF Duo",
    info: [
      { label: "Status", value: "API nova.my.id OFFLINE" },
    ],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| API nova.my.id DNS tidak resolve\n| Fitur akan kembali saat API aktif",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
