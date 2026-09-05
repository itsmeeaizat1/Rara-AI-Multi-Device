// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-welcome-card.js — V2 (local canvas hexagon), V3 (autoresbot API bg + vertical layout)
let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
import fs from "fs";
import path from "path";
import axios from "axios";
const DEFAULT_AVATAR = "https://i.imgur.com/TuItj4L.png";

// Autoresbot API config
const AUTORESBOT_BASE = "https://api.autoresbot.com";
const AUTORESBOT_BG_ENDPOINT = "/api/maker/bg-default";

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
async function fetchAutoresbotBg(apiKey) {
  const { loadImage } = await _getCanvas();
  try {
    const headers = { "User-Agent": "Mozilla/5.0" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await axios.get(
      `${AUTORESBOT_BASE}${AUTORESBOT_BG_ENDPOINT}`,
      {
        responseType: "arraybuffer",
        timeout: 15000,
        headers,
        params: apiKey ? { api_key: apiKey } : {},
      },
    );

    // Verify it's actually an image (not Cloudflare HTML)
    const buf = Buffer.from(response.data);
    const isPng = buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50;
    const isJpg = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
    if (!isPng && !isJpg) {
      console.error("[WelcomeV3] Autoresbot returned non-image (CF challenge?)");
      return null;
    }

    return await loadImage(buf);
  } catch (err) {
    console.error("[WelcomeV3] Autoresbot bg fetch failed:", err.message);
    return null;
  }
}

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

async function createGoodbyeCard(username, avatarUrl, groupName, memberCount) {
  const { createCanvas } = await _getCanvas();
  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f0505";
  ctx.fillRect(0, 0, width, height);
  const bgGlow = ctx.createRadialGradient(width, 0, 0, width, 0, 600);
  bgGlow.addColorStop(0, "rgba(180, 0, 0, 0.4)");
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 50, 50, 0.08)";
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
  ctx.fillStyle = "rgba(50, 0, 0, 0.3)";
  ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.stroke();
  const avatarSize = 180;
  const centerX = 200;
  const centerY = height / 2;
  ctx.save();
  ctx.shadowColor = "#ff0033";
  ctx.shadowBlur = 50;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 - 5);
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
    ctx.fillStyle = "#300";
    ctx.fillRect(centerX - avatarSize / 2, centerY - avatarSize / 2, avatarSize, avatarSize);
  }
  ctx.restore();
  ctx.strokeStyle = "#ff0033";
  ctx.lineWidth = 5;
  drawHexagonPath(ctx, centerX, centerY, avatarSize / 2 + 5);
  ctx.stroke();
  const textX = 350;
  ctx.fillStyle = "rgba(255, 0, 50, 0.15)";
  ctx.beginPath();
  ctx.roundRect(textX, 120, 160, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#ff0033";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("● DISCONNECTED", textX + 15, 144);
  ctx.font = "900 60px Arial";
  const nameMetric = ctx.measureText(username);
  const gradient = ctx.createLinearGradient(textX, 0, textX + nameMetric.width, 0);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#ff4d4d");
  ctx.fillStyle = gradient;
  ctx.fillText(username, textX, 220);
  ctx.fillStyle = "#c0a0a0";
  ctx.font = "24px Arial";
  ctx.fillText(`Meninggalkan: ${groupName}`, textX, 260);
  ctx.fillStyle = "#ffcccc";
  ctx.font = "bold 20px Arial";
  ctx.fillText(`REMAINING: #${memberCount}`, textX, 320);
  ctx.beginPath();
  ctx.moveTo(width - 250, 350);
  ctx.lineTo(width - 50, 350);
  ctx.lineTo(width - 50, 340);
  ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toBuffer("image/png");
}

// ============================================================
// V3: Autoresbot API bg + VERTICAL layout
// Layout: WELCOME title → "Selamat datang di (group)" → PP user (center) → "Member: total"
// ============================================================

