// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraReply } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fakeffduo",
  alias: ["fakeffduo"],
  category: "maker",
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
  const msg = raraReply({
    title: "Fake FF Duo",
    info: [
      { label: "Status", value: "API rara.my.id OFFLINE" },
    ],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content: "|\n| API rara.my.id DNS tidak resolve\n| Fitur akan kembali saat API aktif",
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
