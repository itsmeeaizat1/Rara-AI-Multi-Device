// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import config from "../../config.js";

function resolveAsset(key, fallbackPath) {
  const mapped = config.assets?.[key];
  const candidates = [mapped, fallbackPath].filter(Boolean);
  for (const p of candidates) {
    if (path.isAbsolute(p) && fs.existsSync(p)) return p;
    if (!path.isAbsolute(p)) {
      const abs = path.resolve(process.cwd(), p);
      if (fs.existsSync(abs)) return abs;
    }
  }
  return null;
}

function getWelcomeThumbnail() {
  return resolveAsset("nova-welcome", "./assets/image/welcome/wellcome.jpg");
}

function getGoodbyeThumbnail() {
  return resolveAsset("nova-goodbye", "./assets/image/welcome/left.jpg");
}

function getGroupThumbnail() {
  return resolveAsset("group-thumb", "./assets/image/group/group-thumb.jpg");
}

async function prepareThumbnail(sock, preferredPath) {
  const imagePath = preferredPath || getGroupThumbnail();
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  try {
    const { prepareWAMessageMedia } = await import("ourin");
    const buffer = fs.readFileSync(imagePath);
    const media = await prepareWAMessageMedia(
      { image: buffer },
      { upload: sock.waUploadToServer }
    );
    return media.imageMessage || null;
  } catch {
    return null;
  }
}

export {
  getWelcomeThumbnail,
  getGoodbyeThumbnail,
  getGroupThumbnail,
  prepareThumbnail,
};