async function createWelcomeCardV3(
  username,
  avatarUrl,
  groupName,
  memberCount,
  apiKey = "",
) {
  const { createCanvas } = await _getCanvas();
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Background — coba autoresbot API, fallback gradient
  const bgImage = await fetchAutoresbotBg(apiKey);

  if (bgImage) {
    // Cover-fit background
    const bgRatio = bgImage.width / bgImage.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;
    if (bgRatio > canvasRatio) {
      sw = bgImage.height * canvasRatio;
      sx = (bgImage.width - sw) / 2;
    } else {
      sh = bgImage.width / canvasRatio;
      sy = (bgImage.height - sh) / 2;
    }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, width, height);
    // Dark overlay untuk kontras
    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, "rgba(0, 0, 0, 0.55)");
    overlay.addColorStop(0.4, "rgba(0, 0, 0, 0.35)");
    overlay.addColorStop(1, "rgba(0, 0, 0, 0.65)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Fallback gradient
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0f0c29");
    bg.addColorStop(0.5, "#302b63");
    bg.addColorStop(1, "#24243e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Glass card container
  const cardX = 40, cardY = 40, cardW = width - 80, cardH = height - 80;
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 25);
  ctx.fill();
  ctx.stroke();

  // === VERTICAL LAYOUT ===
  // Top: WELCOME badge
  // Below: "Selamat datang di (group name)"
  // Center: PP user (avatar)
  // Below: "Member: total member"

  // 3. WELCOME badge (top center)
  ctx.font = "bold 32px Arial";
  const welcomeText = "WELCOME";
  const welcomeW = ctx.measureText(welcomeText).width;
  const badgeW = welcomeW + 50;
  const badgeX = (width - badgeW) / 2;
  const badgeY = 70;

  ctx.fillStyle = "rgba(0, 210, 255, 0.15)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#00d2ff";
  ctx.fillText(welcomeText, badgeX + 25, badgeY + 31);

  // 4. Username (below badge)
  ctx.font = "900 42px Arial";
  const cleanName = username.length > 18 ? username.substring(0, 18) + "..." : username;
  const nameW = ctx.measureText(cleanName).width;
  const grad = ctx.createLinearGradient((width - nameW) / 2, 0, (width + nameW) / 2, 0);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#92effd");
  ctx.fillStyle = grad;
  ctx.fillText(cleanName, (width - nameW) / 2, 145);

  // 5. "Selamat datang di (group name)" (below username)
  ctx.font = "22px Arial";
  ctx.fillStyle = "#a0a0a0";
  const cleanGroup = groupName.length > 35 ? groupName.substring(0, 35) + "..." : groupName;
  const groupText = `Selamat datang di ${cleanGroup}`;
  const groupW = ctx.measureText(groupText).width;
  ctx.fillText(groupText, (width - groupW) / 2, 185);

  // 6. PP user (center — avatar bulat dengan border cyan)
  const avatarSize = 200;
  const avatarX = width / 2;
  const avatarY = 340;

  // Shadow glow
  ctx.save();
  ctx.shadowColor = "#00d2ff";
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 - 5, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // Clip circle & draw avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar) {
      ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }
  } catch {
    ctx.fillStyle = "#333";
    ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  }
  ctx.restore();

  // Avatar border ring
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 5;
  ctx.stroke();

  // 7. "Member: total member" (below avatar)
  ctx.font = "bold 26px Arial";
  const memberText = `Member: ${memberCount}`;
  const memberW = ctx.measureText(memberText).width;
  const memBadgeW = memberW + 50;
  const memBadgeX = (width - memBadgeW) / 2;
  const memBadgeY = 480;

  ctx.fillStyle = "rgba(0, 210, 255, 0.12)";
  ctx.beginPath();
  ctx.roundRect(memBadgeX, memBadgeY, memBadgeW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#00d2ff";
  ctx.fillText(memberText, memBadgeX + 25, memBadgeY + 31);

  return canvas.toBuffer("image/png");
}

