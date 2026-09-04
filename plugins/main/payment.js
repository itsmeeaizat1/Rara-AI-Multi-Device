// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .payment — Katalog Layanan Bot (WhatsApp native carousel, geser
 * kiri/kanan ala katalog toko). 4 kartu:
 *   1. Sewa Bot      → harga dari src/lib/sewa/sewa.js
 *   2. Beli Premium  → harga premium dari src/lib/sewa/sewa.js
 *   3. Topup Limit   → harga dari energi.topup di src/lib/config/features.js
 *   4. Donasi        → metode dari donasi di config/setpayment.js
 *
 * Native carousel = interactiveMessage.carouselMessage. Library "nova"
 * (ourin-baileys fork) handle otomatis via ourin.handleCarousel — cukup
 * kirim plain object lewat sock.sendMessage(jid, { interactiveMessage: {...} }).
 *
 * Tiap card: header image + body (harga/benefit) + footer + 1 tombol
 * nativeFlowMessage cta_url "Order Di Sini!" → wa.me ke owner dengan teks
 * order otomatis terisi per produk (owner langsung tau yang dipesan).
 */

import fs from "fs";
import path from "path";
import config from "../../config.js";
import { sewaPrice, PREMIUM_PRICES } from "../../src/lib/sewa/sewa.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "payment",
  alias: ["payment", "katalog", "orderbot"],
  category: "store",
  description: "Katalog Sewa Bot, Premium, Topup Limit & Donasi — geser kartu kiri/kanan",
  usage: ".payment",
  example: ".payment",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function readCardImage(fileName) {
  const p = path.join(process.cwd(), "assets", "image", "store", fileName);
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

function ownerWaLink(ownerNumber, text) {
  const clean = String(ownerNumber || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function orderButton(ownerNumber, text, withQris = true) {
  const buttons = [
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "Order Di Sini!",
        url: ownerWaLink(ownerNumber, text),
      }),
    },
  ];
  // Tombol kedua: bot kirim gambar QRIS langsung di chat (quick_reply → .qris)
  if (withQris) {
    buttons.push({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "Kirim QRIS",
        id: ".qris",
      }),
    });
  }
  return { nativeFlowMessage: { buttons } };
}

function buildSewaBody(botName) {
  const p = sewaPrice;
  return [
    "</> Sewa Bot </>",
    "",
    `Harian    : ${p.daily || "Rp 5.000"}`,
    `Mingguan  : ${p.weekly || "Rp 25.000"}`,
    `Bulanan   : ${p.monthly || "Rp 50.000"}`,
    `Tahunan   : ${p.yearly || "Rp 300.000"}`,
    `Permanen  : ${p.lifetime || "Rp 500.000"}`,
    "",
    "</> Benefit Sewa </>",
    "- Bot pribadi khusus grupmu",
    "- Auto Welcome & Goodbye",
    "- Auto Kick (antifake/antilink)",
    "- Auto Open/Close grup terjadwal",
    `- Semua fitur ${botName} tanpa batas`,
  ].join("\n");
}

function buildPremiumBody() {
  const lines = ["</> Beli Premium </>", ""];
  for (const p of PREMIUM_PRICES) {
    lines.push(`${(p.desc || p.label).padEnd(12)} : ${p.price}`);
  }
  lines.push("", "</> Benefit Premium </>", "- Get Unlimited Limit", "- Get Akses Semua Fitur", "- Cooldown lebih rendah", "- Support prioritas 24/7");
  return lines.join("\n");
}

function buildTopupBody() {
  const topup = config.energi?.topup || [];
  const lines = ["</> Topup Limit Fitur </>", "", `Limit harian habis? Topup biar bisa lanjut!`, ""];
  for (const t of topup) {
    const label = t.amount === -1 ? (t.label || "Unlimited") : `+${t.amount} Limit`;
    lines.push(`${label.padEnd(12)} : ${t.price}`);
  }
  lines.push("", "</> Catatan </>", "- Limit topup gak hangus selama bot hidup", "- Bisa buat sendiri atau minta ditaruh ke teman");
  return lines.join("\n");
}

