// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText, bracketBox } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getCategories, getCommandsByCategory } from "../../src/lib/rara-plugins.js";
import { getCaseCount, getCasesByCategory } from "../../case/rara.js";
import * as timeHelper from "../../src/lib/rara-time.js";
import config from "../../config.js";
import { sewaPrice } from "../../src/lib/sewa/sewa.js";
import { sendMenuCard, buildNavButtons } from "../../src/lib/rara-menu-card.js";
import fs from "fs";

const pluginConfig = {
  name: "sewa",
  alias: ["sewa"],
  category: "sewa premium",
  description: "Info detail sewa bot - harga, fitur, dan cara sewa",
  usage: ".sewa",
  example: ".sewa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

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

function buildPriceList() {
  const p = sewaPrice;
  return [
    "Harian    " + (p.daily || "Rp 5.000"),
    "Mingguan  " + (p.weekly || "Rp 25.000"),
    "Bulanan   " + (p.monthly || "Rp 50.000"),
    "Tahunan   " + (p.yearly || "Rp 300.000"),
    "Permanent " + (p.lifetime || "Rp 500.000"),
    "Custom    " + (p.custom || "Nego"),
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

  const banks = payment.banks || [];
  for (const b of banks) {
    if (b.number) methods.push(b.name + ": " + b.number + (b.holder ? " (" + b.holder + ")" : ""));
  }

  if (methods.length === 0) {
    methods.push("Hubungi owner untuk metode pembayaran");
  }

  return methods;
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

function buildTopFeatures() {
  return [
    "AI Chat multi-provider (GPT-5, DeepSeek, Qwen3)",
    "Download YT, TikTok, IG, Facebook",
    "Sticker maker & canvas editor pro",
    "RPG economy system lengkap",
    "Auto-reply AI 24/7 tanpa refresh",
    "Group moderation (antilink, antitoxic, antispam)",
    "Weather real-time di menu",
    "Voice note auto-react",
    "Image to anime, cartoon, chibi, ghibli",
    "1200+ command siap pakai",
  ];
}

function buildFeatureStats() {
  const total = getTotalFeatures();
  const cats = getTotalCategories();
  return [
    "Total command: " + total + "+",
    "Total kategori: " + cats,
    "AI providers: 15+ model",
    "Download manager: 10+ platform",
    "Sticker & canvas: 50+ template",
    "Game & RPG: 80+ perintah",
    "Group tools: 120+ perintah",
    "Update rutin setiap bulan",
  ];
}

function buildBonusInfo() {
  return [
    "Gratis setup & konfigurasi awal",
    "Gratis update selama sewa aktif",
    "Support via WhatsApp 24/7",
    "Bot auto-join grup setelah approve",
    "Garansi kalau bot down (di-restart)",
    "Bisa pindah grup (1x gratis per bulan)",
  ];
}

async function handler(m, { sock, config: botConfig, db }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    // Ambil data sewa grup (kalau ada)
    const database = db || getDatabase();
    if (!database.db.data.sewa) {
      database.db.data.sewa = { enabled: false, groups: {} };
      database.db.write();
    }

    const sewaData = database.db.data.sewa.groups[m.chat];
    const isGroup = m.isGroup;
    const ownerName = botConfig.owner?.name || "Owner";
    const ownerNumbers = botConfig.owner?.number || [];
    const ownerNumber = ownerNumbers[0] || "628174887770";
    const botName = botConfig.bot?.name || "Rara AI Whatsapp Bot";
    const botVersion = botConfig.bot?.version || "21.2.0";

    // ── BAGIAN 1: STATUS SEWA GRUP ──
    let sewaStatus = "";

    if (isGroup && sewaData) {
      const groupName = sewaData.name || m.chat.split("@")[0];

      if (sewaData.isLifetime) {
        sewaStatus = bracketBox("♾️", "Status Sewa Grup Ini", [
          "Grup: *" + groupName + "*",
          "Status: *permanent* ♾️",
          "Bot aktif selamanya di sini",
        ]);
      } else {
        const countdown = formatCountdown(sewaData.expiredAt);
        const expiredStr = timeHelper.fromTimestamp(sewaData.expiredAt, "D MMMM YYYY HH:mm");
        const isExpired = sewaData.expiredAt <= Date.now();
        sewaStatus = bracketBox(isExpired ? "❌" : "✅", "Status Sewa Grup Ini", [
          "Grup: *" + groupName + "*",
          "Status: *" + (isExpired ? "EXPIRED" : "AKTIF") + "*",
          "Sisa waktu: *" + countdown + "*",
          "Berakhir: *" + expiredStr + " WIB*",
        ]);
      }
      sewaStatus += "\n\n";
    } else if (isGroup && !sewaData) {
      sewaStatus = bracketBox("⚠️", "Status Sewa Grup Ini", [
        "Grup ini *belum terdaftar* sewa",
        "Bot bisa keluar sewaktu-waktu",
        "Sewa sekarang biar bot tetap di sini!",
      ]);
      sewaStatus += "\n\n";
    }

    // ── BAGIAN 2: INFO BOT ──
    const infoBox = bracketBox("🤖", "Info Bot", [
      "Nama: *" + botName + "*",
      "Versi: *v" + botVersion + "*",
      "Developer: *" + (botConfig.bot?.developer || "Aizat") + "*",
    ]);

    // ── BAGIAN 3: PAKET HARGA ──
    const priceBox = bracketBox("💰", "Daftar Harga Sewa", buildPriceList());

    // ── BAGIAN 4: STATISTIK FITUR ──
    const statsBox = bracketBox("📊", "Statistik Fitur", buildFeatureStats());

    // ── BAGIAN 5: FITUR TERBAIK ──
    const topBox = bracketBox("⭐", "Fitur Terbaik", buildTopFeatures());

    // ── BAGIAN 6: BONUS SEWA ──
    const bonusBox = bracketBox("🎁", "Bonus Sewa", buildBonusInfo());

    // ── BAGIAN 7: CARA SEWA ──
    const caraBox = bracketBox("📝", "Cara Sewa", [
      "Ketik *" + prefix + "daftarsewa* di private chat",
      "Isi data diri (nama, umur, asal)",
      "Kirim link invite grup kamu",
      "Pilih durasi sewa",
      "Pembayaran ke owner",
      "Owner approve => bot auto-join!",
    ]);

    // ── BAGIAN 8: METODE PEMBAYARAN ──
    const paymentBox = bracketBox("💳", "Metode Pembayaran", buildPaymentMethods());

    // ── BAGIAN 9: FORMAT DURASI ──
    const formatBox = bracketBox("⏱️", "Format Durasi", [
      "30i = 30 menit",
      "12h = 12 jam",
      "7d = 7 hari",
      "1m = 1 bulan",
      "1y = 1 tahun",
      "lifetime = permanen",
    ]);

    // ── BAGIAN 10: KONTAK OWNER ──
    const ownerBox = bracketBox("👨\u200d💻", "Kontak Owner", [
      "Nama: *" + ownerName + "*",
      "Nomor: wa.me/" + ownerNumber,
      "Chat untuk info lebih lanjut",
    ]);

    // ── GABUNG SEMUA ──
    let fullText = sewaStatus +
      infoBox + "\n\n" +
      priceBox + "\n\n" +
      statsBox + "\n\n" +
      topBox + "\n\n" +
      bonusBox + "\n\n" +
      caraBox + "\n\n" +
      paymentBox + "\n\n" +
      formatBox + "\n\n" +
      ownerBox + "\n\n" +
      tipText("Ketik " + prefix + "daftarsewa untuk daftar sekarang!") + "\n" +
      tipText("Ketik " + prefix + "menu untuk kembali ke menu");

    // Kirim via sendMenuCard: banner link-preview + 5 tombol nav standar
    await sendMenuCard(sock, m, {
      text: fullText,
      footer: "",
      buttons: buildNavButtons(m, db, prefix),
      title: botConfig.bot?.name || "Rara AI",
    });

    // Auto-reply QRIS image kalau tersedia
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
        await sock.sendMessage(m.chat, {
          image: qrisBuffer,
          caption: "\n*scan qris di atas untuk pembayaran sewa*"
        }, { quoted: m });
      } catch (e) { console.error('[rent.js]:', e.message); }
    }
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    await m.reply(
      raraWrap("Gagal", [
        "Status: *gagal*",
        "Alasan: *" + error.message + "*",
        "Coba lagi nanti atau hubungi owner",
      ].join("\n")),
      "sewa"
    );
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
