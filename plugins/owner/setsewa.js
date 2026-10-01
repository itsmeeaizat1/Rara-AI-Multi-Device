// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// setsewa.js — Owner: ubah harga sewa bot & premium LIVE dari WhatsApp
// Harga persist di DB (settings.sewaOverrides), menimpa default
// src/lib/sewa/sewa.js tanpa edit file / restart.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  sewaPrice,
  premiumPrice,
  setSewaPrice,
  setPremiumPrice,
  resetSewaPrices,
  syncSewaOverrides,
} from "../../src/lib/sewa/sewa.js";

const pluginConfig = {
  name: "setsewa",
  alias: ["setsewa"],
  category: "owner",
  description: "Owner: ubah harga sewa bot & premium live",
  usage: ".setsewa daily|weekly|monthly|yearly|lifetime|custom|qris|premium|reset <nilai>",
  example: ".setsewa monthly Rp 75.000",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SEWA_KEYS = ["daily", "weekly", "monthly", "yearly", "lifetime", "custom", "qris"];

function currentView() {
  syncSewaOverrides();
  const sewaLines = [
    "• Sewa Bot:",
    `  daily    : ${sewaPrice.daily}`,
    `  weekly   : ${sewaPrice.weekly}`,
    `  monthly  : ${sewaPrice.monthly}`,
    `  yearly   : ${sewaPrice.yearly}`,
    `  lifetime : ${sewaPrice.lifetime}`,
    `  custom   : ${sewaPrice.custom}`,
    `  qris     : ${sewaPrice.qrisUrl}`,
    "",
    "• Premium Bot:",
  ];
  for (const p of premiumPrice) {
    sewaLines.push(`  ${p.duration.padEnd(9)}: ${p.label} — ${p.price}`);
  }
  return sewaLines;
}

async function handler(m, { config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    let args = raw.replace(new RegExp(`^\\${prefix}setsewa\\s*`, "i"), "").trim();
    const [key, ...rest] = args.split(/\s+/);
    const value = rest.join(" ").trim();

    // Tanpa argumen → tampil harga sekarang + usage
    if (!key) {
      return m.reply(raraWrap("Set Sewa", [
        "Harga sewa & premium saat ini:",
        "",
        ...currentView(),
        "",
        "📌 *Cara Pakai:*",
        `${prefix}setsewa daily|weekly|monthly|yearly|lifetime|custom <harga>`,
        `${prefix}setsewa qris <path/url gambar>`,
        `${prefix}setsewa premium <durasi> <harga>`,
        `${prefix}setsewa reset`,
        "",
        "💡 *Contoh:*",
        `${prefix}setsewa monthly Rp 75.000`,
        `${prefix}setsewa premium 30d Rp 30.000`,
        "",
        "Durasi premium valid: " + premiumPrice.map((p) => p.duration).join(", "),
      ]));
    }

    const k = key.toLowerCase();

    if (k === "reset") {
      resetSewaPrices();
      return m.reply(raraWrap("Set Sewa", [
        "Status: *berhasil*",
        "Semua harga direset ke default file src/lib/sewa/sewa.js",
      ]));
    }

    if (!value) {
      return m.reply(raraWrap("Set Sewa", [
        `Nilai untuk *${key}* kosong`,
        "",
        `📌 Ketik: ${prefix}setsewa ${key} <nilai>`,
      ]));
    }

    if (k === "premium") {
      // .setsewa premium 30d Rp 30.000
      const [dur, ...priceRest] = rest;
      const priceVal = priceRest.join(" ").trim();
      if (!dur || !priceVal) {
        return m.reply(raraWrap("Set Sewa", [
          "Format premium salah",
          "",
          `📌 Ketik: ${prefix}setsewa premium <durasi> <harga>`,
          "💡 Contoh: " + `${prefix}setsewa premium 30d Rp 30.000`,
          "",
          "Durasi valid: " + premiumPrice.map((p) => p.duration).join(", "),
        ]));
      }
      try {
        const pkg = setPremiumPrice(dur, { price: priceVal });
        return m.reply(raraWrap("Set Sewa", [
          "Status: *berhasil*",
          `Paket: *${pkg.label} (${pkg.duration})*`,
          `Harga baru: *${pkg.price}*`,
          "",
          "Harga sudah aktif di semua fitur (sewa, premium, payment, buyprem)",
        ]));
      } catch (e) {
        return m.reply(raraWrap("Set Sewa", [
          "Status: *gagal*",
          `Alasan: *${e.message}*`,
          "",
          "Durasi valid: " + premiumPrice.map((p) => p.duration).join(", "),
        ]));
      }
    }

    if (SEWA_KEYS.includes(k)) {
      try {
        setSewaPrice(k === "qris" ? "qrisUrl" : k, value);
        return m.reply(raraWrap("Set Sewa", [
          "Status: *berhasil*",
          `Field: *${k}*`,
          `Nilai baru: *${value}*`,
          "",
          "Harga sudah aktif di semua fitur (sewa, premium, payment, buysewa)",
        ]));
      } catch (e) {
        return m.reply(raraWrap("Set Sewa", [
          "Status: *gagal*",
          `Alasan: *${e.message}*`,
        ]));
      }
    }

    return m.reply(raraWrap("Set Sewa", [
      `Key *${key}* tidak dikenal`,
      "",
      "📌 *Key yang tersedia:* daily, weekly, monthly, yearly, lifetime, custom, qris, premium, reset",
    ]));
  } catch (error) {
    console.error("[setsewa] error:", error.message);
    return m.reply(raraWrap("Set Sewa", [
      "Status: *gagal*",
      `Alasan: *${error.message}*`,
    ]));
  }
}

export { pluginConfig as config, handler };
