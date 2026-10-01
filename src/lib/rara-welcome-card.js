// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-welcome-card.js — kartu canvas autosmartwelcome + helper welcome (detectCountry, fillWelcomeTemplate)
// Desain welcome/goodbye v1-v5 sudah dihapus — nanti dibuat ulang kalau ada desain baru
let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
import fs from "fs";
import path from "path";
import axios from "axios";
const DEFAULT_AVATAR = "https://i.imgur.com/TuItj4L.png";

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function loadAvatarSafe(avatarUrl) {
  const { loadImage } = await _getCanvas();
  const localFallback = path.join(
    process.cwd(),
    "assets",
    "images",
    "pp-kosong.jpg",
  );

  try {
    if (!avatarUrl) {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
      return await loadImage(DEFAULT_AVATAR);
    }

    if (
      avatarUrl === localFallback ||
      (typeof avatarUrl === "string" && avatarUrl.includes("pp-kosong"))
    ) {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
    }

    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      const response = await axios.get(avatarUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      return await loadImage(Buffer.from(response.data));
    }

    if (fs.existsSync(avatarUrl)) {
      const buffer = fs.readFileSync(avatarUrl);
      return await loadImage(buffer);
    }

    if (fs.existsSync(localFallback)) {
      const buffer = fs.readFileSync(localFallback);
      return await loadImage(buffer);
    }

    return await loadImage(DEFAULT_AVATAR);
  } catch (err) {
    try {
      if (fs.existsSync(localFallback)) {
        const buffer = fs.readFileSync(localFallback);
        return await loadImage(buffer);
      }
      return await loadImage(DEFAULT_AVATAR);
    } catch {
      return null;
    }
  }
}

function drawHexagonPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const xPos = x + r * Math.cos(angle);
    const yPos = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(xPos, yPos);
    else ctx.lineTo(xPos, yPos);
  }
  ctx.closePath();
}

/**
 * Fetch background image dari autoresbot API
 * Returns Image instance atau null jika gagal
 */
// ============================================================
// V2: Local canvas — Discord hexagon style (existing, preserved)
// ============================================================

async function createWideDiscordCard(
  username,
  avatarUrl,
  groupName,
  memberCount,
) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f0c29";
  ctx.fillRect(0, 0, width, height);
  const bgGlow = ctx.createRadialGradient(width, height, 0, width, height, 600);
  bgGlow.addColorStop(0, "rgba(48, 43, 99, 0.6)");
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const cardX = 50, cardY = 50, cardW = width - 100, cardH = height - 100;
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.stroke();
  const avatarSize = 180;
  const centerX = 200;
  const centerY = height / 2;
  ctx.save();
  ctx.shadowColor = "#00d2ff";
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(centerX, centerY, avatarSize / 2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.save();
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2);
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar)
      ctx.drawImage(avatar, centerX - avatarSize / 2, centerY - avatarSize / 2, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = "#333";
    ctx.fillRect(centerX - avatarSize / 2, centerY - avatarSize / 2, avatarSize, avatarSize);
  }
  ctx.restore();
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 5;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 + 5);
  ctx.stroke();
  const textX = 350;
  ctx.fillStyle = "rgba(0, 210, 255, 0.15)";
  ctx.beginPath();
  ctx.roundRect(textX, 120, 140, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#00d2ff";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("● NEW USER", textX + 15, 144);
  ctx.font = "900 60px Arial";
  const nameMetric = ctx.measureText(username);
  const gradient = ctx.createLinearGradient(textX, 0, textX + nameMetric.width, 0);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#92effd");
  ctx.fillStyle = gradient;
  ctx.fillText(username, textX, 220);
  ctx.fillStyle = "#a0a0a0";
  ctx.font = "24px Arial";
  ctx.fillText(`Bergabung ke: ${groupName}`, textX, 260);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(`MEMBERS: #${memberCount}`, textX, 320);
  ctx.beginPath();
  ctx.moveTo(width - 250, 350);
  ctx.lineTo(width - 50, 350);
  ctx.lineTo(width - 50, 340);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toBuffer("image/png");
}

// Deteksi negara dari prefix nomor telepon (62 = Indonesia, dll)
const COUNTRY_PREFIXES = [
  ["880", "Bangladesh"], ["966", "Arab Saudi"], ["971", "UEA"],
  ["234", "Nigeria"],
  ["62", "Indonesia"], ["60", "Malaysia"], ["65", "Singapura"],
  ["66", "Thailand"], ["63", "Filipina"], ["84", "Vietnam"],
  ["81", "Jepang"], ["82", "Korea Selatan"], ["86", "China"],
  ["91", "India"], ["92", "Pakistan"], ["90", "Turki"],
  ["44", "Inggris"], ["49", "Jerman"], ["33", "Prancis"],
  ["39", "Italia"], ["34", "Spanyol"], ["31", "Belanda"],
  ["41", "Swiss"], ["48", "Polandia"], ["52", "Meksiko"],
  ["55", "Brasil"], ["61", "Australia"], ["64", "Selandia Baru"],
  ["20", "Mesir"], ["27", "Afrika Selatan"],
  ["1", "Amerika Serikat"], ["7", "Rusia"],
];

function detectCountry(jid) {
  const num = String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (!num) return "Tidak diketahui";
  for (const [code, country] of COUNTRY_PREFIXES) {
    if (num.startsWith(code)) return `${country} (+${code})`;
  }
  return "Tidak diketahui";
}

// Isi placeholder custom welcome/goodbye message (dipakai setwelcome/setgoodbye)
// Placeholder: {user} {number} {group} {desc} {count} {owner} {date} {time} {day} {bot} {prefix}
function fillWelcomeTemplate(text, ctx) {
  const now = new Date();
  const dayName = now.toLocaleDateString("id-ID", { weekday: "long" });
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
  return String(text || "")
    .replaceAll("{user}", "@" + (ctx.username || ""))
    .replaceAll("{number}", ctx.username || "")
    .replaceAll("{group}", ctx.groupName || "")
    .replaceAll("{desc}", ctx.desc || "")
    .replaceAll("{count}", String(ctx.memberCount ?? 0))
    .replaceAll("{owner}", ctx.ownerName || "Owner")
    .replaceAll("{day}", dayName)
    .replaceAll("{date}", dateStr)
    .replaceAll("{time}", timeStr)
    .replaceAll("{bot}", ctx.botName || "Rara AI")
    .replaceAll("{prefix}", ctx.prefix || ".");
}

export {
  createWideDiscordCard,
  detectCountry,
  fillWelcomeTemplate,
};
