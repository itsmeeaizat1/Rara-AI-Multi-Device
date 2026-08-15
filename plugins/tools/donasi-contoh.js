// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// CONTOH PLUGIN: Cara kirim gambar QR dari assets folder
// File ini cuma contoh, bukan untuk dipakai langsung
// Copy polanya ke plugin kamu sendiri

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path ke QR image di assets folder
// Pastikan file QR-nya ada di assets/image/nova-qr.jpg (atau format lain)
const QR_PATH = path.join(__dirname, "../../assets/image/nova-qr.jpg");

// Data donasi (contoh)
const DONATION_INFO = {
  dana: "0812-3456-7890",
  gopay: "0812-3456-7890",
  ovo: "0812-3456-7890",
  bank: "BCA 1234567890 a.n. Aizat",
  saweria: "https://saweria.co/aizat",
};

const pluginConfig = {
  name: "donasicontoh",
  alias: ["donasiexample", "donasidemo"],
  category: "tools",
  description: "Contoh plugin donasi dengan QR dari assets",
  usage: ".donasicontoh",
  example: ".donasicontoh",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    // Cek apakah file QR ada
    if (!fs.existsSync(QR_PATH)) {
      // Kalau QR belum ada, kirim text saja
      let text = "DONASI UNTUK NOVA AI\n\n";
      text += "Dana: " + DONATION_INFO.dana + "\n";
      text += "GoPay: " + DONATION_INFO.gopay + "\n";
      text += "OVO: " + DONATION_INFO.ovo + "\n";
      text += "Bank: " + DONATION_INFO.bank + "\n";
      text += "Saweria: " + DONATION_INFO.saweria + "\n";
      text += "\nQR belum tersedia, gunakan nomor di atas.";

      await m.reply(claraWrap("Donasi", text));
      return { handled: true };
    }

    // Baca QR image dari assets sebagai Buffer
    const qrBuffer = fs.readFileSync(QR_PATH);

    // Caption untuk gambar QR
    let caption = "SCAN QR UNTUK DONASI\n\n";
    caption += "Atau transfer ke:\n";
    caption += "Dana: " + DONATION_INFO.dana + "\n";
    caption += "GoPay: " + DONATION_INFO.gopay + "\n";
    caption += "Bank: " + DONATION_INFO.bank + "\n";
    caption += "\nTerima kasih untuk dukungannya!";

    // Kirim gambar QR dengan caption
    await sock.sendMessage(m.chat, {
      image: qrBuffer,
      caption: claraWrap("Donasi", caption),
      mimetype: "image/jpeg",
    }, { quoted: m });

    return { handled: true };
  } catch (error) {
    console.error("donasicontoh error:", error);
    await m.reply(claraWrap("Donasi", "Gagal menampilkan QR donasi."));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };

// ================================================================
// CARA PAKAI CONTOH INI:
//
// 1. Taruh file QR kamu di: assets/image/nova-qr.jpg
//    Bisa juga .png, .webp — tinggal ubah QR_PATH
//
// 2. Daftarkan di config.js (optional, kalau mau pakai config.assets):
//    Tambahkan di dalam assets: { ... }
//    "nova-qr": "./assets/image/nova-qr.jpg",
//
// 3. Kalau pakai config.assets, ganti QR_PATH jadi:
//    const QR_PATH = config.assets["nova-qr"];
//
// 4. Pola yang sama berlaku untuk asset lain:
//    - Audio/VN:  sock.sendMessage(m.chat, { audio: buffer, mimetype: "audio/mp4", ptt: true })
//    - Video:     sock.sendMessage(m.chat, { video: buffer, caption: "text" })
//    - Sticker:   sock.sendMessage(m.chat, { sticker: buffer })
//    - Document:  sock.sendMessage(m.chat, { document: buffer, fileName: "file.pdf", mimetype: "application/pdf" })
//
// 5. Kalau mau kirim gambar dengan thumbnail (externalAdReply):
//    await sock.sendMessage(m.chat, {
//      text: "caption",
//      contextInfo: {
//        externalAdReply: {
//          title: "Donasi Nova AI",
//          body: "Scan untuk donasi",
//          thumbnail: qrBuffer,
//          sourceUrl: "https://saweria.co/aizat",
//        }
//      }
//    });
// ================================================================
