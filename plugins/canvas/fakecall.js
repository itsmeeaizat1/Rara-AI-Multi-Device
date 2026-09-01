// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// fakecall — WhatsApp fake call screen (local canvas, no API)
import { novaReply } from "../../src/lib/nova-menu-style.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";

const pluginConfig = {
  name: "fakecall",
  alias: ["fakecall", "fakecallwa"],
  category: "canvas",
  description: "Membuat gambar fake call WhatsApp (lokal canvas)",
  usage: ".fakecall <nama> | <durasi>",
  example: ".fakecall Aizat | 19.00",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function generateFakeCall(nama, durasi, avatarUrl) {
  const W = 1080;
  const H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient (WhatsApp dark call screen)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0b141a");
  grad.addColorStop(0.5, "#111b27");
  grad.addColorStop(1, "#0b141a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top bar
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, W, 120);

  // "WhatsApp Call" label
  try {
    const fontPath = path.join(process.cwd(), "assets/fonts/Epep.ttf");
    GlobalFonts.registerFromPath(fontPath, "CustomFont");
  } catch (e) {}

  ctx.font = "400 32px sans-serif";
  ctx.fillStyle = "#8696a0";
  ctx.textAlign = "center";
  ctx.fillText("WhatsApp Call", W / 2, 80);

  // Avatar (circular)
  const avatarSize = 400;
  const avatarY = 400;

  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, (W - avatarSize) / 2, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch (e) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#25333c";
    ctx.fill();
    ctx.restore();
  }

  // Avatar ring
  ctx.beginPath();
  ctx.arc(W / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#8696a0";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Name
  ctx.font = "600 64px sans-serif";
  ctx.fillStyle = "#e9edef";
  ctx.textAlign = "center";
  ctx.fillText(nama || "Unknown", W / 2, avatarY + avatarSize + 100);

  // Duration
  ctx.font = "400 44px sans-serif";
  ctx.fillStyle = "#8696a0";
  ctx.fillText(durasi || "00:00", W / 2, avatarY + avatarSize + 180);

  // Call buttons at bottom
  const btnY = H - 350;
  const btnRadius = 75;
  const spacing = 250;

  // Decline (red, left)
  ctx.beginPath();
  ctx.arc(W / 2 - spacing, btnY, btnRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ea0038";
  ctx.fill();

  // Speaker (center, dark)
  ctx.beginPath();
  ctx.arc(W / 2, btnY, btnRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#25333c";
  ctx.fill();

  // Accept (green, right)
  ctx.beginPath();
  ctx.arc(W / 2 + spacing, btnY, btnRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#00a884";
  ctx.fill();

  return await canvas.png;
}

async function handler(m, { sock }) {
  const text = m.text;

  if (!text || !text.includes("|")) {
    const msg = novaReply({
      title: "Fake Call",
      status: "Format: nama | durasi",
      content: "|\n| Contoh: " + m.prefix + "fakecall Marin | 19.00",
    });
    return await m.reply(msg);
  }

  const parts = text.split("|").map(function(s) { return s.trim(); });
  var nama = parts[0];
  var durasi = parts[1] || "00:00";

  if (!nama) {
    const msg = novaReply({ title: "Fake Call", status: "Nama tidak boleh kosong" });
    return await m.reply(msg);
  }

  try {
    await m.react("\u{1F550}");

    var avatar = "https://files.catbox.moe/nwvkbt.png";

    if (m.isImage) {
      try { avatar = await m.download(); } catch (e) {}
    } else if (m.quoted && m.quoted.isImage) {
      try { avatar = await m.quoted.download(); } catch (e) {}
    } else {
      try { avatar = await sock.profilePictureUrl(m.sender, "image"); } catch (e) {}
    }

    const pngBuffer = await generateFakeCall(nama, durasi, avatar);
    await sock.sendMedia(m.chat, pngBuffer, null, m, { type: "image" });
    await m.react("\u{1F423}");
  } catch (err) {
    console.error("[fakecall] Error:", err.message);
    await m.react("\u274C");
    const msg = novaReply({
      title: "Fake Call",
      status: "Gagal generate: " + err.message,
    });
    return await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
