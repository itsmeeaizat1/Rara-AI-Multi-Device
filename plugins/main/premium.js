// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Premium
 * Pembuat Code: Aizat
 * Fitur: Menampilkan list harga premium user (mirip .sewa tapi khusus premium)
 *        Tampilkan paket, keuntungan, cara beli, metode pembayaran
 */

import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, bracketBox, tipText, toSC, claraWrap } from "../../src/lib/nova-menu-style.js";
import path from "path";
import fs from "fs";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";

const pluginConfig = {
  name: "premium",
  alias: ["premium", "premlist", "harga premium"],
  category: "premium",
  description: "Menampilkan list harga premium",
  usage: ".premium",
  example: ".premium",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Harga premium per durasi
const PREMIUM_PRICES = [
  { duration: "7d", label: "7 Hari", price: "Rp 10.000", days: 7 },
  { duration: "30d", label: "30 Hari", price: "Rp 25.000", days: 30 },
  { duration: "90d", label: "90 Hari", price: "Rp 60.000", days: 90 },
  { duration: "lifetime", label: "Permanent", price: "Rp 150.000", days: 0 },
];

function buildPaymentMethods() {
  const payment = config.payment || {};
  const methods = [];

  if (payment.qris || payment.qrisUrl) methods.push("✅ QRIS (All E-Wallet & Bank)");
  if (payment.dana) methods.push(`✅ Dana: ${payment.dana}`);
  if (payment.gopay) methods.push(`✅ GoPay: ${payment.gopay}`);
  if (payment.ovo) methods.push(`✅ OVO: ${payment.ovo}`);
  if (payment.shopeepay) methods.push(`✅ ShopeePay: ${payment.shopeepay}`);
  if (payment.bank) methods.push(`✅ Bank Transfer: ${payment.bank}`);

  if (methods.length === 0) methods.push("QRIS / E-Wallet (tanya owner untuk detail)");

  return methods;
}

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Cek apakah user sudah premium
    const user = db.getUser(m.sender);
    const isPremium = m.isPremium || user?.isPremium;

    // ── Build list harga ──
    const priceLines = PREMIUM_PRICES.map((p, i) =>
      `${i + 1}. *${p.label}* — ${p.price}`,
    );

    // ── Keuntungan premium ──
    const energiPrem = botConfig.energi?.premium || 100;
    const energiDefault = botConfig.energi?.default || 25;
    const limitPrem = botConfig.limit?.premium || "Unlimited";
    const limitDefault = botConfig.limit?.default || 25;

    const benefitBox = bracketBox("⭐", "Keuntungan Premium", [
      `Limit harian: *${energiPrem}x* (${toSC("vs")} ${energiDefault}x ${toSC("biasa")})`,
      `Energi: *${toSC("Unlimited")}*`,
      `Akses fitur premium: *${toSC("Yes")}*`,
      `Cooldown lebih cepat: *${toSC("Yes")}*`,
      `Prioritas support dari owner`,
      `Badge premium di profil`,
      `Anti-banned dari limit habis`,
    ]);

    const priceBox = bracketBox("💰", "Paket Premium", priceLines);

    const howBox = bracketBox("📝", "Cara Beli", [
      `Ketik: *${prefix}buyprem <durasi>*`,
      `Contoh: *${prefix}buyprem 30d*`,
      `Atau ketik: *${prefix}buyprem* untuk pilih paket`,
    ]);

    const formatBox = bracketBox("⏱️", "Format Durasi", [
      `7d = ${toSC("7 hari")}`,
      `30d = ${toSC("30 hari")}`,
      `90d = ${toSC("90 hari")}`,
      `lifetime = ${toSC("permanen")}`,
    ]);

    const paymentBox = bracketBox("💳", "Metode Pembayaran", buildPaymentMethods());

    const statusBox = isPremium
      ? bracketBox("✅", "Status Premium", [
          `${toSC("Kamu sudah premium!")}`,
          isPremium.expiredAt
            ? `${toSC("Berlaku sampai")}: *${new Date(isPremium.expiredAt).toLocaleDateString("id-ID")}*`
            : `${toSC("Status")}: *${toSC("Active")}*`,
        ])
      : bracketBox("📋", "Status", [
          `${toSC("Kamu belum premium")}`,
          `${toSC("Belajar fitur premium di bawah!")}`,
        ]);

    const fullText =
      statusBox + "\n\n" +
      benefitBox + "\n\n" +
      priceBox + "\n\n" +
      howBox + "\n\n" +
      formatBox + "\n\n" +
      paymentBox + "\n\n" +
      tipText(`Ketik ${prefix}buyprem <durasi> untuk beli premium!`);

    // ── Nav buttons ──
    const navButtons = [
      { id: `${prefix}buyprem`, text: toSC("Beli Premium") },
      { id: `${prefix}menu`, text: toSC("Menu") },
      { id: `${prefix}sewa`, text: toSC("Sewa Bot") },
      { id: `${prefix}owner`, text: toSC("Owner") },
    ];
    // Kirim dengan menu card + thumbnail
    await sendMenuCard(sock, m, {
      text: fullText,
      footer: "",
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"),
      buttons: navButtons,
      title: `${toSC(botConfig.bot?.name || "Nova AI")} — ${toSC("Premium")}`,
    });
  } catch (e) {
    console.error("[premium] handler error:", e.message);
    try {
      await m.reply(novaError("Premium", "Gagal tampilkan list premium nih, coba lagi ya"));
    } catch {}
  }
}

export { pluginConfig as config, handler };
