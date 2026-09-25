// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: BuyPrem
 * Pembuat Code: Aizat
 * Fitur: User membeli premium sendiri via QRIS / E-Wallet
 *        Pilih durasi → lihat harga → bayar → otomatis kirim notif ke owner
 */

import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, bracketBox, tipText, toSC } from "../../src/lib/nova-menu-style.js";
import { generateWAMessageFromContent } from "nova";
import axios from "axios";

const pluginConfig = {
  name: "buyprem",
  alias: ["buyprem", "buypremium"],
  category: "store",
  description: "Beli premium bot - pilih durasi, lihat harga, bayar via QRIS/E-Wallet",
  usage: ".buyprem [durasi]",
  example: ".buyprem 30d  atau  .buyprem (pilih dari list)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

// Harga premium: dari src/lib/sewa/sewa.js (utak atik harga di situ)
import { PREMIUM_PRICES } from "../../src/lib/sewa/sewa.js";
import { premiumRoles } from "../../src/lib/store/nova-store.js";

// Session sementara untuk user yang lagi proses beli
const buySessions = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 menit

function formatRupiah(str) {
  return str || "Nego";
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
  const qrisUrl = config.payment?.qrisUrl || "";
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
      caption: "Scan QRIS di atas untuk pembayaran premium",
    }, { quoted: m });
  } catch (e) {
    console.error("[buyprem] QRIS error:", e.message);
  }
}

async function notifyOwner(sock, m, data) {
  const ownerNumbers = config.owner?.number || ["628174887770"];
  const buyerNumber = m.sender?.replace(/[^0-9]/g, "") || "";
  const buyerName = m.pushName || "Unknown";

  const notifText = `
│ ${toSC("Pembeli")}: *${toSC(buyerName)}*
│ ${toSC("Nomor")}: ${buyerNumber}
│ ${toSC("Paket")}: *${toSC(data.label)}*
│ ${toSC("Durasi")}: *${toSC(data.duration)}*
│ ${toSC("Harga")}: *${toSC(data.price)}*
│ ${toSC("Status")}: *${toSC("MENUNGGU PEMBAYARAN")}*
│ ${toSC("Waktu")}: ${new Date().toLocaleString("id-ID")}

${toSC("User ini menunggu konfirmasi pembayaran.")}
${toSC("Jika sudah bayar, ketik")}: *.addprem ${buyerNumber} ${data.days}*`;

  for (const num of ownerNumbers) {
    try {
      const jid = `${num}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: notifText });
    } catch (e) {
      console.error(`[buyprem] Notif owner ${num} error:`, e.message);
    }
  }
}

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const sender = m.sender;
  const args = m.text?.trim();

  // Cancel
  if (args === "batal" || args === "cancel") {
    buySessions.delete(sender);
    return m.reply(claraWrap("buyprem", "Pembelian premium dibatalkan."));
  }

  // Kalau ada argumen durasi langsung → cari paket matching
  if (args) {
    const pkg = PREMIUM_PRICES.find(
      (p) => p.duration === args.toLowerCase() || p.label.toLowerCase() === args.toLowerCase() || (p.desc || "").toLowerCase() === args.toLowerCase(),
    );

    if (pkg) {
      await m.react("🕒");
      buySessions.set(sender, { ...pkg, startedAt: Date.now() });
      setTimeout(() => buySessions.delete(sender), SESSION_TIMEOUT);

      const priceBox = bracketBox("💰", "Detail Pembelian", [
        `Paket: *${pkg.label}*`,
        `Harga: *${pkg.price}*`,
        `Durasi: *${pkg.duration}*`,
      ]);

      const roles = premiumRoles();
      const rolesBox = bracketBox("⭐", `Paket Termasuk ${roles.length} Role`, [
        `1. *${roles[0].label}* — ${roles[0].value}`,
        `2. *${roles[1].label}* — ${roles[1].value}`,
        `3. *${roles[2].label}* — ${roles[2].value}`,
      ]);

      const stepsBox = bracketBox("📝", "Cara Pembayaran", [
        `1. Bayar *${pkg.price}* via QRIS/E-Wallet`,
        `2. Screenshot bukti transfer`,
        `3. Kirim bukti ke owner`,
        `4. Owner konfirmasi → premium aktif!`,
      ]);

      const contactBox = bracketBox("👨‍💻", "Kontak Owner", [
        `Nama: *${config.owner?.name || "Owner"}*`,
        `Nomor: wa.me/${(config.owner?.number || ["628174887770"])[0]}`,
      ]);

      const fullText =
        priceBox + "\n\n" +
        rolesBox + "\n\n" +
        stepsBox + "\n\n" +
        contactBox + "\n\n" +
        tipText(`Ketik ${prefix}buyprem batal untuk batalkan`);

      await m.reply(fullText, "buyprem");
      await sendQRIS(sock, m);
      await notifyOwner(sock, m, pkg);
      return;
    }
  }

  // Tampilkan list paket
  const priceLines = PREMIUM_PRICES.map((p, i) =>
    `${i + 1}. *${p.label}* — ${p.price}`,
  );

  const roles = premiumRoles();
  const benefitBox = bracketBox("⭐", `Paket Premium = ${roles.length} Role`, [
    ...roles.map((r, i) => `${i + 1}. *${r.label}* — ${r.value}`),
  ]);
  const priceBox = bracketBox("💰", "Paket Premium", priceLines);

  const howBox = bracketBox("📝", "Cara Beli", [
    `Ketik: *${prefix}buyprem <paket>*`,
    `Contoh: *${prefix}buyprem 30d*`,
    `Atau: *${prefix}buyprem 30 Hari*`,
  ]);

  const paymentBox = bracketBox("💳", "Metode Pembayaran", buildPaymentMethods());

  const fullText =
    benefitBox + "\n\n" +
    priceBox + "\n\n" +
    howBox + "\n\n" +
    paymentBox + "\n\n" +
    tipText(`Ketik ${prefix}buyprem <durasi> untuk mulai beli!`);

  await m.react("🐣");
  await m.reply(fullText, "buyprem");
}

export { pluginConfig as config, handler };