/**
 * V3: Goodbye card — vertical layout dengan autoresbot bg
 * Layout: GOODBYE title → "Telah keluar dari (group)" → PP user (center) → "Sisa Member: total"
 */
async function createGoodbyeCardV3(
  username,
  avatarUrl,
  groupName,
  memberCount,
  apiKey = "",
) {
  const { createCanvas } = await _getCanvas();
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Background — autoresbot API, fallback red gradient
  const bgImage = await fetchAutoresbotBg(apiKey);

  if (bgImage) {
    const bgRatio = bgImage.width / bgImage.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;
    if (bgRatio > canvasRatio) {
      sw = bgImage.height * canvasRatio;
      sx = (bgImage.width - sw) / 2;
    } else {
      sh = bgImage.width / canvasRatio;
      sy = (bgImage.height - sh) / 2;
    }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, width, height);
    // Red overlay
    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, "rgba(40, 0, 0, 0.6)");
    overlay.addColorStop(0.4, "rgba(20, 0, 0, 0.4)");
    overlay.addColorStop(1, "rgba(40, 0, 0, 0.7)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
  } else {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#1a0b0b");
    bg.addColorStop(0.5, "#4a0e0e");
    bg.addColorStop(1, "#240b0b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Glass card
  const cardX = 40, cardY = 40, cardW = width - 80, cardH = height - 80;
  ctx.fillStyle = "rgba(50, 0, 0, 0.2)";
  ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 25);
  ctx.fill();
  ctx.stroke();

  // 3. GOODBYE badge (top center)
  ctx.font = "bold 32px Arial";
  const goodbyeText = "GOODBYE";
  const goodbyeW = ctx.measureText(goodbyeText).width;
  const badgeW = goodbyeW + 50;
  const badgeX = (width - badgeW) / 2;
  const badgeY = 70;

  ctx.fillStyle = "rgba(255, 0, 50, 0.15)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 0, 50, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ff0033";
  ctx.fillText(goodbyeText, badgeX + 25, badgeY + 31);

  // 4. Username
  ctx.font = "900 42px Arial";
  const cleanName = username.length > 18 ? username.substring(0, 18) + "..." : username;
  const nameW = ctx.measureText(cleanName).width;
  const grad = ctx.createLinearGradient((width - nameW) / 2, 0, (width + nameW) / 2, 0);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#ff4d4d");
  ctx.fillStyle = grad;
  ctx.fillText(cleanName, (width - nameW) / 2, 145);

  // 5. "Telah keluar dari (group name)"
  ctx.font = "22px Arial";
  ctx.fillStyle = "#c0a0a0";
  const cleanGroup = groupName.length > 35 ? groupName.substring(0, 35) + "..." : groupName;
  const groupText = `Telah keluar dari ${cleanGroup}`;
  const groupW = ctx.measureText(groupText).width;
  ctx.fillText(groupText, (width - groupW) / 2, 185);

  // 6. PP user (center)
  const avatarSize = 200;
  const avatarX = width / 2;
  const avatarY = 340;

  ctx.save();
  ctx.shadowColor = "#ff0033";
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 - 5, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar) {
      ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }
  } catch {
    ctx.fillStyle = "#300";
    ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff0033";
  ctx.lineWidth = 5;
  ctx.stroke();

  // 7. "Sisa Member: total" (below avatar)
  ctx.font = "bold 26px Arial";
  const memberText = `Sisa Member: ${memberCount}`;
  const memberW = ctx.measureText(memberText).width;
  const memBadgeW = memberW + 50;
  const memBadgeX = (width - memBadgeW) / 2;
  const memBadgeY = 480;

  ctx.fillStyle = "rgba(255, 0, 50, 0.12)";
  ctx.beginPath();
  ctx.roundRect(memBadgeX, memBadgeY, memBadgeW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = "#ff0033";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffcccc";
  ctx.fillText(memberText, memBadgeX + 25, memBadgeY + 31);

  return canvas.toBuffer("image/png");
}

// ============================================================
// V4: Glassmorphism style (existing, preserved)
// ============================================================

async function createWelcomeCardV4(username, avatarUrl, groupName, memberCount) {
  const { createCanvas } = await _getCanvas();
  const width = 1024, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0f0c29");
  bgGradient.addColorStop(0.5, "#302b63");
  bgGradient.addColorStop(1, "#24243e");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath(); ctx.arc(width, 0, 300, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, height, 200, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  const cardX = 50, cardY = 50, cardW = width - 100, cardH = height - 100;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  const avatarSize = 180, avatarX = 150, avatarY = height / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar) ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  } catch { ctx.fillStyle = "#ccc"; ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 5; ctx.stroke();
  const textStart = 300;
  ctx.font = "bold 30px Arial"; ctx.fillStyle = "#00d2ff";
  ctx.fillText("WELCOME", textStart, 160);
  ctx.font = "bold 60px Arial"; ctx.fillStyle = "#ffffff";
  const cu = username.length > 15 ? username.substring(0, 15) + "..." : username;
  ctx.fillText(cu, textStart, 230);
  ctx.font = "30px Arial"; ctx.fillStyle = "#a0a0a0";
  ctx.fillText("to " + groupName, textStart, 280);
  const tagY = 320, tagText = `Member #${memberCount}`;
  ctx.font = "bold 24px Arial";
  const tagWidth = ctx.measureText(tagText).width + 40;
  drawRoundedRect(ctx, textStart, tagY, tagWidth, 40, 20);
  ctx.fillStyle = "rgba(0, 210, 255, 0.15)"; ctx.fill();
  ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#00d2ff"; ctx.fillText(tagText, textStart + 20, tagY + 28);
  return canvas.toBuffer("image/png");
}

async function createGoodbyeCardV4(username, avatarUrl, groupName, memberCount) {
  const { createCanvas } = await _getCanvas();
  const width = 1024, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#1a0b0b");
  bgGradient.addColorStop(0.5, "#4a0e0e");
  bgGradient.addColorStop(1, "#240b0b");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath(); ctx.arc(width, 0, 300, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, height, 200, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  const cardX = 50, cardY = 50, cardW = width - 100, cardH = height - 100;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.fill();
  ctx.strokeStyle = "rgba(255, 50, 50, 0.1)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  const avatarSize = 180, avatarX = 150, avatarY = height / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  try {
    const avatar = await loadAvatarSafe(avatarUrl);
    if (avatar) ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
  } catch { ctx.fillStyle = "#ccc"; ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff3333"; ctx.lineWidth = 5; ctx.stroke();
  const textStart = 300;
  ctx.font = "bold 30px Arial"; ctx.fillStyle = "#ff3333";
  ctx.fillText("GOODBYE", textStart, 160);
  ctx.font = "bold 60px Arial"; ctx.fillStyle = "#ffffff";
  const cu = username.length > 15 ? username.substring(0, 15) + "..." : username;
  ctx.fillText(cu, textStart, 230);
  ctx.font = "30px Arial"; ctx.fillStyle = "#a0a0a0";
  ctx.fillText("from " + groupName, textStart, 280);
  const tagY = 320, tagText = `Remaining #${memberCount}`;
  ctx.font = "bold 24px Arial";
  const tagWidth = ctx.measureText(tagText).width + 40;
  drawRoundedRect(ctx, textStart, tagY, tagWidth, 40, 20);
  ctx.fillStyle = "rgba(255, 50, 50, 0.15)"; ctx.fill();
  ctx.strokeStyle = "#ff3333"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#ff3333"; ctx.fillText(tagText, textStart + 20, tagY + 28);
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

export {
  createWideDiscordCard,
  createGoodbyeCard,
  createWelcomeCardV3,
  createGoodbyeCardV3,
  createWelcomeCardV4,
  createGoodbyeCardV4,
  fetchAutoresbotBg,
  detectCountry,
};
