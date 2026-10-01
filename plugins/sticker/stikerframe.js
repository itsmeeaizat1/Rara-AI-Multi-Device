// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

// ─── Frame definitions ───
const FRAMES = {
  polaroid: {
    name: "Polaroid",
    alias: ["Polaroid", "stikerframe"],
    desc: "Bingkai putih klasik ala foto polaroid dengan ruang teks di bawah",
    emoji: "📸",
  },
  neon: {
    name: "Neon Glow",
    desc: "Bingkai dengan efek glow neon (pink, biru, hijau, oranye)",
    emoji: "🌈",
  },
  rounded: {
    name: "Rounded",
    desc: "Sudut melengkung halus dengan border tipis",
    emoji: "🔘",
  },
  vintage: {
    name: "Vintage",
    desc: "Efek sepia + bingkai putih klasik",
    emoji: "🎞️",
  },
  film: {
    name: "Film Strip",
    desc: "Bingkai ala film strip hitam dengan lubang perforasi",
    emoji: "🎬",
  },
  shadow: {
    name: "Shadow",
    desc: "Drop shadow halus di latar transparan",
    emoji: "🌑",
  },
  blur: {
    name: "Blur Border",
    alias: ["Polaroid", "stikerframe"],
    desc: "Versi blur dari foto sebagai background border",
    emoji: "🌫️",
  },
  gradient: {
    name: "Gradient",
    desc: "Border gradient warna-warni di sekeliling foto",
    emoji: "🎨",
  },
  minimal: {
    name: "Minimal",
    desc: "Border putih tipis clean look",
    emoji: "⬜",
  },
  heart: {
    name: "Heart Shape",
    desc: "Foto dipotong jadi bentuk hati dengan border",
    emoji: "❤️",
  },
  circle: {
    name: "Circle",
    desc: "Foto dipotong jadi lingkaran dengan border ring",
    emoji: "⭕",
  },
  sticker: {
    name: "Sticker Cut",
    desc: "Background putih tebal ala stiker die-cut",
    emoji: "✂️",
  },
};

// ─── Color presets for neon ───
const NEON_COLORS = [
  { name: "pink",   rgb: { r: 255, g: 20, b: 147 } },
  { name: "blue",   rgb: { r: 0,   g: 191, b: 255 } },
  { name: "green",  rgb: { r: 57,  g: 255, b: 20  } },
  { name: "orange", rgb: { r: 255, g: 165, b: 0   } },
  { name: "purple", rgb: { r: 138, g: 43,  b: 226 } },
  { name: "cyan",   rgb: { r: 0,   g: 255, b: 255 } },
  { name: "red",    rgb: { r: 255, g: 0,   b: 0   } },
  { name: "yellow", rgb: { r: 255, g: 255, b: 0   } },
];

// ─── Sharp helper ───
async function getSharp() {
  return (await import("sharp")).default;
}

// ─── Frame processors ───

async function framePolaroid(sharp, imgBuffer) {
  // Resize image to fit, add white border with extra space at bottom
  const imgSize = 460;
  const borderWidth = 40;
  const bottomExtra = 120;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalW = imgSize + borderWidth * 2;
  const totalH = imgSize + borderWidth + bottomExtra;

  const result = await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: resized,
      left: borderWidth,
      top: borderWidth,
    }])
    .png()
    .toBuffer();

  return result;
}

