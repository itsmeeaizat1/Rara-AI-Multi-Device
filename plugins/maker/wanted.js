// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// FIX 14 Sep 2026: versi lama CUMA nyimpen foto ke tmp lalu ngirim balik
// FOTO ASLI TANPA DIPROSES SAMA SEKALI, sambil klaim caption "Status: SUCCESS"
// efek wanted poster — bug ditemukan pas audit kualitas fitur canvas.
// Sekarang beneran generate poster wanted ala Wild West pakai @napi-rs/canvas
// lokal (gak ada ketergantungan API luar): kertas usang + bingkai + foto
// desaturasi sepia + judul "WANTED" + "DEAD OR ALIVE" + reward acak.
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { raraError, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "wanted",
  alias: ["wanted"],
  category: "maker",
  description: "Buat wanted poster ala Wild West dari gambar (lokal canvas)",
  usage: ".wanted",
  example: ".wanted (kirim/reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function extractImage(m) {
  const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const msg = quoted || m.message;
  const img = msg?.imageMessage;
  if (!img) return null;
  const mime = img.mimetype || "";
  if (!mime.startsWith("image")) return null;
  return { mediaMessage: img, mime };
}

/** Sepia/desaturasi ala foto lawas — biar berasa poster wanted jaman koboi. */
function applySepia(ctx, x, y, w, h) {
  const imgData = ctx.getImageData(x, y, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    d[i] = Math.min(255, gray + 38);
    d[i + 1] = Math.min(255, gray + 18);
    d[i + 2] = Math.max(0, gray - 22);
  }
  ctx.putImageData(imgData, x, y);
}

async function generateWantedPoster(photoBuffer) {
  const W = 900, H = 1250;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Latar kertas usang (gradient coklat pucat + speckle noise acak)
  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, "#e8d5a8");
  paper.addColorStop(0.5, "#dcc491");
  paper.addColorStop(1, "#cdb37c");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // Speckle/noda kertas acak (seeded biar konsisten tapi tetep natural)
  let seed = 1337;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,90,50,${(rnd() * 0.12).toFixed(3)})`;
    ctx.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3);
  }

  // Bingkai ganda ala poster tua
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  // Judul "WANTED"
  ctx.textAlign = "center";
  ctx.fillStyle = "#2a1c0e";
  ctx.font = "900 130px serif";
  ctx.fillText("WANTED", W / 2, 165);
  ctx.font = "italic 700 34px serif";
  ctx.fillText("DEAD OR ALIVE", W / 2, 215);

  // Foto (sepia, dalam frame persegi)
  const photoSize = 620;
  const photoX = (W - photoSize) / 2;
  const photoY = 260;
  try {
    const img = await loadImage(photoBuffer);
    ctx.save();
    ctx.strokeStyle = "#2a1c0e";
    ctx.lineWidth = 6;
    ctx.strokeRect(photoX - 3, photoY - 3, photoSize + 6, photoSize + 6);
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoSize, photoSize);
    ctx.clip();
    // crop tengah biar gak gepeng
    const scale = Math.max(photoSize / img.width, photoSize / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, photoX - (dw - photoSize) / 2, photoY - (dh - photoSize) / 2, dw, dh);
    applySepia(ctx, photoX, photoY, photoSize, photoSize);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#8a7454";
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    ctx.fillStyle = "#2a1c0e";
    ctx.font = "40px serif";
    ctx.fillText("(foto gagal dimuat)", W / 2, photoY + photoSize / 2);
  }

  // Reward acak
  const reward = (5 + Math.floor(rnd() * 495)) * 100000; // Rp 500rb - 50jt
  ctx.fillStyle = "#2a1c0e";
  ctx.font = "700 46px serif";
  ctx.fillText("REWARD", W / 2, photoY + photoSize + 80);
  ctx.font = "900 58px serif";
  ctx.fillText(`Rp ${reward.toLocaleString("id-ID")}`, W / 2, photoY + photoSize + 150);

  ctx.font = "italic 26px serif";
  ctx.fillStyle = "#4a3820";
  ctx.fillText("Diburu oleh hukum di seluruh penjuru negeri", W / 2, H - 60);

  return canvas.toBuffer("image/png");
}

async function handler(m, { sock }) {
  try {
    const media = extractImage(m);
    if (!media) {
      return m.reply(raraWrap("wanted",
        `🎨 *WANTED POSTER*\n\nKirim/reply foto buat dijadiin poster wanted ala koboi.\n\n${tipText(`Ketik ${m.prefix}wanted (kirim/reply gambar)`)}`));
    }

    await m.react("🧠");
    const buffer = await sock.downloadMediaMessage(media.mediaMessage);
    if (!buffer || buffer.length === 0) throw new Error("Gagal download gambar nih");

    const poster = await generateWantedPoster(buffer);
    await m.react("🐣");

    await sock.sendMessage(m.chat, {
      image: poster,
      caption: raraWrap("wanted", "🤠 *WANTED POSTER JADI!*"),
    }, { quoted: m });
  } catch (error) {
    console.error("[wanted]", error.message);
    await m.react("❌");
    return m.reply(raraError("Wanted", "Gagal bikin poster nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
