// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: BuySewa
 * Pembuat Code: Aizat
 * Fitur: User membeli sewa bot untuk grup sendiri via QRIS / E-Wallet
 *        Pilih durasi → lihat harga → bayar → otomatis notif owner
 */

import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import { calculateSewaPrice } from "../../src/lib/nova-sewa-price.js";

const pluginConfig = {
  name: "buysewa",
  alias: ["buysewa"],
  category: "main",
  description: "Beli sewa bot untuk grup - pilih durasi, lihat harga, bayar via QRIS/E-Wallet",
  usage: ".buysewa [durasi] [link-grup]",
  example: ".buysewa 30d https://chat.whatsapp.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

// Harga sewa per durasi (ambil dari config.sewaPrice)
const SEWA_PACKAGES = [
  { duration: "7d", label: "7 Hari", days: 7 },
  { duration: "30d", label: "30 Hari", days: 30 },
  { duration: "90d", label: "90 Hari", days: 90 },
  { duration: "1y", label: "1 Tahun", days: 365 },
  { duration: "lifetime", label: "Permanent", days: 0 },
];

// Session sementara
const buySewaSessions = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000;

function getSewaPrice(durationStr) {
  const prices = config.sewaPrice || {};
  const lower = durationStr.toLowerCase();

  if (["lifetime", "permanent", "forever", "unlimited"].includes(lower)) {
    return prices.lifetime || "Rp 500.000";
  }

  const match = durationStr.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return prices.custom || "Nego";

  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "d") {
    if (val <= 7) return prices.weekly || "Rp 25.000";
    if (val <= 30) return prices.monthly || "Rp 50.000";
    return prices.yearly || "Rp 300.000";
  }
  if (unit === "m") {
    if (val >= 12) return prices.yearly || "Rp 300.000";
    return prices.monthly || "Rp 50.000";
  }
  if (unit === "y") return prices.yearly || "Rp 300.000";

  return prices.custom || "Nego";
}

function buildPaymentMethods() {
  const payment = config.payment || {};
  const methods = [];

  if (payment.qrisUrl) methods.push("QRIS (scan gambar)");

  const eWallets = (payment.methods || []).filter((m) => m.number);
  for (const m of eWallets) {
    methods.push(`${m.name}: ${m.number}${m.holder ? ` (${m.holder})` : ""}`);
  }

  const banks = (payment.banks || []).filter((b) => b.number);
  for (const b of banks) {
    methods.push(`${b.name}: ${b.number}${b.holder ? ` (${b.holder})` : ""}`);
  }

  if (methods.length === 0) {
    methods.push("Hubungi owner untuk metode pembayaran");
  }

  return methods;
}

async function sendQRIS(sock, m) {
  const qrisUrl = config.payment?.qrisUrl || config.sewaPrice?.qrisUrl || "";
  if (!qrisUrl) return;

  try {
    let qrisBuffer;
    if (/^https?:\/\//.test(qrisUrl)) {
      const response = await fetch(qrisUrl);
      qrisBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      qrisBuffer = fs.readFileSync(qrisUrl);
    }
    await sock.sendMessage(m.chat, {
      image: qrisBuffer,
      caption: "Scan QRIS di atas untuk pembayaran sewa bot",
    }, { quoted: m });
  } catch (e) {
    console.error("[buysewa] QRIS error:", e.message);
  }
}