async function frameNeon(sharp, imgBuffer, color) {
  const imgSize = 480;
  const glowSize = 16;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Create glow layers (3 passes, increasing blur)
  const totalSize = imgSize + glowSize * 2;
  const glows = [];
  for (let i = 0; i < 3; i++) {
    const blurAmount = glowSize - i * 4;
    if (blurAmount <= 0) continue;
    const glow = await sharp({
      create: {
        width: imgSize,
        height: imgSize,
        channels: 4,
        background: { ...color, alpha: 1 },
      },
    })
      .blur(blurAmount)
      .resize(totalSize, totalSize, { fit: "contain", position: "centre" })
      .png()
      .toBuffer();
    glows.push({ input: glow, blend: "over" });
  }

  // Composite: glows first, then image on top
  let pipeline = sharp({
    create: {
      width: totalSize,
      height: totalSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composites = [
    ...glows,
    {
      input: await sharp(resized)
        .resize(imgSize, imgSize)
        .png()
        .toBuffer(),
      left: glowSize,
      top: glowSize,
    },
  ];

  const result = await pipeline
    .composite(composites)
    .png()
    .toBuffer();

  return result;
}

async function frameRounded(sharp, imgBuffer) {
  const imgSize = 480;
  const radius = 60;
  const borderW = 8;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Create rounded corner mask
  const roundedMask = await sharp({
    create: {
      width: imgSize,
      height: imgSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: Buffer.from(
        `<svg width="${imgSize}" height="${imgSize}">
          <rect x="0" y="0" width="${imgSize}" height="${imgSize}" rx="${radius}" ry="${radius}" fill="white"/>
        </svg>`
      ),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  // Apply mask to image
  const roundedImg = await sharp(resized)
    .composite([{
      input: Buffer.from(
        `<svg width="${imgSize}" height="${imgSize}">
          <rect x="0" y="0" width="${imgSize}" height="${imgSize}" rx="${radius}" ry="${radius}" fill="none" stroke="white" stroke-width="${borderW}"/>
        </svg>`
      ),
      blend: "over",
    }])
    .png()
    .toBuffer();

  // Create final with transparent bg
  const result = await sharp(roundedImg)
    .ensureAlpha()
    .png()
    .toBuffer();

  return result;
}

async function frameVintage(sharp, imgBuffer) {
  const imgSize = 460;
  const borderWidth = 50;

  // Sepia + slightly desaturate
  const processed = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.7, brightness: 0.95 })
    .tint({ r: 255, g: 240, b: 200 })
    .png()
    .toBuffer();

  const totalW = imgSize + borderWidth * 2;
  const totalH = imgSize + borderWidth * 2;

  const result = await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 250, g: 245, b: 230, alpha: 1 },
    },
  })
    .composite([{
      input: processed,
      left: borderWidth,
      top: borderWidth,
    }])
    .png()
    .toBuffer();

  return result;
}

async function frameFilm(sharp, imgBuffer) {
  const imgSize = 440;
  const stripH = 35;
  const holeSize = 18;
  const holeSpacing = 30;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalW = imgSize;
  const totalH = imgSize + stripH * 2;

  // Create film strip holes (top and bottom)
  const holeCount = Math.floor((imgSize - holeSpacing) / (holeSize + holeSpacing));
  let holesSvgTop = "";
  let holesSvgBottom = "";
  for (let i = 0; i < holeCount; i++) {
    const x = holeSpacing + i * (holeSize + holeSpacing);
    holesSvgTop += `<rect x="${x}" y="${(stripH - holeSize) / 2}" width="${holeSize}" height="${holeSize}" rx="3" fill="white"/>`;
    holesSvgBottom += `<rect x="${x}" y="${(stripH - holeSize) / 2}" width="${holeSize}" height="${holeSize}" rx="3" fill="white"/>`;
  }

  const result = await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      // Top strip with holes
      {
        input: Buffer.from(
          `<svg width="${totalW}" height="${stripH}">${holesSvgTop}</svg>`
        ),
        left: 0,
        top: 0,
        blend: "dest-out",
      },
      // Image
      {
        input: resized,
        left: 0,
        top: stripH,
      },
      // Bottom strip with holes
      {
        input: Buffer.from(
          `<svg width="${totalW}" height="${stripH}">${holesSvgBottom}</svg>`
        ),
        left: 0,
        top: totalH - stripH,
        blend: "dest-out",
      },
    ])
    .png()
    .toBuffer();

  return result;
}

