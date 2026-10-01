// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .qris — Kirim gambar QRIS pembayaran all-in-one (sewa/premium/topup/donasi).
 * Dipakai tombol "Kirim QRIS" di katalog .payment (quick_reply id ".qris").
 */

import fs from "fs";
import path from "path";
import config from "../../config.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "qris",
  alias: ["qris"],
  category: "store",
  description: "Kirim QRIS pembayaran (sewa/premium/topup limit/donasi)",
  usage: ".qris",
  example: ".qris",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function resolveQrisPath() {
  const candidates = [
    config.payment?.qrisUrl,
    config.donasi?.qris,
    "./assets/image/store/aizat-store-qris.jpg",
  ].filter(Boolean);
  for (const c of candidates) {
    const p = path.isAbsolute(c) ? c : path.join(process.cwd(), c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    const qrisPath = resolveQrisPath();
    const botName = config.bot?.name || "Nova AI";
    const ownerNumber = String((config.owner?.number || [])[0] || "").replace(/[^0-9]/g, "");
    const ownerName = config.owner?.name || "Owner";

    const caption = [
      `QRIS Pembayaran ${botName}`,
      "",
      "Berlaku untuk semua layanan:",
      "- Sewa Bot",
      "- Beli Premium",
      "- Topup Limit Fitur",
      "- Donasi",
      "",
      "Sudah transfer? Konfirmasi ke owner ya!",
      `Owner: wa.me/${ownerNumber}`,
    ].join("\n");

    if (!qrisPath) {
      return m.reply(
        novaWrap("Qris", [
          "Status: *gagal*",
          "Alasan: *File QRIS tidak ditemukan*",
          `Minta QRIS langsung ke owner: wa.me/${ownerNumber}`,
        ].join("\n")),
      );
    }

    await sock.sendMessage(
      m.chat,
      { image: fs.readFileSync(qrisPath), caption },
      { quoted: m },
    );
  } catch (e) {
    console.error("[qris.js] error:", e.message);
    await m.reply(novaWrap("Qris", "Yah gagal kirim QRIS-nya, coba lagi ya 😩"));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