async function notifyOwner(sock, m, pkg, groupLink) {
  const ownerNumbers = config.owner?.number || ["628174887770"];
  const buyerNumber = m.sender?.replace(/[^0-9]/g, "") || "";
  const buyerName = m.pushName || "Unknown";
  const groupName = m.isGroup ? (m.chat?.split("@")[0] || "Unknown") : "Unknown";

  const notifText = `╭──「 🏪 PEMBELIAN SEWA BARU 」
│ Pembeli: *${buyerName}*
│ Nomor: ${buyerNumber}
│ Paket: *${pkg.label}*
│ Durasi: *${pkg.duration}*
│ Harga: *${getSewaPrice(pkg.duration)}*
│ Grup: ${groupLink || (m.isGroup ? m.chat : "Belum ditentukan")}
│ Status: *MENUNGGU PEMBAYARAN*
│ Waktu: ${new Date().toLocaleString("id-ID")}
╰──────────❀

User ini menunggu konfirmasi pembayaran sewa.
Jika sudah bayar, ketik: *.addsewa ${groupLink || "<link-grup>"} ${pkg.duration}*`;

  for (const num of ownerNumbers) {
    try {
      const jid = `${num}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: notifText });
    } catch (e) {
      console.error(`[buysewa] Notif owner ${num} error:`, e.message);
    }
  }
}

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const sender = m.sender;
  const args = m.args || [];
  const rawText = m.text?.trim() || "";

  // Cancel
  if (rawText === "batal" || rawText === "cancel") {
    buySewaSessions.delete(sender);
    return m.reply(claraWrap("buysewa", "Pembelian sewa dibatalkan."));
  }

  // Parse: .buysewa <durasi> [link-grup]
  if (args.length >= 1) {
    const durationArg = args[0];
    const groupLink = args[1] || (m.isGroup ? m.chat : null);

    const pkg = SEWA_PACKAGES.find(
      (p) => p.duration === durationArg.toLowerCase() || p.label.toLowerCase() === durationArg.toLowerCase(),
    );

    if (pkg) {
      const price = getSewaPrice(pkg.duration);

      buySewaSessions.set(sender, { ...pkg, price, groupLink, startedAt: Date.now() });
      setTimeout(() => buySewaSessions.delete(sender), SESSION_TIMEOUT);

      const priceBox = bracketBox("💰", "Detail Pembelian Sewa", [
        `Paket: *${pkg.label}*`,
        `Harga: *${price}*`,
        `Durasi: *${pkg.duration}*`,
        groupLink ? `Grup: *${groupLink.includes("chat.whatsapp.com") ? "Via Link" : (m.isGroup ? "Grup Ini" : groupLink)}*` : "Grup: *Belum ditentukan*",
      ]);

      const stepsBox = bracketBox("📝", "Cara Pembayaran", [
        `1. Bayar *${price}* via QRIS/E-Wallet`,
        `2. Screenshot bukti transfer`,
        `3. Kirim bukti ke owner`,
        `4. Owner approve → bot auto-join grup!`,
      ]);

      const contactBox = bracketBox("👨‍💻", "Kontak Owner", [
        `Nama: *${config.owner?.name || "Owner"}*`,
        `Nomor: wa.me/${(config.owner?.number || ["628174887770"])[0]}`,
      ]);

      const fullText =
        priceBox + "\n\n" +
        stepsBox + "\n\n" +
        contactBox + "\n\n" +
        tipText(`Ketik ${prefix}buysewa batal untuk batalkan`);

      await m.reply(fullText, "buysewa");
      await sendQRIS(sock, m);
      await notifyOwner(sock, m, pkg, groupLink);
      return;
    }
  }

  // Tampilkan list paket
  const priceLines = SEWA_PACKAGES.map((p, i) =>
    `${i + 1}. *${p.label}* — ${getSewaPrice(p.duration)}`,
  );

  const featureBox = bracketBox("🤖", "Fitur Sewa Bot", [
    `Bot aktif 24/7 di grup kamu`,
    `Auto-join setelah approve`,
    `Gratis update selama sewa aktif`,
    `Support via WhatsApp`,
    `Garansi kalau bot down`,
  ]);

  const priceBox = bracketBox("💰", "Paket Sewa", priceLines);

  const howBox = bracketBox("📝", "Cara Beli", [
    `Ketik: *${prefix}buysewa <durasi>*`,
    `Contoh: *${prefix}buysewa 30d*`,
    `Untuk grup ini: *${prefix}buysewa 30d*`,
    `Via link: *${prefix}buysewa 30d https://chat.whatsapp.com/xxx*`,
  ]);

  const paymentBox = bracketBox("💳", "Metode Pembayaran", buildPaymentMethods());

  const formatBox = bracketBox("⏱️", "Format Durasi", [
    `7d = 7 hari`,
    `30d = 30 hari`,
    `90d = 90 hari`,
    `1y = 1 tahun`,
    `lifetime = permanen`,
  ]);

  const fullText =
    featureBox + "\n\n" +
    priceBox + "\n\n" +
    howBox + "\n\n" +
    formatBox + "\n\n" +
    paymentBox + "\n\n" +
    tipText(`Ketik ${prefix}buysewa <durasi> untuk mulai beli!`);

  await m.reply(fullText, "buysewa");
}

export { pluginConfig as config, handler };