async function frameShadow(sharp, imgBuffer) {
  const imgSize = 460;
  const shadowBlur = 25;
  const shadowOffset = 10;
  const padding = shadowBlur + shadowOffset;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalSize = imgSize + padding * 2;

  // Create shadow
  const shadow = await sharp({
    create: {
      width: imgSize,
      height: imgSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.5 },
    },
  })
    .blur(shadowBlur)
    .png()
    .toBuffer();

  const result = await sharp({
    create: {
      width: totalSize,
      height: totalSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: shadow,
        left: padding + shadowOffset,
        top: padding + shadowOffset,
      },
      {
        input: resized,
        left: padding,
        top: padding,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

async function frameBlur(sharp, imgBuffer) {
  const imgSize = 400;
  const blurSize = 480;
  const blurAmount = 20;

  // Blurred background
  const blurred = await sharp(imgBuffer)
    .resize(blurSize, blurSize, { fit: "cover", position: "centre" })
    .blur(blurAmount)
    .png()
    .toBuffer();

  // Sharp foreground
  const sharpImg = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const result = await sharp(blurred)
    .composite([{
      input: sharpImg,
      left: Math.floor((blurSize - imgSize) / 2),
      top: Math.floor((blurSize - imgSize) / 2),
    }])
    .png()
    .toBuffer();

  return result;
}

async function frameGradient(sharp, imgBuffer) {
  const imgSize = 460;
  const borderW = 20;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalSize = imgSize + borderW * 2;

  // Create gradient border using SVG
  const gradientSvg = Buffer.from(
    `<svg width="${totalSize}" height="${totalSize}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff0080"/>
          <stop offset="25%" stop-color="#ff8c00"/>
          <stop offset="50%" stop-color="#40e0d0"/>
          <stop offset="75%" stop-color="#7b68ee"/>
          <stop offset="100%" stop-color="#ff1493"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${totalSize}" height="${totalSize}" fill="url(#grad)"/>
      <rect x="${borderW}" y="${borderW}" width="${imgSize}" height="${imgSize}" fill="black"/>
    </svg>`
  );

  const gradientBg = await sharp(gradientSvg).png().toBuffer();

  const result = await sharp(gradientBg)
    .composite([{
      input: resized,
      left: borderW,
      top: borderW,
    }])
    .png()
    .toBuffer();

  return result;
}

async function frameMinimal(sharp, imgBuffer) {
  const imgSize = 480;
  const borderW = 12;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalSize = imgSize + borderW * 2;

  const result = await sharp({
    create: {
      width: totalSize,
      height: totalSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: resized,
      left: borderW,
      top: borderW,
    }])
    .png()
    .toBuffer();

  return result;
}

async function frameHeart(sharp, imgBuffer) {
  const imgSize = 480;
  const borderW = 6;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Heart shape mask
  const heartPath = `M${imgSize/2},${imgSize*0.85}
    C${imgSize*0.15},${imgSize*0.6} ${imgSize*0.05},${imgSize*0.3} ${imgSize*0.2},${imgSize*0.18}
    C${imgSize*0.35},${imgSize*0.08} ${imgSize*0.48},${imgSize*0.18} ${imgSize/2},${imgSize*0.32}
    C${imgSize*0.52},${imgSize*0.18} ${imgSize*0.65},${imgSize*0.08} ${imgSize*0.8},${imgSize*0.18}
    C${imgSize*0.95},${imgSize*0.3} ${imgSize*0.85},${imgSize*0.6} ${imgSize/2},${imgSize*0.85} Z`;

  const heartMask = Buffer.from(
    `<svg width="${imgSize}" height="${imgSize}" viewBox="0 0 ${imgSize} ${imgSize}">
      <path d="${heartPath}" fill="white"/>
    </svg>`
  );

  // Apply heart mask
  const heartImg = await sharp(resized)
    .composite([{
      input: heartMask,
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  // Add red border around heart
  const heartBorder = Buffer.from(
    `<svg width="${imgSize}" height="${imgSize}" viewBox="0 0 ${imgSize} ${imgSize}">
      <path d="${heartPath}" fill="none" stroke="#ff3366" stroke-width="${borderW}" stroke-linejoin="round"/>
    </svg>`
  );

  const result = await sharp(heartImg)
    .composite([{
      input: heartBorder,
      blend: "over",
    }])
    .ensureAlpha()
    .png()
    .toBuffer();

  return result;
}

async function frameCircle(sharp, imgBuffer) {
  const imgSize = 480;
  const ringW = 12;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Circle mask
  const circleMask = Buffer.from(
    `<svg width="${imgSize}" height="${imgSize}">
      <circle cx="${imgSize/2}" cy="${imgSize/2}" r="${imgSize/2}" fill="white"/>
    </svg>`
  );

  const circleImg = await sharp(resized)
    .composite([{
      input: circleMask,
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  // Ring border
  const ring = Buffer.from(
    `<svg width="${imgSize}" height="${imgSize}">
      <circle cx="${imgSize/2}" cy="${imgSize/2}" r="${(imgSize/2) - (ringW/2)}" fill="none" stroke="white" stroke-width="${ringW}"/>
    </svg>`
  );

  const result = await sharp(circleImg)
    .composite([{
      input: ring,
      blend: "over",
    }])
    .ensureAlpha()
    .png()
    .toBuffer();

  return result;
}

async function frameStickerCut(sharp, imgBuffer) {
  const imgSize = 420;
  const borderW = 40;

  const resized = await sharp(imgBuffer)
    .resize(imgSize, imgSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const totalSize = imgSize + borderW * 2;

  // White thick border with slightly rounded corners
  const result = await sharp({
    create: {
      width: totalSize,
      height: totalSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: resized,
      left: borderW,
      top: borderW,
    }])
    .composite([{
      input: Buffer.from(
        `<svg width="${totalSize}" height="${totalSize}">
          <rect x="2" y="2" width="${totalSize - 4}" height="${totalSize - 4}" rx="30" ry="30" fill="none" stroke="white" stroke-width="4"/>
        </svg>`
      ),
      blend: "over",
    }])
    .png()
    .toBuffer();

  return result;
}

// ─── Convert to sticker ───
async function toSticker(sharp, buffer) {
  const webpBuffer = await sharp(buffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer();

  return webpBuffer;
}

// ─── Process frame ───
async function processFrame(frameType, imgBuffer, extra) {
  const sharp = await getSharp();

  switch (frameType) {
    case "polaroid": return framePolaroid(sharp, imgBuffer);
    case "neon": {
      const colorName = extra || NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)].name;
      const color = NEON_COLORS.find(c => c.name === colorName) || NEON_COLORS[0];
      return { buffer: await frameNeon(sharp, imgBuffer, color.rgb), meta: color.name };
    }
    case "rounded": return frameRounded(sharp, imgBuffer);
    case "vintage": return frameVintage(sharp, imgBuffer);
    case "film": return frameFilm(sharp, imgBuffer);
    case "shadow": return frameShadow(sharp, imgBuffer);
    case "blur": return frameBlur(sharp, imgBuffer);
    case "gradient": return frameGradient(sharp, imgBuffer);
    case "minimal": return frameMinimal(sharp, imgBuffer);
    case "heart": return frameHeart(sharp, imgBuffer);
    case "circle": return frameCircle(sharp, imgBuffer);
    case "sticker": return frameStickerCut(sharp, imgBuffer);
    default: return framePolaroid(sharp, imgBuffer);
  }
}

// ─── Plugin ───
export default {
  config: {
  name: "stikerframe",
  alias: ["Polaroid", "stikerframe"],
  category: "sticker",
  desc: "Stiker Frame - Tambah bingkai estetik ke foto lalu jadi stiker. 12 jenis bingkai: polaroid, neon, rounded, vintage, film, shadow, blur, gradient, minimal, heart, circle, sticker cut.",
  usage: ".stikerframe [jenis] - Kirim/reply foto dengan caption\n.stikerframe list - Lihat semua jenis bingkai\n.stikerframe neon [warna] - Neon dengan warna pilihan\n.stikerframe random - Bingkai acak",
  example: ".stikerframe polaroid\n.stikerframe neon pink\n.stikerframe random\n.stikerframe vintage",
  wait: "🕐",
  error: "❌",

  },
  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];
    const raw = m.text?.trim() || "";
    const packname = botConfig?.sticker?.packname || botConfig?.bot?.name || "Rara-AI";
    const author = botConfig?.sticker?.author || "Bot";

    // ─── Check for image ───
    const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
    const hasQuotedImage = m.quoted && m.quoted.type === "imageMessage";

    // ─── Parse frame type from text ───
    const frameMatch = raw.toLowerCase().match(
      new RegExp(`^${prefix}(stikerframe|sf|frame|bingkai|stikerbingkai)\\s*(\\w+)?\\s*(\\w+)?`, "i")
    );

    const frameType = frameMatch?.[2]?.toLowerCase() || "";
    const extraParam = frameMatch?.[3]?.toLowerCase() || "";

    // ─── List frames ───
    if (frameType === "list" || (!isImage && !hasQuotedImage && frameMatch)) {
      const lines = [
        `Stiker Frame - Pilihan Bingkai`,
        ``,
      ];
      let i = 1;
      for (const [key, val] of Object.entries(FRAMES)) {
        lines.push(`${i}. *${val.name}* (.stikerframe ${key})`);
        lines.push(`${val.desc}`);
        lines.push(``);
        i++;
      }
      lines.push(
        `Cara pakai:`,
        `Kirim/reply foto + caption *${prefix}stikerframe [jenis]*`,
        `Contoh: *${prefix}stikerframe polaroid*`,
        ``,
        `Neon warna: pink, blue, green, orange, purple, cyan, red, yellow`,
        `Contoh: *${prefix}stikerframe neon pink*`,
        ``,
        `*${prefix}stikerframe random* = bingkai acak`,
      );

      await m.reply(raraWrap("StikerFrame", lines.join("\n")));
      return { handled: true };
    }

    // ─── Need image ───
    if (!isImage && !hasQuotedImage) {
      await m.reply(raraWrap("StikerFrame", [
        `Kirim atau reply foto dengan caption:`,
        `*${prefix}stikerframe [jenis]*`,
        ``,
        `Ketik *${prefix}stikerframe list* untuk lihat semua bingkai.`,
      ].join("\n")));
      return { handled: true };
    }
    // ─── Download image ───
    let imgBuffer;
    try {
    await m.react("🕒");
      if (hasQuotedImage) {
        imgBuffer = await m.quoted.download();
      } else {
        imgBuffer = await m.download();
      }
    } catch (e) {
      await m.reply(raraWrap("StikerFrame", [
        `Gagal download foto nih.`,
        `Coba kirim ulang ya.`,
      ].join("\n")));
      return { handled: true };
    }

    if (!imgBuffer || imgBuffer.length === 0) {
      await m.reply(raraWrap("StikerFrame", [
        `Foto kosong nih, coba ulangi.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Determine frame type ───
    let useFrame = frameType || "polaroid";
    let extra = extraParam;

    // Random frame
    if (useFrame === "random") {
      const keys = Object.keys(FRAMES);
      useFrame = keys[Math.floor(Math.random() * keys.length)];
      extra = "";
    }

    // Validate frame
    if (!FRAMES[useFrame]) {
      await m.reply(raraWrap("StikerFrame", [
        `Jenis bingkai tidak ditemukan: *${useFrame}*`,
        ``,
        `Ketik *${prefix}stikerframe list* untuk lihat semua pilihan.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Process ───
    try {
      const result = await processFrame(useFrame, imgBuffer, extra);
      let framedBuffer, metaInfo = "";

      if (result && result.buffer) {
        framedBuffer = result.buffer;
        metaInfo = result.meta ? ` (${result.meta})` : "";
      } else {
        framedBuffer = result;
      }

      const sticker = await toSticker(await getSharp(), framedBuffer);

      await sock.sendMessage(groupId, {
        sticker,
        isAiSticker: true,
        isAvatar: true,
        contextInfo: { isForwarded: false, forwardingScore: 0, premium: 1 },
      }, { quoted: m });
        await m.react("🐣");
        await m.reply(raraBerhasil("Polaroid"));
    } catch (e) {
      console.log("[StikerFrame] Error:", e.message);
      await m.reply(raraWrap("StikerFrame", [
        `Gagal memproses bingkai: ${e.message}`,
        `Coba jenis bingkai lain ya.`,
      ].join("\n")));
    }

    return { handled: true };
  },
};
