// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// FIX 14 Sep 2026 (audit fitur canvas): api.miaou.xyz DOWN — TLS handshake
// ditolak (SNI "unrecognized name"), bukan cuma DNS mati tapi subdomain-nya
// udah dilepas dari routing servernya sama sekali. Graceful error mengikuti
// pola fakedev/fakedev2/fakedev3 (API down beneran, no fallback palsu).
// .canvas juga redundant — 22 command spesifik lain (.balogo/.wanted/.iqc/
// .musiccard/dst) di kategori canvas udah nutupin kebutuhan yang sama.
import { novaReply, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "canvas",
  alias: ["canvas"],
  category: "tools",
  description: "Buat desain/grafis (API maintenance)",
  usage: ".canvas <teks>",
  example: ".canvas Hello World",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const msg = novaReply({
    title: "Canvas",
    info: [{ label: "Status", value: "API miaou.xyz OFFLINE" }],
    status: "API sedang down, fitur ini sementara tidak tersedia",
    content:
      "|\n| API miaou.xyz nolak koneksi (server dilepas)\n| Fitur akan kembali saat API aktif\n" +
      `| Sementara coba fitur canvas lain: ${prefix}balogo, ${prefix}wanted, ${prefix}iqc, ${prefix}musiccard`,
  });
  await m.reply(msg);
  return { handled: true };
}

export { pluginConfig as config, handler };
