// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .imgmotion — motion image (foto bergerak) WA native (port HIROBOT imgmotion.js)
// 2 langkah: .imgmotion + gambar → kirim video (caption "2") → jadi motion image.
import { prepareWAMessageMedia, generateWAMessageFromContent } from "nova";
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "imgmotion",
  alias: ["motionimage", "photomotion"],
  category: "tools",
  description: "Gabung foto + video jadi motion image (foto bergerak) native WhatsApp",
  usage: ".imgmotion (kirim/reply foto) lalu kirim video caption 2 | .imgmotion <imgUrl> <videoUrl>",
  example: ".imgmotion <url_foto> <url_video>",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const pending = new Map();
const TIMEOUT_MS = 120000;

const isImageMsg = (msg) =>
  msg?.mtype === "imageMessage" || msg?.message?.imageMessage != null || msg?.msg?.mimetype?.includes("image");
const isVideoMsg = (msg) =>
  msg?.mtype === "videoMessage" || msg?.message?.videoMessage != null || msg?.msg?.mimetype?.includes("video");

async function sendMotion(sock, m, img, video) {
  const imageMedia = await prepareWAMessageMedia({ image: img }, { upload: sock.waUploadToServer });
  const videoMedia = await prepareWAMessageMedia({ video }, { upload: sock.waUploadToServer });
  const msg = generateWAMessageFromContent(m.chat, {
    imageMessage: {
      ...imageMedia.imageMessage,
      caption: "",
      contextInfo: { pairedMediaType: 5, statusSourceType: 0 },
    },
  }, {});
  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  await sock.relayMessage(m.chat, {
    videoMessage: {
      ...videoMedia.videoMessage,
      caption: "",
      contextInfo: { pairedMediaType: 6, statusSourceType: 0 },
    },
    messageContextInfo: {
      messageAssociation: { associationType: 12, parentMessageKey: msg.key },
    },
  }, {});
}

function clearPending(sender) {
  const st = pending.get(sender);
  if (st?.timeout) clearTimeout(st.timeout);
  pending.delete(sender);
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const args = (m.text || "").replace(new RegExp("^" + prefix + "imgmotion\\s*", "i"), "").trim().split(/\s+/).filter(Boolean);

    if (args.length >= 2 && /^https?:\/\//i.test(args[0]) && /^https?:\/\//i.test(args[1])) {
      await m.react("🛠️");
      const img = Buffer.from(await (await fetch(args[0])).arrayBuffer());
      const video = Buffer.from(await (await fetch(args[1])).arrayBuffer());
      await sendMotion(sock, m, img, video);
      await m.react("⚡");
      return { handled: true };
    }

    let img = null;
    let video = null;
    if (isImageMsg(m)) img = await m.download?.();
    else if (isImageMsg(m.quoted)) img = await m.quoted.download?.();

    if (img) {
      clearPending(m.sender);
      pending.set(m.sender, {
        img,
        chat: m.chat,
        timeout: setTimeout(() => pending.delete(m.sender), TIMEOUT_MS),
      });
      await m.react("⚡");
      await m.reply("Foto diterima! Sekarang kirim *video* (caption \"2\") buat jadiin motion image — max 2 menit.");
      return { handled: true };
    }

    await m.react("🐣");
    await m.reply(novaGuide(
      "imgmotion",
      "Gabung foto + video jadi motion image native WhatsApp (foto yang gerak).",
      prefix + "imgmotion <url_foto> <url_video> — atau reply foto, lalu kirim video caption 2",
      "Mirip live photo iPhone. Kualitas video makin pendek makin ringan."
    ));
  } catch (error) {
    console.error("[imgmotion]:", error.message);
    await m.react("❌");
    await m.reply(novaError("ImgMotion", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

// step 2: user kirim video setelah foto
export async function answerHandler(m, { sock }) {
  const st = pending.get(m.sender);
  if (!st) return false;
  let video = null;
  if (isVideoMsg(m)) video = await m.download?.();
  else if (isVideoMsg(m.quoted)) video = await m.quoted.download?.();
  if (!video) return false;
  if (st.chat !== m.chat) return false;
  clearPending(m.sender);
  try {
    await m.react("🛠️");
    await sendMotion(sock, m, st.img, video);
    await m.react("⚡");
  } catch (e) {
    console.error("[imgmotion]:", e.message);
    await m.react("❌");
    await m.reply(novaError("ImgMotion", "Gagal: " + String(e.message).slice(0, 120)));
  }
  return true;
}

export { pluginConfig as config, handler }