function buildDonasiBody() {
  const donasi = config.donasi || {};
  const lines = ["</> Donasi </>", "", "Mau dukung development bot? Donasi seikhlasnya 🙏", ""];
  const wallets = (donasi.payment || []).filter((w) => w.number);
  if (wallets.length > 0) {
    lines.push("</> E-Wallet </>");
    for (const w of wallets) {
      lines.push(`- ${w.name}: ${w.number}${w.holder ? ` (${w.holder})` : ""}`);
    }
  }
  if (donasi.qris) lines.push("", "</> QRIS </>", "- Scan QRIS di gambar kartu ini");
  if ((donasi.benefits || []).length > 0) {
    lines.push("", "</> Donasimu Untuk </>");
    for (const b of donasi.benefits) lines.push(`- ${b}`);
  }
  if (wallets.length === 0 && !donasi.qris) {
    lines.push("", "Hubungi owner untuk metode donasi ya!");
  }
  return lines.join("\n");
}

function buildCard({ image, body, footer, button }) {
  const card = {
    header: { title: "", ...(image ? { imageMessage: image } : {}) },
    body: { text: body },
    footer: { text: footer },
    ...button,
  };
  return card;
}

async function handler(m, { sock }) {
  try {
    const botName = config.bot?.name || "Nova AI";
    const ownerNumber = (config.owner?.number || [])[0] || "";
    const ownerName = config.owner?.name || "Owner";

    await m.reply(
      `Berikut katalog layanan *${botName}* — geser kartu ke kiri/kanan buat lihat semua ya! 💖`
    );

    const cards = [
      buildCard({
        image: readCardImage("payment-sewa-card.jpg"),
        body: buildSewaBody(botName),
        footer: `Sewa Bot ${botName}`,
        button: orderButton(ownerNumber, `Halo ${ownerName}, saya mau sewa bot ${botName} 🙏`),
      }),
      buildCard({
        image: readCardImage("payment-premium-card.jpg"),
        body: buildPremiumBody(),
        footer: `Beli Premium ${botName}`,
        button: orderButton(ownerNumber, `Halo ${ownerName}, saya mau beli premium ${botName} 🙏`),
      }),
      buildCard({
        image: readCardImage("payment-topup-card.jpg"),
        body: buildTopupBody(),
        footer: `Topup Limit ${botName}`,
        button: orderButton(ownerNumber, `Halo ${ownerName}, saya mau topup limit fitur ${botName} 🙏`),
      }),
      buildCard({
        image: readCardImage("payment-donasi-card.jpg"),
        body: buildDonasiBody(),
        footer: `Donasi ${botName}`,
        button: orderButton(ownerNumber, `Halo ${ownerName}, saya mau donasi buat ${botName} 🙏`),
      }),
    ];

    await sock.sendMessage(m.chat, {
      interactiveMessage: {
        body: { text: `© ${botName} - Katalog Layanan ✨` },
        footer: { text: botName },
        header: { title: "", hasMediaAttachment: false },
        carouselMessage: {
          cards,
          messageVersion: 1,
          carouselCardType: 1,
        },
      },
    });
  } catch (e) {
    console.error("[PAYMENT] carousel gagal, fallback teks:", e.message);
    const fallback =
      buildSewaBody(config.bot?.name || "Nova AI") +
      "\n\n" +
      buildPremiumBody() +
      "\n\n" +
      buildTopupBody() +
      "\n\n" +
      buildDonasiBody() +
      "\n\nHubungi owner: wa.me/" +
      String((config.owner?.number || [])[0] || "").replace(/[^0-9]/g, "");
    await m.reply(claraWrap("payment", fallback));
  }
}

export { pluginConfig as config, handler };
