// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Premium (Info & Harga)
 * Pembuat Code: Aizat
 * Fitur: Tampilkan info lengkap premium bot — status, harga, benefit, statistik,
 *        metode pembayaran, kontak owner + kirim QRIS (mirip .sewa)
 */

import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getAllPlugins, getCategories, getCommandsByCategory } from "../../src/lib/nova-plugins.js";
import { getCaseCount, getCasesByCategory } from "../../case/nova.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import * as timeHelper from "../../src/lib/nova-time.js";

const pluginConfig = {
  name: "premium",
  alias: ["premium"],
  category: "info",
  description: "Info detail premium bot - harga, benefit, dan cara beli premium",
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

// ── HARGA PREMIUM ──
const PREMIUM_PRICES = [
  { duration: "7d", label: "Harian", desc: "7 Hari", price: "Rp 10.000", days: 7 },
  { duration: "30d", label: "Bulanan", desc: "30 Hari", price: "Rp 25.000", days: 30 },
  { duration: "90d", label: "Triwulan", desc: "90 Hari", price: "Rp 60.000", days: 90 },
  { duration: "lifetime", label: "Permanent", desc: "Seumur Hidup", price: "Rp 150.000", days: 0 },
];

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCountdown(expiredAt) {
  const diff = expiredAt - Date.now();
  if (diff <= 0) return "EXPIRED";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return days + " hari " + hours + " jam";
  if (hours > 0) return hours + " jam " + minutes + " menit";
  return minutes + " menit";
}

function getTotalPremiumCommands() {
  try {
    const plugins = getAllPlugins();
    const premiumCmds = plugins.filter(
      (p) => p.config.isPremium && p.config.isEnabled !== false,
    );
    const seen = new Set();
    for (const p of premiumCmds) {
      const names = Array.isArray(p.config.name)
        ? p.config.name
        : [p.config.name];
      for (const n of names) {
        if (n) seen.add(n);
      }
    }
    return seen.size || 50;
  } catch {
    return 50;
  }
}

function getTotalFeatures() {
  try {
    const categories = getCategories();
    let total = 0;
    for (const cat of categories) {
      total += (getCommandsByCategory(cat) || []).length;
      total += (getCasesByCategory(cat) || []).length;
    }
    return total > 0 ? total : 1258;
  } catch {
    return 1258;
  }
}

function getTotalCategories() {
  try {
    return getCategories().length || 38;
  } catch {
    return 38;
  }
}

function buildPriceList() {
  return PREMIUM_PRICES.map(
    (p) => `${p.label.padEnd(10)} ${p.price}`,
  );
}

function buildBenefits() {
  const defaultLimit = config.energi?.default || 300;
  const premiumLimit = config.energi?.premium || 1000;
  return [
    `Limit harian: *${premiumLimit}x* (vs ${defaultLimit}x user biasa)`,
    "Cooldown lebih rendah & prioritas antrian",
    "Akses " + getTotalPremiumCommands() + "+ command eksklusif",
    "No watermark di beberapa fitur download",
    "Support prioritas 24/7",
    "Fitur baru lebih cepat diakses",
  ];
}

function buildPremiumFeatures() {
  return [
    "AI Chat multi-provider (GPT-5, DeepSeek, Qwen3)",
    "Download YT, TikTok, IG, Facebook (no watermark)",
    "Sticker maker & canvas editor pro",
    "RPG economy system lengkap",
    "Image to anime, cartoon, chibi, ghibli",
    "Voice note auto-react premium",
    "HD video download (720p+)",
    "Batch download (multiple link sekaligus)",
  ];
}

function buildFeatureStats() {
  const total = getTotalFeatures();
  const cats = getTotalCategories();
  const premCmds = getTotalPremiumCommands();
  return [
    "Total command: " + total + "+",
    "Total kategori: " + cats,
    "Command premium: " + premCmds + "+",
    "AI providers: 15+ model",
    "Download manager: 10+ platform",
    "Sticker & canvas: 50+ template",
    "Game & RPG: 80+ perintah",
    "Group tools: 120+ perintah",
  ];
}

function buildBonusInfo() {
  return [
    "Gratis setup & konfigurasi awal",
    "Gratis update selama premium aktif",
    "Support via WhatsApp 24/7",
    "Garansi kalau bot down (di-restart)",
    "Bisa request fitur custom (1x/bulan)",
    "Early access fitur beta",
  ];
}

function buildPaymentMethods() {
  const payment = config.payment || {};
  const methods = [];

  if (payment.qrisUrl) methods.push("QRIS (lihat gambar)");

  const eWallets = (payment.methods || []).filter((m) => m.number);
  for (const m of eWallets) {
    methods.push(m.name + ": " + m.number + (m.holder ? " (" + m.holder + ")" : ""));
  }

  const banks = (payment.banks || []).filter((b) => b.number);
  for (const b of banks) {
    methods.push(b.name + ": " + b.number + (b.holder ? " (" + b.holder + ")" : ""));
  }

  if (methods.length === 0) {
    methods.push("Hubungi owner untuk metode pembayaran");
  }

  return methods;
}

async function handler(m, { sock, config: botConfig, db }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    // ── Ambil data user ──
    const database = db || getDatabase();
    const senderJid = m.sender;
    const senderNumber = senderJid?.replace(/[^0-9]/g, "") || "";

    if (!database.data.premium) database.data.premium = [];

    const premData = database.data.premium.find(
      (p) =>
        typeof p === "string"
          ? p === senderNumber
          : p.id === senderNumber,
    );

    const isConfigPrem = config.isPremium ? config.isPremium(senderNumber) : false;
    const isConfigOwner = config.isOwner ? config.isOwner(senderNumber) : false;

    // ── BAGIAN 1: STATUS PREMIUM USER ──
    let premStatus = "";

    if (isConfigOwner) {
      premStatus = bracketBox("👑", "Status Premium Kamu", [
        "Role: *Owner (Permanent)*",
        "Kamu adalah owner bot — akses penuh tanpa batas",
      ]);
    } else if (premData || isConfigPrem) {
      if (typeof premData === "string" || !premData?.expired) {
        premStatus = bracketBox("♾️", "Status Premium Kamu", [
          "Role: *Premium (Permanent)* ♾️",
          "Akses semua fitur tanpa batas waktu",
        ]);
      } else {
        const countdown = formatCountdown(premData.expired);
        const expiredStr = formatDate(premData.expired);
        const isExpired = premData.expired <= Date.now();
        premStatus = bracketBox(isExpired ? "❌" : "✅", "Status Premium Kamu", [
          "Nama: *" + (premData.name || m.pushName || "Unknown") + "*",
          "Status: *" + (isExpired ? "EXPIRED" : "AKTIF") + "*",
          "Sisa waktu: *" + countdown + "*",
          "Berakhir: *" + expiredStr + "*",
        ]);
      }
    } else {
      premStatus = bracketBox("⬜", "Status Premium Kamu", [
        "Role: *Free User*",
        "Limit harian: *" + (config.energi?.default || 300) + "x*",
        "Upgrade premium untuk akses penuh!",
      ]);
    }
    premStatus += "\n\n";

    // ── BAGIAN 2: INFO BOT ──
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const botVersion = botConfig.bot?.version || "21.2.0";
    const infoBox = bracketBox("🤖", "Info Bot", [
      "Nama: *" + botName + "*",
      "Versi: *v" + botVersion + "*",
      "Developer: *" + (botConfig.bot?.developer || "Aizat") + "*",
    ]);

    // ── BAGIAN 3: PAKET HARGA ──
    const priceBox = bracketBox("💰", "Daftar Harga Premium", buildPriceList());

    // ── BAGIAN 4: KEUNTUNGAN PREMIUM ──
    const benefitBox = bracketBox("⭐", "Keuntungan Premium", buildBenefits());

    // ── BAGIAN 5: FITUR PREMIUM TERBAIK ──
    const topBox = bracketBox("🔥", "Fitur Premium Terbaik", buildPremiumFeatures());

    // ── BAGIAN 6: STATISTIK FITUR ──
    const statsBox = bracketBox("📊", "Statistik Fitur", buildFeatureStats());

    // ── BAGIAN 7: BONUS PREMIUM ──
    const bonusBox = bracketBox("🎁", "Bonus Premium", buildBonusInfo());

    // ── BAGIAN 8: CARA BELI ──
    const caraBox = bracketBox("📝", "Cara Beli Premium", [
      "Ketik *" + prefix + "buyprem <durasi>*",
      "Contoh: *" + prefix + "buyprem 30d*",
      "Bayar via QRIS / E-Wallet",
      "Kirim bukti ke owner",
      "Owner approve → premium aktif!",
    ]);

    // ── BAGIAN 9: METODE PEMBAYARAN ──
    const paymentBox = bracketBox("💳", "Metode Pembayaran", buildPaymentMethods());

    // ── BAGIAN 10: FORMAT DURASI ──
    const formatBox = bracketBox("⏱️", "Format Durasi", [
      "7d = 7 hari",
      "30d = 30 hari",
      "90d = 90 hari",
      "lifetime = permanen",
    ]);

    // ── BAGIAN 11: KONTAK OWNER ──
    const ownerName = botConfig.owner?.name || "Owner";
    const ownerNumbers = botConfig.owner?.number || [];
    const ownerNumber = ownerNumbers[0] || "628174887770";
    const ownerBox = bracketBox("👨\u200d💻", "Kontak Owner", [
      "Nama: *" + ownerName + "*",
      "Nomor: wa.me/" + ownerNumber,
      "Chat untuk info lebih lanjut",
    ]);

    // ── GABUNG SEMUA ──
    let fullText =
      premStatus +
      infoBox + "\n\n" +
      priceBox + "\n\n" +
      benefitBox + "\n\n" +
      topBox + "\n\n" +
      statsBox + "\n\n" +
      bonusBox + "\n\n" +
      caraBox + "\n\n" +
      paymentBox + "\n\n" +
      formatBox + "\n\n" +
      ownerBox + "\n\n" +
      tipText("Ketik " + prefix + "buyprem <durasi> untuk beli sekarang!") + "\n" +
      tipText("Ketik " + prefix + "benefitpremium untuk lihat daftar command premium") + "\n" +
      tipText("Ketik " + prefix + "menu untuk kembali ke menu");

    await m.reply(fullText, "premium");

    // Auto-kirim QRIS image kalau tersedia
    const qrisUrl = config.payment?.qrisUrl || "";
    if (qrisUrl) {
      try {
        let qrisBuffer;
        if (/^https?:\/\//.test(qrisUrl)) {
          const response = await fetch(qrisUrl);
          qrisBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          qrisBuffer = fs.readFileSync(qrisUrl);
        }
        await sock.sendMessage(
          m.chat,
          {
            image: qrisBuffer,
            caption: "\n*Scan QRIS di atas untuk pembayaran premium*",
          },
          { quoted: m },
        );
      } catch (e) {
        console.error("[premium.js]:", e.message);
      }
    }
  } catch (error) {
    console.error("[premium.js] error:", error);
    await m.reply(
      claraWrap("Premium", [
        "Status: *GAGAL*",
        "Alasan: *" + (error.message || "Unknown error") + "*",
        "Coba lagi ya",
      ].join("\n")),
      "premium",
    );
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
